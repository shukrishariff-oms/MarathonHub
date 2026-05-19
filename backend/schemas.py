from typing import List, Optional, Any
import json as _json
from datetime import datetime
from pydantic import BaseModel, HttpUrl, field_validator


# ---------------------------------------------------------------------------
# Reusable validators
# ---------------------------------------------------------------------------
def _validate_optional_url(value: Optional[str]) -> Optional[str]:
    """Accept None / empty / relative path / valid http(s) URL.

    The DB stores both server-relative paths (/api/uploads/abc.png) and
    fully-qualified URLs in the same column, so we can't just use
    pydantic.HttpUrl. This keeps it permissive but rejects clearly
    bogus values like "javascript:..." or "ftp://...".
    """
    if value is None or value == "":
        return value
    if value.startswith("/"):
        return value  # server-relative is fine
    if value.startswith(("http://", "https://")):
        return value
    raise ValueError(
        "URL must be empty, a relative path starting with '/', or http(s)://"
    )


def _validate_json_list_string(value: Optional[str]) -> Optional[str]:
    """Ensure the value is a JSON-serialised list of primitives."""
    if value is None or value == "":
        return value
    try:
        parsed = _json.loads(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"must be valid JSON: {exc}") from exc
    if not isinstance(parsed, list):
        raise ValueError("must be a JSON array")
    return value


# ---------------------------------------------------------------------------
# Admin Schemas
# ---------------------------------------------------------------------------
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

    @field_validator("km_coverage_json")
    @classmethod
    def _check_km_coverage(cls, v: str) -> str:
        return _validate_json_list_string(v) or "[]"

    @field_validator("gallery_url")
    @classmethod
    def _check_gallery_url(cls, v: str) -> str:
        validated = _validate_optional_url(v)
        return validated or v

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
    is_public: Optional[bool] = True
    display_order: Optional[int] = 0

    @field_validator(
        "logo_url",
        "website_url",
        "instagram_url",
        "facebook_url",
        "x_url",
    )
    @classmethod
    def _check_urls(cls, v: Optional[str]) -> Optional[str]:
        return _validate_optional_url(v)

    @field_validator("coverage_areas_json")
    @classmethod
    def _check_coverage_areas(cls, v: Optional[str]) -> Optional[str]:
        return _validate_json_list_string(v)

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

    @field_validator("cover_image_url")
    @classmethod
    def _check_cover_image_url(cls, v: Optional[str]) -> Optional[str]:
        return _validate_optional_url(v)

    @field_validator("distances_json")
    @classmethod
    def _check_distances(cls, v: str) -> str:
        return _validate_json_list_string(v) or "[]"

    @field_validator("highlight_images_json")
    @classmethod
    def _check_highlight_images(cls, v: Optional[str]) -> Optional[str]:
        return _validate_json_list_string(v)

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
    event_id: Optional[int] = None

class AnalyticsSummary(BaseModel):
    daily_visits: List[dict] # {date: str, count: int, unique_visitors: int}
    popular_events: List[dict] # {id, name, views, unique_visitors}
    popular_photographers: List[dict] # {id, name, views, unique_visitors}
    total_views: int
    unique_visitors: int = 0
