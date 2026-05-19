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

    Note: this is no longer called on every read. The Event.computed_status
    @property handles status derivation virtually. This function is kept for
    explicit/scheduled use only (e.g. a cron job that wants to persist the
    state column for reporting). Per-row try/except so one bad row doesn't
    poison the whole batch and trip subsequent reads via a stuck transaction.
    """
    now = datetime.utcnow()
    try:
        expired_events = db.query(models.Event).filter(
            models.Event.status == "Upcoming",
            models.Event.date < now
        ).all()
    except Exception as e:
        # Don't let a bad query break the caller — just log and bail.
        print(f"update_event_statuses: query failed: {e}")
        db.rollback()
        return

    for event in expired_events:
        try:
            event.status = "Completed"
            db.commit()
        except Exception as e:
            print(f"update_event_statuses: failed for event id={event.id}: {e}")
            db.rollback()

def get_events(db: Session, skip: int = 0, limit: int = 100, status: str = None, search: str = None, is_highlight: bool = None):
    # Status is derived virtually via Event.computed_status — no write-on-read.
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
def get_photographers(db: Session, skip: int = 0, limit: int = 100, search: str = None, include_hidden: bool = False):
    query = db.query(models.Photographer)
    if not include_hidden:
        query = query.filter(models.Photographer.is_public == True)
    if search:
        query = query.filter(models.Photographer.name.contains(search))
    return query.order_by(models.Photographer.display_order.asc(), models.Photographer.name.asc()).offset(skip).limit(limit).all()

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

def create_page_view(db: Session, view: schemas.PageViewCreate, ip_hash: str, user_agent: str):
    db_view = models.PageView(
        path=view.path,
        entity_type=view.entity_type,
        entity_id=view.entity_id,
        event_id=view.event_id,
        ip_hash=ip_hash,
        user_agent=user_agent
    )
    db.add(db_view)
    db.commit()
    db.refresh(db_view)
    return db_view

def get_analytics_summary(db: Session):
    from sqlalchemy import func, desc
    from datetime import datetime, timedelta

    # Unique-visitor key: ip_hash + user_agent.
    # New tracks (after the 2aff222 fix) already bake UA into ip_hash, but
    # concatenating again is harmless and lets the same query also reconstruct
    # accurate unique counts from legacy rows where ip_hash was IP-only.
    visitor_key = models.PageView.ip_hash.op('||')('|').op('||')(
        func.coalesce(models.PageView.user_agent, '')
    )

    # Total Views (raw hits) and unique visitors (all-time)
    total_views = db.query(models.PageView).count()
    unique_visitors = db.query(func.count(func.distinct(visitor_key))).scalar() or 0

    # Daily Visits (Last 30 days) — both raw hits and unique visitors per day
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)

    daily_stats = db.query(
        func.strftime('%Y-%m-%d', models.PageView.timestamp).label('date'),
        func.count(models.PageView.id).label('count'),
        func.count(func.distinct(visitor_key)).label('unique_visitors')
    ).filter(
        models.PageView.timestamp >= thirty_days_ago
    ).group_by(
        'date'
    ).order_by(
        'date'
    ).all()

    daily_visits = [
        {"date": row.date, "count": row.count, "unique_visitors": row.unique_visitors}
        for row in daily_stats
    ]

    # All Events (with views + unique visitors, including 0)
    event_stats = db.query(
        models.Event.id,
        models.Event.name,
        func.count(models.PageView.id).label('views'),
        func.count(func.distinct(visitor_key)).label('unique_visitors')
    ).outerjoin(
        models.PageView, (models.Event.id == models.PageView.entity_id) & (models.PageView.entity_type == 'event')
    ).group_by(
        models.Event.id
    ).order_by(
        desc('views')
    ).all()

    popular_events = [
        {"id": r.id, "name": r.name, "views": r.views, "unique_visitors": r.unique_visitors}
        for r in event_stats
    ]

    # All Photographers (with views + unique visitors, including 0)
    photog_stats = db.query(
        models.Photographer.id,
        models.Photographer.name,
        func.count(models.PageView.id).label('views'),
        func.count(func.distinct(visitor_key)).label('unique_visitors')
    ).outerjoin(
        models.PageView, (models.Photographer.id == models.PageView.entity_id) & (models.PageView.entity_type == 'photographer')
    ).group_by(
        models.Photographer.id
    ).order_by(
        desc('views')
    ).all()

    popular_photographers = [
        {"id": r.id, "name": r.name, "views": r.views, "unique_visitors": r.unique_visitors}
        for r in photog_stats
    ]

    return {
        "daily_visits": daily_visits,
        "popular_events": popular_events,
        "popular_photographers": popular_photographers,
        "total_views": total_views,
        "unique_visitors": unique_visitors,
    }

def get_recent_views(db: Session, limit: int = 50):
    from sqlalchemy import desc
    return db.query(models.PageView).order_by(desc(models.PageView.timestamp)).limit(limit).all()

def get_event_photographer_analytics(db: Session, event_id: int):
    from sqlalchemy import func, desc
    from datetime import datetime, timedelta

    # Hourly Visits (Last 7 days to keep it relevant/readable, or just all time?)
    # Let's do All Time for the event since events are short-lived usually.
    # SQLite formatting for YYYY-MM-DD HH:00
    hourly_stats = db.query(
        func.strftime('%Y-%m-%d %H:00', models.PageView.timestamp).label('hour'),
        func.count(models.PageView.id).label('count')
    ).filter(
        models.PageView.entity_id == event_id,
        models.PageView.entity_type == 'event'
    ).group_by(
        'hour'
    ).order_by(
        'hour'
    ).all()

    hourly_visits = [{"date": row.hour, "count": row.count} for row in hourly_stats]

    # Find photographers who got views (entity_type='photographer') associated with this event_id
    stats = db.query(
        models.Photographer.id,
        models.Photographer.name,
        models.Photographer.brand,
        models.Photographer.logo_url,
        func.count(models.PageView.id).label('views')
    ).join(
        models.PageView, (models.Photographer.id == models.PageView.entity_id) & (models.PageView.entity_type == 'photographer')
    ).filter(
        models.PageView.event_id == event_id
    ).group_by(
        models.Photographer.id
    ).order_by(
        desc('views')
    ).all()
    
    photographers = [{"id": s.id, "name": s.name, "brand": s.brand, "logo_url": s.logo_url, "views": s.views} for s in stats]

    return {
        "hourly_visits": hourly_visits,
        "photographers": photographers
    }
