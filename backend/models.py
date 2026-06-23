from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, LargeBinary, Index
from sqlalchemy.orm import relationship
from database import Base

class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    slug = Column(String, unique=True, index=True, nullable=True)
    date = Column(DateTime, index=True)
    location = Column(String)
    organizer = Column(String)
    description = Column(Text)
    distances_json = Column(String)  # JSON string of distances list
    status = Column(String, default="Upcoming") # Upcoming, Past
    is_highlight = Column(Boolean, default=False)
    cover_image_url = Column(String, nullable=True)
    highlight_images_json = Column(Text, default="[]") # JSON list of image URLs

    # Race calendar extensions
    state = Column(String, nullable=True, index=True)  # "Selangor" | "KL" | "Penang" — for filter
    race_type = Column(String, nullable=True, index=True)  # "road" | "trail" | "fun_run"
    start_time = Column(String, nullable=True)  # "5:30 AM" — display only
    registration_url = Column(String, nullable=True)
    registration_close_at = Column(DateTime, nullable=True)
    fee_min = Column(Integer, nullable=True)  # RM
    fee_max = Column(Integer, nullable=True)  # RM
    categories_json = Column(Text, default="[]")  # [{label, distance_km, fee, slots_state}]
    bib_pickup_info = Column(Text, nullable=True)
    gpx_url = Column(String, nullable=True)
    organizer_url = Column(String, nullable=True)

    # Recap-only fields (auto-displayed when computed_status=Past)
    participant_count = Column(Integer, nullable=True)
    weather_temp_c = Column(Integer, nullable=True)
    winners_json = Column(Text, default="[]")  # [{category, name, time, gender}]
    recap_summary = Column(Text, nullable=True)  # AI-generated paragraph

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    assignments = relationship("Assignment", back_populates="event", cascade="all, delete-orphan")
    
    @property
    def computed_status(self):
        """Dynamically compute event status based on date.
        Explicit 'Cancelled' status is always honoured — never overridden by date.
        """
        if not self.date:
            return self.status
        
        # If the admin explicitly set this to Cancelled, respect it regardless of date
        if self.status == 'Cancelled':
            return 'Cancelled'
        
        try:
            # Get today's date at midnight for comparison
            today = datetime.utcnow().date()
            
            # Safely convert to date
            if isinstance(self.date, datetime):
                event_date = self.date.date()
            else:
                event_date = self.date
            
            if event_date > today:
                return "Upcoming"
            elif event_date == today:
                return "Recent"
            else:  # event_date < today
                return "Past"
        except Exception as e:
            # If any error, just return the stored status
            print(f"Error computing status for event {self.name}: {e}")
            return self.status

class Photographer(Base):
    __tablename__ = "photographers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    brand = Column(String)
    bio = Column(Text)
    logo_url = Column(String, nullable=True)
    website_url = Column(String, nullable=True)
    instagram_url = Column(String, nullable=True)
    facebook_url = Column(String, nullable=True)
    x_url = Column(String, nullable=True)
    coverage_areas_json = Column(String, default="[]") # JSON string of areas
    is_public = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    assignments = relationship("Assignment", back_populates="photographer")

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), index=True)
    photographer_id = Column(Integer, ForeignKey("photographers.id"), index=True)
    km_coverage_json = Column(String) # JSON list of KMs covered
    gallery_url = Column(String)
    note = Column(String, nullable=True)
    is_pinned = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Face-search integration (Photohawk gallery resolver).
    # Lazily populated the first time someone runs a face-search on the
    # event — we don't pre-resolve every gallery_url because some galleries
    # are slow to fetch and most assignments never get face-searched.
    engine_guid = Column(String, nullable=True, index=True)
    tenant_guid = Column(String, nullable=True)
    cover_guid = Column(String, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    # Photo count from the source gallery (Photohawk noItems, GeoSnapShot
    # albums sum, or generic HTML probe for custom platforms). Used to
    # distinguish "engine ran, 0 hits" between:
    #   - photographer hasn't uploaded yet (count = 0) → INDEXING
    #   - photographer uploaded but runner not in any photo → NO_MATCH
    # Refreshed on a soft TTL (gallery_checked_at) so live searches
    # don't hammer source galleries on every request.
    gallery_photo_count = Column(Integer, nullable=True)
    gallery_checked_at = Column(DateTime, nullable=True)

    event = relationship("Event", back_populates="assignments")
    photographer = relationship("Photographer", back_populates="assignments")

class PageView(Base):
    __tablename__ = "page_views"

    id = Column(Integer, primary_key=True, index=True)
    path = Column(String, index=True)
    entity_type = Column(String, index=True) # 'home', 'event', 'photographer', 'other'
    entity_id = Column(Integer, nullable=True, index=True)
    event_id = Column(Integer, nullable=True, index=True) # Context: Which event was this associated with?
    ip_hash = Column(String, nullable=True) # Anonymized IP
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    user_agent = Column(String, nullable=True)


class SiteSetting(Base):
    __tablename__ = "site_settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class FaceEmbedding(Base):
    """One row per face detected in a photo.

    A single photo can have many faces (avg ~12 in marathon shots), so
    photo_id is NOT unique — each face gets its own row. Embedding is
    stored as raw float32 bytes (insightface default = 512 dims = 2048
    bytes per vector). For ~4K photos * 12 faces ≈ 48K rows ≈ 100MB
    embeddings — comfortable for SQLite brute-force scan at search time.

    Source platforms (workonfaith / rkshoots / mh) are kept as a free
    text label so we can filter by source or display "found on X"
    without joining back to assignments. event_id and photographer_id
    are nullable: ingestion script may not always know the photographer
    for scraped/external sources, but should always know the event.
    """

    __tablename__ = "face_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    # Stable photo identifier from the source platform (URL, gallery
    # photo guid, file hash — whatever the ingest script can produce
    # consistently so re-running ingest is idempotent).
    photo_id = Column(String, index=True, nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), index=True, nullable=True)
    photographer_id = Column(Integer, ForeignKey("photographers.id"), index=True, nullable=True)
    # 'mh' | 'workonfaith' | 'rkshoots' | 'external'
    source = Column(String, index=True, nullable=False, default="mh")
    # Where to send the runner to view/buy this photo on the source platform.
    source_url = Column(String, nullable=False)
    # Optional preview image (small thumbnail URL) the search UI can render
    # without hitting the source platform on every result.
    thumbnail_url = Column(String, nullable=True)
    # Float32 embedding bytes (insightface buffalo_l = 512 dims).
    embedding = Column(LargeBinary, nullable=False)
    embedding_dim = Column(Integer, nullable=False, default=512)
    # Bbox in pixels: x, y, w, h — useful for highlighting the matched
    # face on the photo or debugging false positives.
    bbox_x = Column(Integer, nullable=True)
    bbox_y = Column(Integer, nullable=True)
    bbox_w = Column(Integer, nullable=True)
    bbox_h = Column(Integer, nullable=True)
    # Detection confidence (0..1) — lets us drop low-quality crops before
    # comparing, or surface "blurry face — match uncertain" warnings.
    det_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        # Idempotency for re-runs: same photo+source can be re-ingested
        # without dupes, but we keep one row PER FACE so the unique key
        # also covers bbox origin (a 1-px shift = different detection).
        Index("ix_face_photo_source", "photo_id", "source"),
    )


