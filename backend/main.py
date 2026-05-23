from fastapi import FastAPI, Depends, HTTPException, status, Query, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse, PlainTextResponse, Response
from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas, crud, auth, database
import shutil
import os
import uuid
import logging
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

logger = logging.getLogger("marathonhub")


def _client_ip(request: Request) -> str:
    """Best-effort real client IP behind a trusted reverse proxy.

    Coolify/Traefik forwards the original IP in X-Forwarded-For. Without
    this, every request looks like it's coming from the proxy and IP
    hashing collapses all visitors into a single bucket.
    """
    xff = request.headers.get("x-forwarded-for")
    if xff:
        # First hop is the original client. Strip whitespace, ignore empties.
        first = xff.split(",")[0].strip()
        if first:
            return first
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


limiter = Limiter(key_func=_client_ip)

models.Base.metadata.create_all(bind=database.engine)

# Resolve paths early so the rest of the module (including the startup
# backup) can rely on them.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Run daily backup on startup (best-effort — never block app boot)
try:
    import sys
    sys.path.append(os.path.join(BASE_DIR, ".."))
    from backup_db import create_backup
    create_backup()
except Exception as e:
    logger.warning("Startup backup skipped: %s", e)

def check_and_migrate_db():
    try:
        from sqlalchemy import text, inspect
        with database.engine.connect() as conn:
            # 1. Check for missing tables (like page_views)
            inspector = inspect(database.engine)
            existing_tables = inspector.get_table_names()
            
            if "page_views" not in existing_tables:
                print("Migrating database: Creating page_views table...")
                models.Base.metadata.create_all(bind=database.engine)
                print("Table creation successful.")

            # 2. Check for missing columns (is_pinned, event_id)
            # Use inspector instead of PRAGMA for better portability
            
            # Assignments table
            assign_cols = [c['name'] for c in inspector.get_columns("assignments")]
            if "is_pinned" not in assign_cols:
                print("Migrating database: Adding is_pinned column...")
                conn.execute(text("ALTER TABLE assignments ADD COLUMN is_pinned BOOLEAN DEFAULT 0 NOT NULL"))
                conn.commit()

            # Face-search columns — lazy resolver caches Photohawk gallery
            # metadata so we don't re-fetch for every search request.
            for col_name, col_ddl in (
                ("engine_guid", "ALTER TABLE assignments ADD COLUMN engine_guid VARCHAR"),
                ("tenant_guid", "ALTER TABLE assignments ADD COLUMN tenant_guid VARCHAR"),
                ("cover_guid",  "ALTER TABLE assignments ADD COLUMN cover_guid VARCHAR"),
                ("resolved_at", "ALTER TABLE assignments ADD COLUMN resolved_at DATETIME"),
            ):
                if col_name not in assign_cols:
                    print(f"Migrating database: Adding {col_name} column to assignments...")
                    conn.execute(text(col_ddl))
                    conn.commit()

            # Index on engine_guid — used when reverse-mapping a Photohawk
            # search hit (engine_guid → assignment) for the face-search
            # results UI.
            existing_assign_idx = {idx['name'] for idx in inspector.get_indexes("assignments")}
            if "ix_assignments_engine_guid" not in existing_assign_idx:
                print("Migrating database: Adding index on assignments(engine_guid)...")
                conn.execute(text(
                    "CREATE INDEX IF NOT EXISTS ix_assignments_engine_guid "
                    "ON assignments (engine_guid)"
                ))
                conn.commit()

            # PageViews table (migration for event_id)
            if "page_views" in existing_tables:
                pv_cols = [c['name'] for c in inspector.get_columns("page_views")]
                if "event_id" not in pv_cols:
                    print("Migrating database: Adding event_id column to page_views...")
                    conn.execute(text("ALTER TABLE page_views ADD COLUMN event_id INTEGER NULL"))
                    conn.execute(text("CREATE INDEX ix_page_views_event_id ON page_views (event_id)"))
                    conn.commit()
                    print("Migration successful.")

            # Composite index for analytics hot path:
            # SELECT ... WHERE entity_type = ? AND entity_id = ?
            # Already covered by two single-column indexes, but a combined
            # index lets SQLite skip a second filter pass — meaningful at
            # ~70k rows and growing.
            existing_indexes = {idx['name'] for idx in inspector.get_indexes("page_views")}
            if "ix_pv_type_entity" not in existing_indexes:
                print("Migrating database: Adding composite index on page_views(entity_type, entity_id)...")
                conn.execute(text(
                    "CREATE INDEX IF NOT EXISTS ix_pv_type_entity "
                    "ON page_views (entity_type, entity_id)"
                ))
                conn.commit()
                    
    except Exception as e:
        print(f"Migration check failed: {e}")

check_and_migrate_db()

app = FastAPI(title="MarathonHub API", version="0.1.0")

# Rate limiter — applied per-route via @limiter.limit(...)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# -----------------------------------------------------------------------------
# Health check — for uptime monitors. Lightweight: just confirm DB pings.
# Avoids hitting `/` (full SPA shell, ~80KB) every minute.
# -----------------------------------------------------------------------------
@app.get("/api/health", include_in_schema=False)
def health_check():
    db_ok = False
    try:
        from sqlalchemy import text as _sql_text
        with database.engine.connect() as conn:
            conn.execute(_sql_text("SELECT 1"))
        db_ok = True
    except Exception as e:
        logger.warning("health: db check failed: %s", e)
    status_code = 200 if db_ok else 503
    return Response(
        content=f'{{"ok":{str(db_ok).lower()},"db":"{"ok" if db_ok else "fail"}"}}',
        media_type="application/json",
        status_code=status_code,
    )

# Mount 'uploads' directory to serve images
# (BASE_DIR resolved at top of file)
# Look for storage in the same directory as main.py (Docker style)
UPLOAD_DIR = os.path.join(BASE_DIR, "storage", "uploads")

# Fallback for local dev if storage is one level up
if not os.path.exists(os.path.join(BASE_DIR, "storage")) and os.path.exists(os.path.join(BASE_DIR, "..", "storage")):
    UPLOAD_DIR = os.path.join(BASE_DIR, "..", "storage", "uploads")

if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# CORS setup
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://localhost",
]

if allowed_origins_env:
    extra = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
    origins.extend(extra)

