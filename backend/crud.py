from sqlalchemy.orm import Session
import models, schemas
import json

# Admin
def get_admin_by_username(db: Session, username: str):
    return db.query(models.Admin).filter(models.Admin.username == username).first()

def create_admin(db: Session, admin: schemas.AdminLogin):
    from auth import get_password_hash
    hashed_password = get_password_hash(admin.password)
    db_admin = models.Admin(username=admin.username, password_hash=hashed_password)
    db.add(db_admin)
    db.commit()
    db.refresh(db_admin)
    return db_admin

# Events
from datetime import datetime

# Events
def update_event_statuses(db: Session):
    """
    Auto-update events to 'Completed' if their date has passed.
    """
    now = datetime.utcnow()
    # Find all upcoming events that are in the past
    expired_events = db.query(models.Event).filter(
        models.Event.status == "Upcoming",
        models.Event.date < now
    ).all()
    
    if expired_events:
        for event in expired_events:
            event.status = "Completed"
        db.commit()

def get_events(db: Session, skip: int = 0, limit: int = 100, status: str = None, search: str = None, is_highlight: bool = None):
    # Auto-update statuses before fetching
    update_event_statuses(db)

    query = db.query(models.Event)
    if status and status != 'All':
        query = query.filter(models.Event.status == status)
    if search:
        query = query.filter(models.Event.name.contains(search))
    if is_highlight is not None:
        query = query.filter(models.Event.is_highlight == is_highlight)
    
    # Sort by date descending
    return query.order_by(models.Event.date.desc()).offset(skip).limit(limit).all()

def get_event(db: Session, event_id: int):
    return db.query(models.Event).filter(models.Event.id == event_id).first()

def create_event(db: Session, event: schemas.EventCreate):
    db_event = models.Event(**event.dict())
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

def update_event(db: Session, event_id: int, event: schemas.EventUpdate):
    db_event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if db_event:
        for key, value in event.dict().items():
            setattr(db_event, key, value)
        db.commit()
        db.refresh(db_event)
    return db_event

def delete_event(db: Session, event_id: int):
    db_event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if db_event:
        db.delete(db_event)
        db.commit()
    return db_event

# Photographers
def get_photographers(db: Session, skip: int = 0, limit: int = 100, search: str = None):
    query = db.query(models.Photographer)
    if search:
        query = query.filter(models.Photographer.name.contains(search))
    return query.offset(skip).limit(limit).all()

def get_photographer(db: Session, photographer_id: int):
    return db.query(models.Photographer).filter(models.Photographer.id == photographer_id).first()

def create_photographer(db: Session, photographer: schemas.PhotographerCreate):
    db_photographer = models.Photographer(**photographer.dict())
    db.add(db_photographer)
    db.commit()
    db.refresh(db_photographer)
    return db_photographer

def update_photographer(db: Session, photographer_id: int, photographer: schemas.PhotographerUpdate):
    db_photographer = db.query(models.Photographer).filter(models.Photographer.id == photographer_id).first()
    if db_photographer:
        for key, value in photographer.dict().items():
            setattr(db_photographer, key, value)
        db.commit()
        db.refresh(db_photographer)
    return db_photographer

def delete_photographer(db: Session, photographer_id: int):
    db_photographer = db.query(models.Photographer).filter(models.Photographer.id == photographer_id).first()
    if db_photographer:
        db.delete(db_photographer)
        db.commit()
    return db_photographer

# Assignments
def create_assignment(db: Session, assignment: schemas.AssignmentCreate):
    db_assignment = models.Assignment(**assignment.dict())
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)
    return db_assignment

def update_assignment(db: Session, assignment_id: int, assignment: schemas.AssignmentUpdate):
    db_assignment = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if db_assignment:
        for key, value in assignment.dict().items():
            setattr(db_assignment, key, value)
        db.commit()
        db.refresh(db_assignment)
    return db_assignment

def delete_assignment(db: Session, assignment_id: int):
    db_assignment = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if db_assignment:
        db.delete(db_assignment)
        db.commit()
    return db_assignment

def get_assignments_by_event(db: Session, event_id: int):
    return db.query(models.Assignment).filter(models.Assignment.event_id == event_id).all()

def toggle_assignment_pin(db: Session, assignment_id: int):
    db_assignment = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if db_assignment:
        db_assignment.is_pinned = not db_assignment.is_pinned
        db.commit()
        db.refresh(db_assignment)
    return db_assignment
