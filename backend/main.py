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

models.Base.metadata.create_all(bind=database.engine)

# Run daily backup on startup
try:
    import sys
    sys.path.append(os.path.join(BASE_DIR, ".."))
    from backup_db import create_backup
    create_backup()
except Exception as e:
    print(f"Startup backup skipped: {e}")

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

            # PageViews table (migration for event_id)
            if "page_views" in existing_tables:
                pv_cols = [c['name'] for c in inspector.get_columns("page_views")]
                if "event_id" not in pv_cols:
                    print("Migrating database: Adding event_id column to page_views...")
                    conn.execute(text("ALTER TABLE page_views ADD COLUMN event_id INTEGER NULL"))
                    conn.execute(text("CREATE INDEX ix_page_views_event_id ON page_views (event_id)"))
                    conn.commit()
                    print("Migration successful.")
                    
    except Exception as e:
        print(f"Migration check failed: {e}")

check_and_migrate_db()

app = FastAPI(title="MarathonHub API", version="0.1.0")

# Mount 'uploads' directory to serve images
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
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
    origins.extend(allowed_origins_env.split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Public Endpoints ---

@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Return relative URL (works for both dev and production)
    return {"url": f"/api/uploads/{unique_filename}"}

origins = [
    "http://localhost:5173", # Vite default
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://localhost",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Public Endpoints ---

@app.get("/api/events", response_model=List[schemas.Event])
def read_events(
    skip: int = 0, 
    limit: int = 100, 
    status: Optional[str] = None,  # Changed default from "Upcoming" to None
    search: Optional[str] = None,
    month: Optional[str] = None,
    location: Optional[str] = None,
    is_highlight: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    # Basic filtering handling here or inside crud
    query = db.query(models.Event)
    
    # Don't filter by status in the query - we'll do it after computing status
    
    if search:
        query = query.filter(models.Event.name.contains(search))
        
    if location:
        query = query.filter(models.Event.location.contains(location))
    
    # Month filtering requires date manipulation, simple version:
    if month:
        # Assuming month is "YYYY-MM"
        query = query.filter(models.Event.date.astype(str).startswith(month))

    if is_highlight is not None:
        query = query.filter(models.Event.is_highlight == is_highlight)

    # Get all events matching other filters
    all_events = query.order_by(models.Event.date.asc()).all()
    
    # Filter by computed status only if status parameter is provided
    if status and status != 'All':
        filtered_events = [event for event in all_events if event.computed_status == status]
    else:
        filtered_events = all_events
    
    # Apply pagination
    paginated_events = filtered_events[skip:skip + limit] if limit else filtered_events[skip:]
    
    return paginated_events

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
def login_for_access_token(form_data: schemas.AdminLogin, db: Session = Depends(get_db)):
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

# --- Analytics Endpoints ---

@app.post("/api/track", status_code=status.HTTP_201_CREATED)
def track_page_view(
    view: schemas.PageViewCreate, 
    request: Request,
    db: Session = Depends(get_db)
):
    # Anonymize IP
    import hashlib
    ip = request.client.host or "unknown"
    user_agent = request.headers.get('user-agent', '')
    ip_hash = hashlib.sha256(ip.encode()).hexdigest()[:16]
    
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

# --- Debug Endpoint ---
@app.get("/api/debug-db")
def debug_db(db: Session = Depends(get_db)):
    try:
        events = db.query(models.Event).all()
        return {"event_count": len(events), "events": [{"id": e.id, "name": e.name, "date": e.date} for e in events]}
    except Exception as e:
        return {"error": str(e)}

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


def _build_event_meta(event):
    """Build meta payload for an event."""
    name = event.name or "Race Event"
    location = event.location or "Malaysia"
    date_str = ""
    try:
        if event.date:
            date_str = event.date.strftime("%d %B %Y") if hasattr(event.date, "strftime") else str(event.date)[:10]
    except Exception:
        date_str = ""

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
    image = event.cover_image_url or f"{SITE_URL}/og-image.jpg"
    if image and not image.startswith("http"):
        image = f"{SITE_URL}{image}"

    json_ld = {
        "@context": "https://schema.org",
        "@type": "SportsEvent",
        "name": name,
        "url": url,
        "location": {"@type": "Place", "name": location, "address": location},
        "image": image,
    }
    if date_str and event.date:
        try:
            json_ld["startDate"] = event.date.isoformat() if hasattr(event.date, "isoformat") else str(event.date)
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