# Reject the wildcard when credentials are allowed — browsers will refuse it
# anyway and it silently breaks auth. Force the operator to list origins.
if "*" in origins:
    raise RuntimeError(
        "ALLOWED_ORIGINS cannot contain '*' while allow_credentials=True. "
        "List explicit origins instead."
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------------------------------------------------------
# Security headers + asset caching
# -----------------------------------------------------------------------------
# Applied to every response. HSTS forces HTTPS for 1 year, X-Frame-Options
# blocks clickjacking, X-Content-Type-Options stops MIME sniffing, and
# Referrer-Policy + Permissions-Policy tighten browser behaviour.
#
# Cache-Control:
#   - /assets/*  : hashed bundles → cache forever (immutable)
#   - HTML shell : no-cache so users always pick up the latest SPA build
@app.middleware("http")
async def security_and_cache_headers(request: Request, call_next):
    response = await call_next(request)

    # Security headers — safe defaults for a public read-mostly SPA.
    response.headers.setdefault(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains",
    )
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault(
        "Permissions-Policy",
        "geolocation=(), microphone=(), camera=(), payment=()",
    )

    # Content-Security-Policy — restrict where assets/scripts can come from.
    # Tight defaults for an SPA that only loads its own bundles + a couple
    # of analytics/social images. Adjust if a third-party widget is added.
    #   - script-src: self only (no inline scripts; JSON-LD <script> tags
    #     are application/ld+json which CSP exempts)
    #   - style-src: 'unsafe-inline' for Tailwind's runtime + inline style
    #     attributes from framer-motion. Move to nonces if hardening later.
    #   - img-src: self, data: (logos), blob: (canvas exports), https:
    #     (photographer logos / external galleries hotlinked in cards)
    #   - connect-src: self only — API + tracking are same-origin
    #   - frame-ancestors none — defense-in-depth on top of X-Frame-Options
    response.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob: https:; "
        "font-src 'self' data:; "
        "connect-src 'self'; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self'",
    )

    # Cache-Control by path. StaticFiles doesn't set this by default.
    path = request.url.path
    if path.startswith("/assets/"):
        # Vite emits hashed filenames (index-DSNDAQrY.js) → safe to cache forever.
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    elif path in ("/og-image.jpg", "/ohmaishoot-logo.png", "/ohmai.png", "/favicon.ico"):
        # Static brand assets — cache for a day, allow revalidation.
        response.headers["Cache-Control"] = "public, max-age=86400"
    elif path == "/" or path.endswith(".html") or (
        "." not in path.split("/")[-1] and not path.startswith("/api")
    ):
        # SPA shell — never cache HTML so new deploys are picked up immediately.
        response.headers["Cache-Control"] = "no-cache"

    return response

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Public Endpoints ---

# --- Upload constraints ---
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(5 * 1024 * 1024)))  # 5 MB
ALLOWED_UPLOAD_MIME = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


@app.post("/api/upload")
async def upload_image(
    file: UploadFile = File(...),
    current_user: models.Admin = Depends(auth.get_current_user),
):
    """Authenticated image upload. Validates MIME, caps size, derives the
    extension from the validated MIME type (never trusts the client filename).
    """
    # 1. MIME allowlist — reject anything that isn't an image we want to serve.
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_UPLOAD_MIME:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {content_type or 'unknown'}",
        )
    safe_extension = ALLOWED_UPLOAD_MIME[content_type]

    # 2. Stream to disk with a hard size cap. Avoid loading the whole file
    #    into memory and avoid trusting Content-Length headers.
    unique_filename = f"{uuid.uuid4().hex}{safe_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    bytes_written = 0
    chunk_size = 64 * 1024
    try:
        with open(file_path, "wb") as buffer:
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                bytes_written += len(chunk)
                if bytes_written > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds {MAX_UPLOAD_BYTES} bytes",
                    )
                buffer.write(chunk)
    except HTTPException:
        # Clean up partial file before re-raising
        try:
            os.remove(file_path)
        except OSError:
            pass
        raise
    except Exception:
        try:
            os.remove(file_path)
        except OSError:
            pass
        raise

    return {"url": f"/api/uploads/{unique_filename}"}

