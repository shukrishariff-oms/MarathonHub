import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Path to db
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "storage", "larianhub.db"))
SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_path}"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))
from models import Photographer, Event, Assignment

db = SessionLocal()

# Check if it already exists
if not db.query(Photographer).filter(Photographer.name == "Independent Photographers").first():
    # Insert photographer
    new_photographer = Photographer(
        name="Independent Photographers",
        brand="Independent",
        bio="We are a collective of independent visual artists capturing the essence and emotion of every stride. Focused on high-quality, authentic storytelling through our lenses.",
        # Base64 generic red aperture logo as temporary placeholder
        logo_url="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4gIDxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjY2MyOTJiIi8+ICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI4Ii8+ICA8cGF0aCBkPSJNMjggMjhMODAgODAweiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI4IiAvPiAgPHBhdGggZD0iTTI4IDcyTDcwIDIyeiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI4IiAvPjwvc3ZnPg==",
        website_url="https://independentphotographers.com",
        instagram_url="https://instagram.com/independentphotographers",
        coverage_areas_json='["Kuala Lumpur", "Selangor", "Putrajaya"]'
    )
    db.add(new_photographer)
    db.commit()
    db.refresh(new_photographer)
    
    # Check if there's an event
    event = db.query(Event).first()
    if event:
        # Assign this photographer to that event
        assignment = Assignment(
            event_id=event.id,
            photographer_id=new_photographer.id,
            km_coverage_json='["Start Line", "KM 10", "Finish Line"]',
            gallery_url="https://google.com/"
        )
        db.add(assignment)
        db.commit()

    print("Success: Added Independent Photographers")
else:
    print("Already exists")

db.close()
