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

    # Race calendar extensions (all optional — backwards compatible)
    state: Optional[str] = None
    race_type: Optional[str] = None
    start_time: Optional[str] = None
    registration_url: Optional[str] = None
    registration_close_at: Optional[datetime] = None
    fee_min: Optional[int] = None
    fee_max: Optional[int] = None
    categories_json: Optional[str] = "[]"
    bib_pickup_info: Optional[str] = None
    gpx_url: Optional[str] = None
    organizer_url: Optional[str] = None
    participant_count: Optional[int] = None
    weather_temp_c: Optional[int] = None
    winners_json: Optional[str] = "[]"
    recap_summary: Optional[str] = None

    @field_validator("cover_image_url")
    @classmethod
    def _check_cover_image_url(cls, v: Optional[str]) -> Optional[str]:
        return _validate_optional_url(v)

    @field_validator("registration_url", "gpx_url", "organizer_url")
    @classmethod
    def _check_race_urls(cls, v: Optional[str]) -> Optional[str]:
        return _validate_optional_url(v)

    @field_validator("distances_json")
    @classmethod
    def _check_distances(cls, v: str) -> str:
        return _validate_json_list_string(v) or "[]"

    @field_validator("categories_json", "winners_json")
    @classmethod
    def _check_race_json_lists(cls, v: Optional[str]) -> Optional[str]:
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
    slug: Optional[str] = None
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
            'slug': getattr(obj, 'slug', None),
            'date': obj.date,
            'location': obj.location,
            'organizer': obj.organizer,
            'description': obj.description,
            'distances_json': obj.distances_json,
            'status': obj.computed_status,  # Use computed status instead of db status
            'is_highlight': obj.is_highlight,
            'cover_image_url': obj.cover_image_url,
            'highlight_images_json': obj.highlight_images_json,
            'state': getattr(obj, 'state', None),
            'race_type': getattr(obj, 'race_type', None),
            'start_time': getattr(obj, 'start_time', None),
            'registration_url': getattr(obj, 'registration_url', None),
            'registration_close_at': getattr(obj, 'registration_close_at', None),
            'fee_min': getattr(obj, 'fee_min', None),
            'fee_max': getattr(obj, 'fee_max', None),
            'categories_json': getattr(obj, 'categories_json', '[]') or '[]',
            'bib_pickup_info': getattr(obj, 'bib_pickup_info', None),
            'gpx_url': getattr(obj, 'gpx_url', None),
            'organizer_url': getattr(obj, 'organizer_url', None),
            'participant_count': getattr(obj, 'participant_count', None),
            'weather_temp_c': getattr(obj, 'weather_temp_c', None),
            'winners_json': getattr(obj, 'winners_json', '[]') or '[]',
            'recap_summary': getattr(obj, 'recap_summary', None),
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
            'slug': getattr(obj, 'slug', None),
            'date': obj.date,
            'location': obj.location,
            'organizer': obj.organizer,
            'description': obj.description,
            'distances_json': obj.distances_json,
            'status': obj.computed_status,  # Use computed status instead of db status
            'is_highlight': obj.is_highlight,
            'cover_image_url': obj.cover_image_url,
            'highlight_images_json': obj.highlight_images_json,
            'state': getattr(obj, 'state', None),
            'race_type': getattr(obj, 'race_type', None),
            'start_time': getattr(obj, 'start_time', None),
            'registration_url': getattr(obj, 'registration_url', None),
            'registration_close_at': getattr(obj, 'registration_close_at', None),
            'fee_min': getattr(obj, 'fee_min', None),
            'fee_max': getattr(obj, 'fee_max', None),
            'categories_json': getattr(obj, 'categories_json', '[]') or '[]',
            'bib_pickup_info': getattr(obj, 'bib_pickup_info', None),
            'gpx_url': getattr(obj, 'gpx_url', None),
            'organizer_url': getattr(obj, 'organizer_url', None),
            'participant_count': getattr(obj, 'participant_count', None),
            'weather_temp_c': getattr(obj, 'weather_temp_c', None),
            'winners_json': getattr(obj, 'winners_json', '[]') or '[]',
            'recap_summary': getattr(obj, 'recap_summary', None),
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


# ---------------------------------------------------------------------------
# Face Search Schemas
# ---------------------------------------------------------------------------
class FaceIngestItem(BaseModel):
    """One face detected in one photo, ready to be stored.

    The PC RTX 2070 ingest worker produces a list of these and POSTs
    them in batches to /api/faces/ingest. Each item is a single FACE
    (so a photo with 12 faces = 12 items sharing the same photo_id).
    """

    photo_id: str
    event_id: Optional[int] = None
    photographer_id: Optional[int] = None
    source: str = "mh"  # mh | workonfaith | rkshoots | external
    source_url: str
    thumbnail_url: Optional[str] = None
    embedding: List[float]  # 512 floats (insightface buffalo_l)
    bbox_x: Optional[int] = None
    bbox_y: Optional[int] = None
    bbox_w: Optional[int] = None
    bbox_h: Optional[int] = None
    det_score: Optional[float] = None

    @field_validator("source")
    @classmethod
    def _check_source(cls, v: str) -> str:
        v = (v or "mh").strip().lower()
        if v not in {"mh", "workonfaith", "rkshoots", "external"}:
            raise ValueError(
                "source mesti salah satu: mh, workonfaith, rkshoots, external"
            )
        return v

    @field_validator("source_url")
    @classmethod
    def _check_source_url(cls, v: str) -> str:
        if not v or not v.startswith(("http://", "https://", "/")):
            raise ValueError("source_url mesti URL atau path absolute")
        return v