# ---------------------------------------------------------------------------
# Strava-style submissions + ranking + promo codes (MVP viral loop)
# ---------------------------------------------------------------------------
# Flow: runner submits (URL or screenshot) -> admin verifies + keys in stats
#       -> system auto-ranks + cross-refs MarathonHub event -> eligible
#       runners get a promo code for ohmaishoot.com photo purchases.
# ---------------------------------------------------------------------------

class Runner(Base):
    """A person who has submitted at least one activity.

    We don't require login for MVP — runner is keyed by email + display name.
    Email is used to merge duplicate submissions (same runner submits twice)
    and to deliver the promo code.
    """
    __tablename__ = "runners"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    email = Column(String, index=True, nullable=False)
    instagram_handle = Column(String, nullable=True)
    strava_handle = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    submissions = relationship("Submission", back_populates="runner", cascade="all, delete-orphan")
    promo_codes = relationship("PromoCode", back_populates="runner", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_runners_email_name", "email", "name"),
    )


class Submission(Base):
    """One runner activity awaiting (or after) admin verification.

    Two evidence types:
      - 'url'      -> strava_url holds the activity link
      - 'screenshot' -> screenshot_path holds server-relative upload path

    Stats (distance_km, time_seconds, elevation_gain_m, activity_date) are
    keyed in by the admin after viewing the evidence. The runner's pace is
    derived at approve time.

    event_id is filled by either:
      - admin manually mapping it to a MarathonHub event
      - cross-ref logic matching activity_date ± 1 day against events.date
        with fuzzy location match (future enhancement)
    """
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    runner_id = Column(Integer, ForeignKey("runners.id"), index=True, nullable=False)

    # Evidence
    submission_type = Column(String, nullable=False)  # 'url' | 'screenshot'
    strava_url = Column(String, nullable=True)
    screenshot_path = Column(String, nullable=True)  # server-relative /api/uploads/xxx.png

    # Admin-entered activity stats (None until verified)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=True, index=True)
    activity_date = Column(DateTime, nullable=True, index=True)
    activity_location = Column(String, nullable=True)  # free text from admin
    distance_km = Column(Float, nullable=True)
    time_seconds = Column(Integer, nullable=True)
    elevation_gain_m = Column(Integer, nullable=True)

    # Lifecycle
    status = Column(String, default="pending", index=True)  # pending|approved|rejected
    admin_notes = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow, index=True)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("admins.id"), nullable=True)

    runner = relationship("Runner", back_populates="submissions")
    event = relationship("Event")
    reviewer = relationship("Admin", foreign_keys=[reviewed_by])
    promo_code = relationship("PromoCode", uselist=False, back_populates="submission")


class PromoCode(Base):
    """Auto-issued code for a verified runner.

    Format: RUN-<event_short>-<rank:02d>-<rand4>
    Example: RUN-MY01-03-X7K2  (3rd place at event id 1)

    Discount + expiry + max_uses are configurable from SiteSetting (admin UI
    can edit later). For MVP we read defaults from env or hardcode reasonable
    values: 15% off, 30 days expiry, single use.
    """
    __tablename__ = "promo_codes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    runner_id = Column(Integer, ForeignKey("runners.id"), index=True, nullable=False)
    submission_id = Column(Integer, ForeignKey("submissions.id"), index=True, nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), index=True, nullable=True)

    discount_pct = Column(Integer, default=15)  # percent off
    expires_at = Column(DateTime, nullable=False)
    max_uses = Column(Integer, default=1)
    used_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    runner = relationship("Runner", back_populates="promo_codes")
    submission = relationship("Submission", back_populates="promo_code")
    event = relationship("Event")
