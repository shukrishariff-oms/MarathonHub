from fastapi import FastAPI, Depends, HTTPException, status, Query, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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

            # 2. Check for missing columns (is_pinned)
            # Use inspector instead of PRAGMA for better portability
            columns = [c['name'] for c in inspector.get_columns("assignments")]
            if "is_pinned" not in columns:
                print("Migrating database: Adding is_pinned column...")
                conn.execute(text("ALTER TABLE assignments ADD COLUMN is_pinned BOOLEAN DEFAULT 0 NOT NULL"))
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
def read_photographers(skip: int = 0, limit: int = 100, search: Optional[str] = None, db: Session = Depends(get_db)):
    return crud.get_photographers(db, skip=skip, limit=limit, search=search)

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

# --- Debug Endpoint ---
@app.get("/api/debug-db")
def debug_db(db: Session = Depends(get_db)):
    try:
        events = db.query(models.Event).all()
        return {"event_count": len(events), "events": [{"id": e.id, "name": e.name, "date": e.date} for e in events]}
    except Exception as e:
        return {"error": str(e)}

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
async def serve_frontend(full_path: str):
    # Skip if it's an API call
    if full_path.startswith("api"):
        raise HTTPException(status_code=404, detail="API route not found")
        
    # If it looks like a static file but reached here, it's a 404 (don't serve index.html)
    # This prevents the browser from getting HTML when it expects JS/CSS
    if "." in full_path and not full_path.endswith(".html"):
        raise HTTPException(status_code=404)

    # Serve index.html for all other frontend routes
    if os.path.exists(static_dir):
        from fastapi.responses import FileResponse
        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
            
    raise HTTPException(status_code=404, detail="Not Found")

