from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
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
    date = Column(DateTime, index=True)
    location = Column(String)
    organizer = Column(String)
    description = Column(Text)
    distances_json = Column(String)  # JSON string of distances list
    status = Column(String, default="Upcoming") # Upcoming, Past
    is_highlight = Column(Boolean, default=False)
    cover_image_url = Column(String, nullable=True)
    highlight_images_json = Column(Text, default="[]") # JSON list of image URLs
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    assignments = relationship("Assignment", back_populates="event", cascade="all, delete-orphan")
    
    @property
    def computed_status(self):
        """Dynamically compute event status based on date"""
        if not self.date:
            return self.status
        
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

    event = relationship("Event", back_populates="assignments")
    photographer = relationship("Photographer", back_populates="assignments")
