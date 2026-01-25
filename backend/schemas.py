from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, HttpUrl

# Admin Schemas
class AdminLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Assignment Schemas
class AssignmentBase(BaseModel):
    event_id: int
    photographer_id: int
    km_coverage_json: str
    gallery_url: str
    note: Optional[str] = None
    is_pinned: Optional[bool] = False

class AssignmentCreate(AssignmentBase):
    pass

class AssignmentUpdate(AssignmentBase):
    pass

class Assignment(AssignmentBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Photographer Schemas
class PhotographerBase(BaseModel):
    name: str
    brand: Optional[str] = None
    bio: Optional[str] = None
    logo_url: Optional[str] = None
    website_url: Optional[str] = None
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None
    x_url: Optional[str] = None
    coverage_areas_json: Optional[str] = "[]"

class PhotographerCreate(PhotographerBase):
    pass

class PhotographerUpdate(PhotographerBase):
    pass

class Photographer(PhotographerBase):
    id: int
    created_at: datetime
    updated_at: datetime
    assignments: List[Assignment] = []

    class Config:
        from_attributes = True

# Event Schemas
class EventBase(BaseModel):
    name: str
    date: datetime
    location: str
    organizer: str
    description: Optional[str] = None
    distances_json: str
    status: str = "Upcoming"
    is_highlight: Optional[bool] = False
    cover_image_url: Optional[str] = None
    highlight_images_json: Optional[str] = "[]"

class EventCreate(EventBase):
    pass

class EventUpdate(EventBase):
    pass

class Event(EventBase):
    id: int
    created_at: datetime
    updated_at: datetime
    assignments: List[Assignment] = [] # This might need a simpler schema to avoid recursion if we nest deeply

    class Config:
        from_attributes = True
        
    @classmethod
    def from_orm(cls, obj):
        # Override to use computed_status
        data = {
            'id': obj.id,
            'name': obj.name,
            'date': obj.date,
            'location': obj.location,
            'organizer': obj.organizer,
            'description': obj.description,
            'distances_json': obj.distances_json,
            'status': obj.computed_status,  # Use computed status instead of db status
            'is_highlight': obj.is_highlight,
            'cover_image_url': obj.cover_image_url,
            'highlight_images_json': obj.highlight_images_json,
            'created_at': obj.created_at,
            'updated_at': obj.updated_at,
            'assignments': obj.assignments
        }
        return cls(**data)

# For listing assignments with photographer details
class AssignmentWithPhotographer(Assignment):
    photographer: Photographer

    class Config:
        from_attributes = True

# For listing assignments with event details
class AssignmentWithEvent(Assignment):
    event: Event

    class Config:
        from_attributes = True

# Update Event to use specific assignment schema if needed, 
# but for now standard Assignment is okay as it just has ids.
# Ideally the public event detail needs the Photographer details in the assignment.
class AssignmentPublic(BaseModel):
    id: int
    km_coverage_json: str
    gallery_url: str
    note: Optional[str] = None
    is_pinned: bool = False
    photographer: Photographer # Nested photographer info

    class Config:
        from_attributes = True

class EventPublic(Event):
    assignments: List[AssignmentPublic] = []
    
    class Config:
        from_attributes = True
        
    @classmethod
    def from_orm(cls, obj):
        # Override to use computed_status
        data = {
            'id': obj.id,
            'name': obj.name,
            'date': obj.date,
            'location': obj.location,
            'organizer': obj.organizer,
            'description': obj.description,
            'distances_json': obj.distances_json,
            'status': obj.computed_status,  # Use computed status instead of db status
            'is_highlight': obj.is_highlight,
            'cover_image_url': obj.cover_image_url,
            'highlight_images_json': obj.highlight_images_json,
            'created_at': obj.created_at,
            'updated_at': obj.updated_at,
            'assignments': obj.assignments
        }
        return cls(**data)

# Analytics Schemas
class PageViewCreate(BaseModel):
    path: str
    entity_type: str
    entity_id: Optional[int] = None

class AnalyticsSummary(BaseModel):
    daily_visits: List[dict] # {date: str, count: int}
    popular_events: List[dict] # {id, name, views}
    popular_photographers: List[dict] # {id, name, views}
    total_views: int