class FaceIngestRequest(BaseModel):
    """Batch ingest payload — one POST = many faces.

    `replace_event` lets a re-ingest of an event wipe old embeddings
    first (use when re-running the PC pipeline with a different model
    version, or after the photographer added more photos and you want
    to start clean instead of de-duping by photo_id).
    """

    items: List[FaceIngestItem]
    replace_event: Optional[int] = None  # if set, deletes existing rows for this event_id BEFORE inserting


class FaceIngestResponse(BaseModel):
    inserted: int
    skipped: int
    deleted_before: int = 0
    errors: List[str] = []


class FaceMatch(BaseModel):
    photo_id: str
    source: str
    source_url: str
    thumbnail_url: Optional[str] = None
    similarity: float
    event_id: Optional[int] = None
    photographer_id: Optional[int] = None
    photographer_name: Optional[str] = None
    photographer_brand: Optional[str] = None


class FaceSearchResponse(BaseModel):
    total_matches: int
    threshold: float
    matches: List[FaceMatch]
    errors: List[str] = []
    # Helpful for the UI: which sources had ANY embeddings indexed for
    # this event, so the runner knows whether "0 results" means "nothing
    # matched" or "we never indexed this gallery".
    indexed_sources: List[str] = []


# ---------------------------------------------------------------------------
# Submission / ranking / promo schemas (MVP viral loop)
# ---------------------------------------------------------------------------

class RunnerCreate(BaseModel):
    name: str
    email: str
    instagram_handle: Optional[str] = None
    strava_handle: Optional[str] = None


class RunnerOut(BaseModel):
    id: int
    name: str
    email: str
    instagram_handle: Optional[str] = None
    strava_handle: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SubmissionCreate(BaseModel):
    """Payload from the public submit page.

    Exactly one of strava_url or screenshot_path must be provided — we
    enforce this in the route, not the schema, to give a friendly 400
    with both options called out.
    """
    name: str
    email: str
    strava_url: Optional[str] = None
    screenshot_path: Optional[str] = None
    instagram_handle: Optional[str] = None
    strava_handle: Optional[str] = None
    # Optional pre-fill — runner can hint the event they participated in;
    # admin still verifies + maps it.
    suggested_event_id: Optional[int] = None


class SubmissionOut(BaseModel):
    id: int
    runner_id: int
    submission_type: str
    strava_url: Optional[str] = None
    screenshot_path: Optional[str] = None
    event_id: Optional[int] = None
    activity_date: Optional[datetime] = None
    activity_location: Optional[str] = None
    distance_km: Optional[float] = None
    time_seconds: Optional[int] = None
    elevation_gain_m: Optional[int] = None
    pace_min_per_km: Optional[float] = None  # computed
    category: Optional[str] = None  # computed
    status: str
    admin_notes: Optional[str] = None
    submitted_at: datetime
    reviewed_at: Optional[datetime] = None
    runner: Optional[RunnerOut] = None
    event_name: Optional[str] = None

    class Config:
        from_attributes = True


class SubmissionApprove(BaseModel):
    """Admin keys in the verified stats here when approving."""
    event_id: Optional[int] = None  # mapped MarathonHub event
    activity_date: datetime
    activity_location: Optional[str] = None
    distance_km: float
    time_seconds: int
    elevation_gain_m: Optional[int] = 0
    admin_notes: Optional[str] = None
    issue_promo: bool = True  # default ON — flip off for non-eligible


class SubmissionReject(BaseModel):
    reason: Optional[str] = None


class PromoCodeOut(BaseModel):
    id: int
    code: str
    runner_id: int
    runner_name: Optional[str] = None
    submission_id: int
    event_id: Optional[int] = None
    event_name: Optional[str] = None
    discount_pct: int
    expires_at: datetime
    max_uses: int
    used_count: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class LeaderboardEntry(BaseModel):
    rank: int
    submission_id: int
    runner_id: int
    runner_name: str
    instagram_handle: Optional[str] = None
    event_id: Optional[int] = None
    event_name: Optional[str] = None
    category: str
    distance_km: float
    time_seconds: int
    pace_min_per_km: float
    elevation_gain_m: int = 0
    promo_code: Optional[str] = None


class LeaderboardResponse(BaseModel):
    category: str  # '5K' | '10K' | 'HM' | 'FM' | 'ELEVATION' | 'OVERALL'
    event_id: Optional[int] = None
    event_name: Optional[str] = None
    entries: List[LeaderboardEntry]
    total_entries: int