@app.get("/api/events", response_model=List[schemas.Event])
def read_events(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    search: Optional[str] = None,
    month: Optional[str] = None,
    location: Optional[str] = None,
    is_highlight: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """List events with SQL-side filtering + pagination.

    Status filter is computed in SQL using today's UTC midnight boundaries
    (matching Event.computed_status semantics), instead of loading every
    row into memory and filtering in Python. This keeps the endpoint flat
    as the events table grows.
    """
    from datetime import datetime, timedelta

    query = db.query(models.Event)

    if search:
        query = query.filter(models.Event.name.contains(search))

    if location:
        query = query.filter(models.Event.location.contains(location))

    if month:
        # month is "YYYY-MM"
        query = query.filter(models.Event.date.astype(str).startswith(month))

    if is_highlight is not None:
        query = query.filter(models.Event.is_highlight == is_highlight)

    # Push status filter into SQL — mirror Event.computed_status by comparing
    # the date column against today's UTC midnight.
    if status and status != 'All':
        today_start = datetime.combine(datetime.utcnow().date(), datetime.min.time())
        tomorrow_start = today_start + timedelta(days=1)
        if status == 'Upcoming':
            query = query.filter(models.Event.date >= tomorrow_start)
        elif status == 'Recent':
            query = query.filter(
                models.Event.date >= today_start,
                models.Event.date < tomorrow_start,
            )
        elif status == 'Past':
            query = query.filter(models.Event.date < today_start)
        # any other status string falls through with no extra filter

    # Sort: most-recent-first for Past events (so "Recent Galleries"
    # shows last weekend's race, not 2024's). Everything else stays
    # ASC so "Upcoming" lists the next race first.
    order_clause = (
        models.Event.date.desc()
        if status == 'Past'
        else models.Event.date.asc()
    )

    return (
        query.order_by(order_clause)
        .offset(skip)
        .limit(limit if limit else None)
        .all()
    )

@app.get("/api/events/{event_id}", response_model=schemas.EventPublic) # utilizing EventPublic to include assignments
def read_event(event_id: int, db: Session = Depends(get_db)):
    db_event = crud.get_event(db, event_id=event_id)
    if db_event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return db_event

@app.get("/api/photographers", response_model=List[schemas.Photographer])
def read_photographers(skip: int = 0, limit: int = 100, search: Optional[str] = None, include_hidden: bool = False, db: Session = Depends(get_db)):
    return crud.get_photographers(db, skip=skip, limit=limit, search=search, include_hidden=include_hidden)

@app.get("/api/photographers/{photographer_id}", response_model=schemas.Photographer)
def read_photographer(photographer_id: int, db: Session = Depends(get_db)):
    db_photographer = crud.get_photographer(db, photographer_id=photographer_id)
    if db_photographer is None:
        raise HTTPException(status_code=404, detail="Photographer not found")
    return db_photographer

# --- Admin Auth ---

@app.post("/api/admin/login", response_model=schemas.Token)
@limiter.limit(os.getenv("LOGIN_RATE_LIMIT", "5/minute"))
def login_for_access_token(request: Request, form_data: schemas.AdminLogin, db: Session = Depends(get_db)):
    # Note: OAuth2PasswordRequestForm expects username/password fields. 
    # But UI might send JSON. For simplicity we used a custom AdminLogin schema.
    # If we use OAuth2PasswordRequestForm (standard FastAPI auth), we need form data.
    # Let's support the JSON body for simplicity in React.
    
    user = crud.get_admin_by_username(db, username=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

# --- Admin Endpoints (Protected) ---

@app.get("/api/admin/me", response_model=schemas.AdminLogin) # Just return username
def read_users_me(current_user: models.Admin = Depends(auth.get_current_user)):
    return {"username": current_user.username, "password": ""} # Don't return hash

# Admin Events
@app.post("/api/admin/events", response_model=schemas.Event)
def create_event(event: schemas.EventCreate, db: Session = Depends(get_db), current_user: models.Admin = Depends(auth.get_current_user)):
    return crud.create_event(db=db, event=event)

@app.put("/api/admin/events/{event_id}", response_model=schemas.Event)
def update_event(event_id: int, event: schemas.EventUpdate, db: Session = Depends(get_db), current_user: models.Admin = Depends(auth.get_current_user)):
    db_event = crud.update_event(db, event_id, event)
    if db_event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return db_event

@app.delete("/api/admin/events/{event_id}", response_model=schemas.Event)
def delete_event(event_id: int, db: Session = Depends(get_db), current_user: models.Admin = Depends(auth.get_current_user)):
    db_event = crud.delete_event(db, event_id)
    if db_event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return db_event

# Admin Photographers
@app.post("/api/admin/photographers", response_model=schemas.Photographer)
def create_photographer(photographer: schemas.PhotographerCreate, db: Session = Depends(get_db), current_user: models.Admin = Depends(auth.get_current_user)):
    return crud.create_photographer(db=db, photographer=photographer)

@app.put("/api/admin/photographers/{photographer_id}", response_model=schemas.Photographer)
def update_photographer(photographer_id: int, photographer: schemas.PhotographerUpdate, db: Session = Depends(get_db), current_user: models.Admin = Depends(auth.get_current_user)):
    db_photographer = crud.update_photographer(db, photographer_id, photographer)
    if db_photographer is None:
        raise HTTPException(status_code=404, detail="Photographer not found")
    return db_photographer

@app.delete("/api/admin/photographers/{photographer_id}", response_model=schemas.Photographer)
def delete_photographer(photographer_id: int, db: Session = Depends(get_db), current_user: models.Admin = Depends(auth.get_current_user)):
    db_photographer = crud.delete_photographer(db, photographer_id)
    if db_photographer is None:
        raise HTTPException(status_code=404, detail="Photographer not found")
    return db_photographer

# Admin Assignments
@app.post("/api/admin/assignments", response_model=schemas.Assignment)
def create_assignment(assignment: schemas.AssignmentCreate, db: Session = Depends(get_db), current_user: models.Admin = Depends(auth.get_current_user)):
    return crud.create_assignment(db, assignment)

@app.put("/api/admin/assignments/{assignment_id}", response_model=schemas.Assignment)
def update_assignment(assignment_id: int, assignment: schemas.AssignmentUpdate, db: Session = Depends(get_db), current_user: models.Admin = Depends(auth.get_current_user)):
    db_assignment = crud.update_assignment(db, assignment_id, assignment)
    if db_assignment is None:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return db_assignment

@app.delete("/api/admin/assignments/{assignment_id}", response_model=schemas.Assignment)
def delete_assignment(assignment_id: int, db: Session = Depends(get_db), current_user: models.Admin = Depends(auth.get_current_user)):
    db_assignment = crud.delete_assignment(db, assignment_id)
    if db_assignment is None:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return db_assignment

@app.patch("/api/admin/assignments/{assignment_id}/toggle-pin", response_model=schemas.Assignment)
def toggle_pin_assignment(assignment_id: int, db: Session = Depends(get_db), current_user: models.Admin = Depends(auth.get_current_user)):
    db_assignment = crud.toggle_assignment_pin(db, assignment_id)
    if db_assignment is None:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return db_assignment

# --- Face Search (Photohawk proxy) ---------------------------------------
#
# Public endpoint: runner uploads a selfie + event_id, we fan out to every
# photographer assigned to that event, return aggregated matches grouped
# by photographer. Photohawk's searchByImage is the actual ML engine — we
# just resolve gallery URLs to engine_guids (lazily, cached on Assignment)
# and proxy the call.
#
# Why proxy (vs frontend calling Photohawk directly):
#   * Photohawk requires per-tenant Origin headers — browsers can't fake
#     them. Server-side fan-out is the only way to hit cross-tenant engines.
#   * Lets us rate-limit, log analytics, and hide gallery internals.

@app.post("/api/events/{event_id}/face-search")
@limiter.limit(os.getenv("FACE_SEARCH_RATE_LIMIT", "10/minute"))
async def face_search(
    event_id: int,
    request: Request,
    selfie: UploadFile = File(...),
    threshold: float = Query(0.85, ge=0.0, le=1.0),
    db: Session = Depends(get_db),
):
    from datetime import datetime as _dt
    from services import photohawk

    event = crud.get_event(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    assignments = (
        db.query(models.Assignment)
        .filter(models.Assignment.event_id == event_id)
        .all()
    )
    if not assignments:
        return {
            "event_id": event_id,
            "total_matches": 0,
            "results": [],
            "errors": ["No photographers assigned to this event yet."],
        }

    # Read selfie once (size-bounded — Photohawk caps at ~10MB, browsers
    # rarely upload larger; we cap at 12MB to give a small buffer).
    raw = await selfie.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty selfie upload")
    if len(raw) > 12 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Selfie too large (max 12MB)")
    selfie_data_url = photohawk._selfie_to_data_url(
        raw, content_type=selfie.content_type or "image/jpeg",
    )

    # Lazy-resolve any assignment that doesn't have engine_guid yet.
    # CRITICAL: this used to be a serial loop. With 30+ photographers per
    # event (and many on non-Photohawk platforms that we have to fail-fast
    # on), serial resolve guaranteed Traefik 60s timeout. Two fixes:
    #   1. Pre-filter to URLs that LOOK like Photohawk galleries (host
    #      pattern + /galleries/ path) — drops geosnapshot, harimau.run,
    #      house24a etc. without even fetching them.
    #   2. Parallel-resolve the rest with a ThreadPoolExecutor so total
    #      wall-clock = max(per-gallery), not sum.
    # We swallow per-assignment resolver errors so one broken gallery URL
    # doesn't kill the whole search — those just won't contribute matches.
    from concurrent.futures import ThreadPoolExecutor as _TPE

    resolve_errors: list[str] = []
    to_resolve = [
        a for a in assignments
        if not a.engine_guid
        and a.gallery_url
        and photohawk.is_photohawk_gallery_url(a.gallery_url)
    ]

    if to_resolve:
        def _resolve_one(a):
            try:
                return a, photohawk.resolve_gallery(a.gallery_url), None
            except photohawk.PhotohawkError as exc:
                return a, None, str(exc)

        # 12 workers handles ~30-photographer events comfortably; each
        # call is now capped at 10s in photohawk.py so worst case ≈ 10s
        # total even if every gallery times out.
        with _TPE(max_workers=12) as ex:
            for a, meta, err in ex.map(_resolve_one, to_resolve):
                if err:
                    resolve_errors.append(
                        f"{a.photographer.name if a.photographer else 'photographer'}: {err}"
                    )
                    continue
                a.engine_guid = meta.engine_guid
                a.tenant_guid = meta.tenant_guid
                a.cover_guid = meta.cover_guid
                a.resolved_at = _dt.utcnow()
        db.commit()

    # Build fan-out list: only assignments with a resolved engine_guid.
    fanout = [
        (a.engine_guid, a.gallery_url)
        for a in assignments
        if a.engine_guid and a.gallery_url
    ]

    # Surface non-Photohawk galleries we recognise (currently just GeoSnapShot)
    # as info-only blocks: we can't run face-search against them, but we can
    # at least tell the runner how many photos are in there + the link.
    from services import geosnapshot as _gs
    extra_results = []
    extra_errors: list[str] = []
    geosnap_assignments = [
        a for a in assignments
        if a.gallery_url and _gs.is_geosnapshot_gallery_url(a.gallery_url)
    ]
    if geosnap_assignments:
        from concurrent.futures import ThreadPoolExecutor as _TPE2

        def _gs_count(a):
            try:
                return a, _gs.resolve_gallery_count(a.gallery_url), None
            except _gs.GeoSnapShotError as exc:
                return a, None, str(exc)

        with _TPE2(max_workers=4) as ex:
            for a, count, err in ex.map(_gs_count, geosnap_assignments):
                if err or count is None:
                    extra_errors.append(
                        f"{a.photographer.name if a.photographer else 'photographer'}: {err or 'unknown'}"
                    )
                    continue
                extra_results.append({
                    "assignment_id": a.id,
                    "photographer": {
                        "id": a.photographer.id if a.photographer else None,
                        "name": a.photographer.name if a.photographer else "Photographer",
                        "brand": a.photographer.brand if a.photographer else None,
                        "logo_url": a.photographer.logo_url if a.photographer else None,
                    },
                    "gallery_url": a.gallery_url,
                    "tenant_guid": None,
                    "cover_guid": None,
                    "match_count": 0,
                    "matches": [],
                    "error": None,
                    "platform": "geosnapshot",
                    "info_only": True,
                    "photo_count": count,
                })

    if not fanout and not extra_results:
        return {
            "event_id": event_id,
            "total_matches": 0,
            "results": extra_results,
            "errors": resolve_errors + extra_errors or ["No searchable galleries for this event."],
        }

    # Run the parallel search.
    raw_results = photohawk.fan_out_search(
        selfie_data_url, fanout, threshold=threshold,
    )

    # Reverse-map engine_guid → assignment so we can attach photographer
    # info to each result block.
    by_engine = {a.engine_guid: a for a in assignments if a.engine_guid}

    results = []
    total_matches = 0
    errors = list(resolve_errors)
    for engine_guid, block in raw_results.items():
        a = by_engine.get(engine_guid)
        if not a or not a.photographer:
            continue
        matches = block.get("matches") or []
        err = block.get("error")
        if err:
            errors.append(
                f"{a.photographer.name}: {err}"
            )
        # Trim match payload to what the UI actually needs (Photohawk
        # returns extra signed-URL fields per hit, which we hide — runner
        # has to click through to the gallery to view full photos).
        # Defensive: Photohawk's actual response shape varies — some
        # tenants return a list of dicts ({guid, matchScore}), others
        # return a flat list of GUID strings. Handle both.
        slim = []
        for m in matches:
            if isinstance(m, dict):
                guid = m.get("guid")
                score = m.get("matchScore") or m.get("score")
            elif isinstance(m, str):
                guid = m
                score = None
            else:
                continue
            if guid:
                slim.append({"guid": guid, "score": score})
        # Audit log: per-engine match summary (for tuning false-positives).
        # Score values logged so we can spot loose-threshold complaints
        # without keeping selfie bytes anywhere.
        if slim:
            scores = [s["score"] for s in slim if s.get("score") is not None]
            score_summary = (
                f"min={min(scores):.2f} max={max(scores):.2f} avg={sum(scores)/len(scores):.2f}"
                if scores else "scores=n/a"
            )
            logger.info(
                "face-search event=%s photographer=%s threshold=%.2f matches=%d %s",
                event_id,
                a.photographer.name if a.photographer else "?",
                threshold,
                len(slim),
                score_summary,
            )
        total_matches += len(slim)
        results.append({
            "assignment_id": a.id,
            "photographer": {
                "id": a.photographer.id,
                "name": a.photographer.name,
                "brand": a.photographer.brand,
                "logo_url": a.photographer.logo_url,
            },
            "gallery_url": a.gallery_url,
            "tenant_guid": a.tenant_guid,
            "cover_guid": a.cover_guid,
            "match_count": len(slim),
            "matches": slim[:50],  # cap per-photog to keep payload small
            "error": err,
        })

    # Sort: most matches first, then alphabetical for ties.
    results.sort(key=lambda r: (-r["match_count"], r["photographer"]["name"] or ""))

    return {
        "event_id": event_id,
        "total_matches": total_matches,
        "results": results,
        "errors": errors,
    }


# --- Analytics Endpoints ---

@app.post("/api/track", status_code=status.HTTP_201_CREATED)
@limiter.limit(os.getenv("TRACK_RATE_LIMIT", "60/minute"))
def track_page_view(
    view: schemas.PageViewCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    # Anonymize IP — read real client IP from X-Forwarded-For (Traefik/Coolify)
    # so analytics don't collapse every hit into the proxy IP.
    # Hash includes user_agent so unique-visitor counts don't collapse to 1
    # behind Malaysian telco CGNAT (Celcom/Maxis/Digi), where hundreds of
    # mobile users share a single egress IP. UA acts as disambiguator.
    import hashlib
    ip = _client_ip(request)
    user_agent = request.headers.get('user-agent', '')
    ip_hash = hashlib.sha256(f"{ip}|{user_agent}".encode()).hexdigest()[:16]

    crud.create_page_view(db, view, ip_hash, user_agent)
    return {"status": "ok"}

@app.get("/api/admin/analytics", response_model=schemas.AnalyticsSummary)
def get_analytics(
    db: Session = Depends(get_db),
    current_user: models.Admin = Depends(auth.get_current_user)
):
    return crud.get_analytics_summary(db)

@app.get("/api/admin/analytics/raw")
def get_analytics_raw(
    db: Session = Depends(get_db),
    current_user: models.Admin = Depends(auth.get_current_user)
):
    return crud.get_recent_views(db)

@app.get("/api/admin/analytics/event/{event_id}")
def get_event_analytics(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: models.Admin = Depends(auth.get_current_user)
):
    return crud.get_event_photographer_analytics(db, event_id)

# --- Debug Endpoint (removed) ---
# The previous /api/debug-db endpoint was public and leaked the full event
# list plus raw exception strings. It has been removed. Use the admin
# analytics endpoints (which require auth) for diagnostics instead.

# -----------------------------------------------------------------------------
# SEO — robots.txt, sitemap.xml, dynamic meta tags
# -----------------------------------------------------------------------------
SITE_URL = os.getenv("SITE_URL", "https://marathonhub.ohmaishoot.com").rstrip("/")


def _read_index_template():
    """Read index.html from static dir. Returns (html_str, ok)."""
    static_dir_local = os.path.join(BASE_DIR, "static")
    index_path = os.path.join(static_dir_local, "index.html")
    if not os.path.exists(index_path):
        return None, False
    try:
        with open(index_path, "r", encoding="utf-8") as f:
            return f.read(), True
    except Exception:
        return None, False


def _esc(text):
    """Escape text for safe HTML/XML insertion."""
    if text is None:
        return ""
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


def _inject_meta(html, title, description, url, image=None, json_ld=None, body_extra=None):
    """Replace meta tags in index.html template. Falls back gracefully if pattern missing."""
    import re
    if not html:
        return html

    title_e = _esc(title)
    desc_e = _esc(description)
    url_e = _esc(url)
    image_e = _esc(image) if image else f"{SITE_URL}/og-image.jpg"

    # Replace <title>
    html = re.sub(r"<title>[^<]*</title>", f"<title>{title_e}</title>", html, count=1)

    # Replace meta tags by name/property
    def _replace_meta(html, attr, key, value):
        pattern = rf'(<meta\s+{attr}="{re.escape(key)}"\s+content=")[^"]*(")'
        return re.sub(pattern, lambda m: f'{m.group(1)}{value}{m.group(2)}', html, count=1)

    html = _replace_meta(html, "name", "title", title_e)
    html = _replace_meta(html, "name", "description", desc_e)
    html = _replace_meta(html, "property", "og:url", url_e)
    html = _replace_meta(html, "property", "og:title", title_e)
    html = _replace_meta(html, "property", "og:description", desc_e)
    html = _replace_meta(html, "property", "og:image", image_e)
    html = _replace_meta(html, "property", "twitter:url", url_e)
    html = _replace_meta(html, "property", "twitter:title", title_e)
    html = _replace_meta(html, "property", "twitter:description", desc_e)
    html = _replace_meta(html, "property", "twitter:image", image_e)

    # Inject extra og:image dimension hints (helps Threads/FB/IG scraper)
    # These tell Meta scraper exact image specs so it doesn't skip the image
    extra_og = (
        f'  <meta property="og:image:secure_url" content="{image_e}" />\n'
        f'  <meta property="og:image:type" content="image/png" />\n'
        f'  <meta property="og:image:width" content="1200" />\n'
        f'  <meta property="og:image:height" content="630" />\n'
        f'  <meta property="og:image:alt" content="{title_e}" />\n'
    )
    html = html.replace("</head>", f"{extra_og}</head>", 1)

    # Add canonical link if not present
    if 'rel="canonical"' not in html:
        canonical = f'  <link rel="canonical" href="{url_e}" />\n'
        html = html.replace("</head>", f"{canonical}</head>", 1)

    # Add JSON-LD structured data
    if json_ld:
        import json as _json
        ld_block = f'  <script type="application/ld+json">{_json.dumps(json_ld, ensure_ascii=False)}</script>\n'
        html = html.replace("</head>", f"{ld_block}</head>", 1)

    # Add noscript body for crawlers
    if body_extra:
        html = html.replace('<div id="root"></div>', f'<div id="root"></div>\n  <noscript>{body_extra}</noscript>', 1)

    return html


def _event_date_myt(event):
    """Return event.date converted to MYT (UTC+8).

    DB stores datetimes in UTC (frontend submits via toISOString()), but for
    sharing/SEO/calendar we want to display the original local wall time the
    organiser typed. Returns a naive datetime in MYT, or None.
    """
    from datetime import timedelta, timezone
    try:
        d = event.date
        if not d or not hasattr(d, "strftime"):
            return None
        if d.tzinfo is None:
            # Treat as UTC (that's what we store) and convert to MYT.
            from datetime import timezone as _tz
            d = d.replace(tzinfo=_tz.utc)
        myt = d.astimezone(timezone(timedelta(hours=8)))
        return myt.replace(tzinfo=None)
    except Exception:
        return None


def _build_event_meta(event):
    """Build meta payload for an event."""
    name = event.name or "Race Event"
    location = event.location or "Malaysia"
    date_str = ""
    date_myt = _event_date_myt(event)
    if date_myt:
        date_str = date_myt.strftime("%d %B %Y")

    # Count assignments
    assignment_count = len(getattr(event, "assignments", []) or [])

    title = f"{name} - Race Photos | MarathonHub"
    if assignment_count > 0:
        description = f"{assignment_count} photographer{'s' if assignment_count != 1 else ''} cover {name}"
    else:
        description = f"{name}"
    if date_str:
        description += f" on {date_str}"
    if location:
        description += f" at {location}"
    description += ". Find your race photos on MarathonHub."

    url = f"{SITE_URL}/events/{event.id}"
    # Use dynamic OG image with photographer list (falls back to static if generation fails)
    image = f"{SITE_URL}/api/og/event/{event.id}.png"

    json_ld = {
        "@context": "https://schema.org",
        "@type": "SportsEvent",
        "name": name,
        "url": url,
        "location": {"@type": "Place", "name": location, "address": location},
        "image": image,
    }
    if date_str and date_myt:
        try:
            json_ld["startDate"] = date_myt.strftime("%Y-%m-%dT%H:%M:%S+08:00")
        except Exception:
            pass
    if event.description:
        json_ld["description"] = event.description[:300]

    # Body fallback for crawlers
    body_lines = [f"<h1>{_esc(name)}</h1>"]
    if date_str:
        body_lines.append(f"<p>Date: {_esc(date_str)}</p>")
    if location:
        body_lines.append(f"<p>Location: {_esc(location)}</p>")
    if event.description:
        body_lines.append(f"<p>{_esc(event.description[:500])}</p>")
    if assignment_count > 0:
        body_lines.append(f"<p>{assignment_count} photographer(s) covering this event.</p>")
    body_extra = "\n    ".join(body_lines)

    return title, description, url, image, json_ld, body_extra


def _build_photographer_meta(photographer):
    """Build meta payload for a photographer."""
    name = photographer.name or "Photographer"
    title = f"{name} - Race Photographer | MarathonHub"
    description = f"{name} - Marathon and race event photographer in Malaysia. View galleries and event coverage on MarathonHub."
    url = f"{SITE_URL}/photographers/{photographer.id}"
    image = f"{SITE_URL}/og-image.jpg"

    json_ld = {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": name,
        "url": url,
        "jobTitle": "Race Photographer",
    }

    body_extra = f"<h1>{_esc(name)}</h1>\n    <p>Race event photographer in Malaysia.</p>"
    return title, description, url, image, json_ld, body_extra


@app.get("/robots.txt", include_in_schema=False)
def robots_txt():
    body = (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /admin\n"
        "Disallow: /api/admin\n"
        f"Sitemap: {SITE_URL}/sitemap.xml\n"
    )
    return PlainTextResponse(body)


@app.get("/sitemap.xml", include_in_schema=False)
def sitemap_xml(db: Session = Depends(get_db)):
    """Generate sitemap from DB events + photographers."""
    from datetime import datetime
    urls = []

    # Static pages
    static_pages = [("/", "1.0", "daily"), ("/events", "0.9", "daily"), ("/photographers", "0.8", "weekly")]
    for path, priority, freq in static_pages:
        urls.append(f"  <url><loc>{SITE_URL}{path}</loc><changefreq>{freq}</changefreq><priority>{priority}</priority></url>")

    # Events
    try:
        events = db.query(models.Event).all()
        for e in events:
            try:
                lastmod = ""
                if getattr(e, "updated_at", None):
                    lastmod_dt = e.updated_at
                    lastmod = f"<lastmod>{lastmod_dt.strftime('%Y-%m-%d')}</lastmod>" if hasattr(lastmod_dt, "strftime") else ""
                urls.append(f"  <url><loc>{SITE_URL}/events/{e.id}</loc>{lastmod}<changefreq>weekly</changefreq><priority>0.8</priority></url>")
            except Exception:
                continue
    except Exception:
        pass

    # Photographers
    try:
        photographers = db.query(models.Photographer).all()
        for p in photographers:
            try:
                urls.append(f"  <url><loc>{SITE_URL}/photographers/{p.id}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>")
            except Exception:
                continue
    except Exception:
        pass

    body = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls)
        + "\n</urlset>\n"
    )
    return Response(content=body, media_type="application/xml")


# -----------------------------------------------------------------------------
# Dynamic OG Image Generator (for social media share preview)
# -----------------------------------------------------------------------------
_OG_FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
_OG_FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

# Bounded TTL cache: {event_id: (png_bytes, expires_at)}
# In-process dict with hard size cap so a flood of crawler hits on
# random event_ids can't grow memory unbounded. Evicts the oldest
# entries (insertion order) once full.
_OG_CACHE_MAX = 200
_og_cache: "dict[int, tuple[bytes, float]]" = {}


def _og_cache_set(event_id: int, png_bytes: bytes, expires_at: float) -> None:
    """Insert into the OG image cache, evicting oldest entries past the cap."""
    # Refresh insertion order if the key already exists.
    if event_id in _og_cache:
        _og_cache.pop(event_id, None)
    _og_cache[event_id] = (png_bytes, expires_at)
    # Evict oldest until under cap.
    while len(_og_cache) > _OG_CACHE_MAX:
        # dict preserves insertion order — pop the first (oldest) entry.
        oldest_key = next(iter(_og_cache))
        _og_cache.pop(oldest_key, None)


def _font(size, bold=False):
    """Load font safely with fallback."""
    try:
        from PIL import ImageFont
        path = _OG_FONT_BOLD if bold else _OG_FONT_REGULAR
        return ImageFont.truetype(path, size)
    except Exception:
        from PIL import ImageFont
        return ImageFont.load_default()


def _load_event_bg(event):
    """Load event cover image as PIL Image. Returns None if unavailable."""
    from PIL import Image
    import io
    url = getattr(event, 'cover_image_url', None)
    if not url:
        return None
    try:
        # Extract filename — works for both /api/uploads/x.png and full URLs
        filename = url.split('?')[0].split('/')[-1]
        if not filename:
            return None
        # Try local storage first (fast)
        for candidate in ['/app/storage/uploads', os.path.join(BASE_DIR, 'storage', 'uploads')]:
            local_path = os.path.join(candidate, filename)
            if os.path.exists(local_path):
                return Image.open(local_path).convert('RGB')
        # Last resort: HTTP fetch
        if url.startswith('http'):
            import urllib.request
            req = urllib.request.Request(url, headers={'User-Agent': 'MarathonHub-OG/1.0'})
            with urllib.request.urlopen(req, timeout=5) as r:
                return Image.open(io.BytesIO(r.read())).convert('RGB')
    except Exception as e:
        print(f"OG bg load failed: {e}")
    return None


def _generate_event_og_image(event):
    """Generate 1200x630 OG image for an event with photographer list."""
    from PIL import Image, ImageDraw, ImageFilter
    import io

    W, H = 1200, 630
    BG = (15, 23, 42)        # slate-900 fallback
    PRIMARY = (251, 191, 36) # amber-400
    WHITE = (255, 255, 255)
    MUTED = (200, 210, 225)  # lighter for readability over poster
    ACCENT = (251, 191, 36)  # use primary for bullets when over poster

    # Try poster as background
    bg_poster = _load_event_bg(event)
    if bg_poster is not None:
        try:
            src_w, src_h = bg_poster.size
            target_ratio = W / H
            src_ratio = src_w / src_h
            # Cover-fit crop
            if src_ratio > target_ratio:
                new_w = int(src_h * target_ratio)
                offset_x = (src_w - new_w) // 2
                bg_poster = bg_poster.crop((offset_x, 0, offset_x + new_w, src_h))
            else:
                new_h = int(src_w / target_ratio)
                offset_y = (src_h - new_h) // 2
                bg_poster = bg_poster.crop((0, offset_y, src_w, offset_y + new_h))
            bg_poster = bg_poster.resize((W, H), Image.LANCZOS)
            # Heavy blur + dark blend for text readability
            bg_poster = bg_poster.filter(ImageFilter.GaussianBlur(radius=14))
            dark = Image.new('RGB', (W, H), (8, 12, 24))
            img = Image.blend(bg_poster, dark, 0.58)
        except Exception as e:
            print(f"OG bg processing failed: {e}")
            img = Image.new("RGB", (W, H), BG)
    else:
        img = Image.new("RGB", (W, H), BG)

    draw = ImageDraw.Draw(img)

    # Decorative top bar
    draw.rectangle([0, 0, W, 8], fill=PRIMARY)

    # Brand label
    draw.text((60, 40), "MARATHONHUB", font=_font(22, bold=True), fill=PRIMARY)

    # Event title (wrap if too long)
    title = event.name or "Race Event"
    title_font = _font(56, bold=True)

    def _wrap(text, font, max_width):
        words = text.split()
        lines = []
        current = ""
        for word in words:
            test = (current + " " + word).strip()
            bbox = draw.textbbox((0, 0), test, font=font)
            if bbox[2] - bbox[0] <= max_width:
                current = test
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
        return lines[:2]  # max 2 lines

    title_lines = _wrap(title, title_font, W - 120)
    y = 90
    for line in title_lines:
        draw.text((60, y), line, font=title_font, fill=WHITE)
        y += 70

    # Date + location
    info_y = y + 10
    info_font = _font(28)
    date_str = ""
    date_myt = _event_date_myt(event)
    if date_myt:
        date_str = date_myt.strftime("%d %B %Y")
    if date_str:
        draw.text((60, info_y), f"📅  {date_str}", font=info_font, fill=MUTED)
        info_y += 42
    if event.location:
        loc = event.location
        if len(loc) > 50:
            loc = loc[:47] + "..."
        draw.text((60, info_y), f"📍  {loc}", font=info_font, fill=MUTED)
        info_y += 42

    # Photographer section
    assignments = sorted(
        getattr(event, "assignments", []) or [],
        key=lambda a: (not getattr(a, "is_pinned", False))
    )
    count = len(assignments)
    section_y = info_y + 30
    label = f"PHOTOGRAPHERS ({count})" if count else "PHOTOGRAPHERS"
    draw.text((60, section_y), label, font=_font(20, bold=True), fill=PRIMARY)

    list_top = section_y + 38

    if count > 0:
        # Adaptive layout to fit ALL names where possible
        if count <= 6:
            row_h, name_size, max_chars, two_cols = 36, 24, 32, False
        elif count <= 8:
            row_h, name_size, max_chars, two_cols = 34, 22, 26, True
        else:  # 9-12 (cap at 12, show "+ N more" for extras)
            row_h, name_size, max_chars, two_cols = 32, 20, 24, True

        max_show = min(count, 12)
        per_col = (max_show + 1) // 2 if two_cols else max_show
        name_font = _font(name_size, bold=True)
        col2_offset = 580

        for idx, a in enumerate(assignments[:max_show]):
            try:
                pname = (a.photographer.name if a.photographer else "Photographer")
                if len(pname) > max_chars:
                    pname = pname[:max_chars - 3] + "..."

                if two_cols:
                    col = 0 if idx < per_col else 1
                    row = idx if col == 0 else idx - per_col
                else:
                    col, row = 0, idx

                x_bullet = 60 + (col2_offset if col else 0)
                x_text = 85 + (col2_offset if col else 0)
                y = list_top + row * row_h

                bullet_y = y + row_h // 2 - 5
                draw.ellipse([x_bullet, bullet_y, x_bullet + 10, bullet_y + 10], fill=ACCENT)
                draw.text((x_text, y), pname, font=name_font, fill=WHITE)
            except Exception:
                continue

        if count > max_show:
            draw.text((60, H - 80), f"+ {count - max_show} more photographer(s)",
                      font=_font(18), fill=MUTED)

    # Footer
    draw.text((60, H - 50), "marathonhub.ohmaishoot.com", font=_font(18), fill=MUTED)

    # Output
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


@app.get("/api/og/event/{event_id}.png", include_in_schema=False)
def og_image_event(event_id: int, db: Session = Depends(get_db)):
    """Dynamic OG image for an event. Cached 10 minutes."""
    import time
    now = time.time()
    cached = _og_cache.get(event_id)
    if cached and cached[1] > now:
        return Response(content=cached[0], media_type="image/png",
                        headers={"Cache-Control": "public, max-age=600"})

    event = crud.get_event(db, event_id=event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    try:
        png_bytes = _generate_event_og_image(event)
        _og_cache_set(event_id, png_bytes, now + 600)  # 10 min cache
        return Response(content=png_bytes, media_type="image/png",
                        headers={"Cache-Control": "public, max-age=600"})
    except Exception as e:
        print(f"OG image generation failed for event {event_id}: {e}")
        # Fallback to static og-image.jpg
        og_path = os.path.join(BASE_DIR, "static", "og-image.jpg")
        if os.path.exists(og_path):
            return FileResponse(og_path)
        raise HTTPException(status_code=500, detail="OG image generation failed")


@app.get("/api/share-text/event/{event_id}", include_in_schema=False)
def share_text_event(event_id: int, db: Session = Depends(get_db)):
    """Plain text version of event info for copy-paste sharing."""
    event = crud.get_event(db, event_id=event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    lines = [f"📷 {event.name}"]
    date_myt = _event_date_myt(event)
    if date_myt:
        lines.append(f"📅 {date_myt.strftime('%d %B %Y')}")
    if event.location:
        lines.append(f"📍 {event.location}")

    assignments = sorted(
        getattr(event, "assignments", []) or [],
        key=lambda a: (not getattr(a, "is_pinned", False))
    )
    if assignments:
        lines.append("")
        lines.append(f"Photographers ({len(assignments)}):")
        for a in assignments:
            try:
                pname = a.photographer.name if a.photographer else None
                if pname:
                    lines.append(f"📸 {pname}")
            except Exception:
                continue

    lines.append("")
    lines.append(f"{SITE_URL}/events/{event_id}")
    return {"text": "\n".join(lines)}


def _ics_escape(text: str) -> str:
    """Escape text for an ICS field per RFC 5545 — backslash, comma,
    semicolon, and newlines all need escaping."""
    if text is None:
        return ""
    return (
        str(text)
        .replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\n", "\\n")
        .replace("\r", "")
    )


def _ics_fold(line: str) -> str:
    """RFC 5545 §3.1: lines longer than 75 octets must be folded with
    CRLF + single space. Most calendar apps tolerate unfolded lines but
    Outlook is strict, so play it safe."""
    if len(line) <= 75:
        return line
    out = [line[:75]]
    rest = line[75:]
    while rest:
        out.append(" " + rest[:74])
        rest = rest[74:]
    return "\r\n".join(out)


@app.get("/api/events/{event_id}/calendar.ics", include_in_schema=False)
def event_ics(event_id: int, db: Session = Depends(get_db)):
    """Download an .ics calendar file for an event. Compatible with
    Google Calendar, Apple Calendar, Outlook, and most third-party apps."""
    from datetime import datetime, timedelta, timezone

    event = crud.get_event(db, event_id=event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Build start/end times. MarathonHub stores `date` as UTC (frontend
    # submits via toISOString()). Just attach UTC tzinfo and let the ICS
    # render in UTC — calendar clients convert to viewer's local TZ.
    try:
        start_dt = event.date if hasattr(event.date, "strftime") else None
    except Exception:
        start_dt = None

    if not start_dt:
        # Fallback to today midnight if the date is malformed
        start_dt = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    if start_dt.tzinfo is None:
        start_dt = start_dt.replace(tzinfo=timezone.utc)
    end_dt = start_dt + timedelta(hours=6)
    start_utc = start_dt.astimezone(timezone.utc)
    end_utc = end_dt.astimezone(timezone.utc)
    now_utc = datetime.now(timezone.utc)

    def _fmt(dt):
        return dt.strftime("%Y%m%dT%H%M%SZ")

    summary = _ics_escape(event.name or "Race Event")
    location = _ics_escape(event.location or "")
    desc_parts = []
    if event.description:
        desc_parts.append(event.description.strip())
    desc_parts.append(f"More info: {SITE_URL}/events/{event_id}")
    description = _ics_escape("\n\n".join(desc_parts))

    uid = f"event-{event_id}@marathonhub.ohmaishoot.com"
    url_line = f"{SITE_URL}/events/{event_id}"

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//MarathonHub//Race Events//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{_fmt(now_utc)}",
        f"DTSTART:{_fmt(start_utc)}",
        f"DTEND:{_fmt(end_utc)}",
        f"SUMMARY:{summary}",
        f"DESCRIPTION:{description}",
        f"LOCATION:{location}",
        f"URL:{url_line}",
        "STATUS:CONFIRMED",
        # 1-day-before reminder
        "BEGIN:VALARM",
        "TRIGGER:-P1D",
        "ACTION:DISPLAY",
        f"DESCRIPTION:Reminder: {summary} esok",
        "END:VALARM",
        "END:VEVENT",
        "END:VCALENDAR",
    ]
    body = "\r\n".join(_ics_fold(l) for l in lines) + "\r\n"

    safe_name = "".join(c if c.isalnum() else "_" for c in (event.name or "event"))[:40]
    return Response(
        content=body,
        media_type="text/calendar; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}_{event_id}.ics"',
        },
    )


# -----------------------------------------------------------------------------
# FRONTEND HOSTING (Production)
# -----------------------------------------------------------------------------
# Serve static files from the 'static' directory (compiled React frontend)
static_dir = os.path.join(BASE_DIR, "static")

if os.path.exists(static_dir):
    # Mount assets folder for JS/CSS/Images
    assets_dir = os.path.join(static_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
    
    # Serve logo image specifically (since it's at root of static dir)
    @app.get("/ohmaishoot-logo.png")
    async def serve_logo():
        logo_path = os.path.join(static_dir, "ohmaishoot-logo.png")
        if os.path.exists(logo_path):
            return FileResponse(logo_path)
        raise HTTPException(status_code=404, detail="Logo not found")
    
    # Serve OG image for social media previews
    @app.get("/og-image.jpg")
    async def serve_og_image():
        og_image_path = os.path.join(static_dir, "og-image.jpg")
        if os.path.exists(og_image_path):
            return FileResponse(og_image_path)
        raise HTTPException(status_code=404, detail="OG image not found")

    # Serve favicon — fall back to the logo PNG so browsers/tabs show
    # something branded instead of a broken icon.
    @app.get("/favicon.ico")
    async def serve_favicon():
        for candidate in ("favicon.ico", "ohmaishoot-logo.png"):
            path = os.path.join(static_dir, candidate)
            if os.path.exists(path):
                return FileResponse(path)
        raise HTTPException(status_code=404, detail="Favicon not found")

    # Serve PWA manifest — referenced from index.html for install prompt
    # + theme. The catch-all SPA route rejects any path containing a dot,
    # so we need an explicit handler here.
    @app.get("/manifest.webmanifest")
    async def serve_manifest():
        path = os.path.join(static_dir, "manifest.webmanifest")
        if os.path.exists(path):
            return FileResponse(path, media_type="application/manifest+json")
        raise HTTPException(status_code=404, detail="Manifest not found")

# Catch-all route for SPA (React Router)
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str, db: Session = Depends(get_db)):
    # Skip if it's an API call
    if full_path.startswith("api"):
        raise HTTPException(status_code=404, detail="API route not found")

    # If it looks like a static file but reached here, it's a 404 (don't serve index.html)
    # This prevents the browser from getting HTML when it expects JS/CSS
    if "." in full_path and not full_path.endswith(".html"):
        raise HTTPException(status_code=404)

    # SEO: inject meta tags for event/photographer detail pages
    try:
        meta = None
        if full_path.startswith("events/"):
            try:
                event_id = int(full_path.split("/")[1])
                event = crud.get_event(db, event_id=event_id)
                if event:
                    meta = _build_event_meta(event)
            except (ValueError, IndexError):
                pass
        elif full_path.startswith("photographers/"):
            try:
                photographer_id = int(full_path.split("/")[1])
                photographer = crud.get_photographer(db, photographer_id=photographer_id)
                if photographer:
                    meta = _build_photographer_meta(photographer)
            except (ValueError, IndexError):
                pass

        if meta:
            html, ok = _read_index_template()
            if ok:
                title, description, url, image, json_ld, body_extra = meta
                html = _inject_meta(html, title, description, url, image, json_ld, body_extra)
                return HTMLResponse(content=html)
    except Exception as e:
        # Fail-safe: log but fall through to plain index.html
        print(f"SEO meta injection failed for /{full_path}: {e}")

    # Default: serve index.html for all other frontend routes
    if os.path.exists(static_dir):
        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)

    raise HTTPException(status_code=404, detail="Not Found")

