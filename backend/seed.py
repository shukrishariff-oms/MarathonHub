from database import SessionLocal, engine
import models, schemas, crud
from datetime import datetime, timedelta
import json

db = SessionLocal()

def seed():
    # Create tables
    models.Base.metadata.create_all(bind=engine)

    # 1. Create Admin
    admin = crud.get_admin_by_username(db, "admin")
    if not admin:
        print("Creating admin user...")
        crud.create_admin(db, schemas.AdminLogin(username="admin", password="admin123"))
    else:
        print("Admin user already exists.")

    # 2. Derive data for check (simplification)
    # existing_events = db.query(models.Event).count()
    # if existing_events > 0:
    #     print("Data likely already seeded. Skipping.")
    #     return

    print("Seeding sample data...")

    # Events
    # events_data = [ ... ] # Commented out to avoid duplicates
    # events_objs = []
    # ...

    # Instead of creating new KLSCM/Penang, let's just create Twincity if it doesn't exist
    
    # Twincity Marathon (Past)
    twincity_event = db.query(models.Event).filter(models.Event.name == "Twincity Marathon 2024").first()
    if not twincity_event:
        twincity_event = models.Event(
            name="Twincity Marathon 2024",
            date=datetime(2024, 5, 26),
            location="Cyberjaya",
            organizer="Ten Senses",
            description="The race that connects two cities, Cyberjaya and Putrajaya.",
            distances_json=json.dumps(["Full Marathon", "Half Marathon", "12KM", "5KM"]),
            status="Past"
        )
        db.add(twincity_event)
        db.commit()
    
    # Fetch ActionPix (assumed ID 1 or name "ActionPix")
    action_pix = db.query(models.Photographer).filter(models.Photographer.name == "ActionPix").first()

    # New Photographers
    new_photogs = [
        {
            "name": "Cikgu Fitness",
            "brand": "Cikgu Fitness",
            "bio": "Fitness enthusiast and photographer.",
            "facebook_url": "https://fb.com/cikgufitness",
            "coverage_areas_json": json.dumps(["Kuala Lumpur", "Cyberjaya"])
        },
        {
            "name": "Mong Cha Cha",
            "brand": "Mong Cha Cha",
            "bio": "Capturing the spirit of running.",
            "facebook_url": "https://fb.com/mongchachaphotography",
            "coverage_areas_json": json.dumps(["Nationwide"])
        },
        {
            "name": "RunPix",
            "brand": "RunPix",
            "bio": "Professional running photos.",
            "website_url": "https://runpix.com",
            "coverage_areas_json": json.dumps(["Klang Valley"])
        },
        {
            "name": "Kakiralensa",
            "brand": "Kakiralensa",
            "bio": "Lensa untuk pelari.",
            "facebook_url": "https://fb.com/kakiralensa",
            "coverage_areas_json": json.dumps(["Putrajaya", "Cyberjaya"])
        }
    ]

    new_photog_objs = []
    for p_data in new_photogs:
        # Check if exists
        p = db.query(models.Photographer).filter(models.Photographer.name == p_data["name"]).first()
        if not p:
            photog = models.Photographer(**p_data)
            db.add(photog)
            db.commit() # Commit to get ID
            new_photog_objs.append(photog)
        else:
            new_photog_objs.append(p)

    # Twincity Assignments
    # We need to be careful not to double add assignments if they exist.
    # Simple check: count coverage for this event?
    existing_assignments = db.query(models.Assignment).filter(models.Assignment.event_id == twincity_event.id).count()
    
    if existing_assignments == 0:
        db.add(models.Assignment(
            event_id=twincity_event.id,
            photographer_id=new_photog_objs[0].id, # Cikgu
            km_coverage_json=json.dumps(["KM30", "Bomba Hill"]),
            gallery_url="https://cikgufitness.example/twincity2024"
        ))
        db.add(models.Assignment(
            event_id=twincity_event.id,
            photographer_id=new_photog_objs[1].id, # Mong
            km_coverage_json=json.dumps(["Start Line", "KM10"]),
            gallery_url="https://mongchacha.example/twincity2024"
        ))
        db.add(models.Assignment(
            event_id=twincity_event.id,
            photographer_id=new_photog_objs[2].id, # RunPix
            km_coverage_json=json.dumps(["Finish Line"]),
            gallery_url="https://runpix.example/twincity2024"
        ))
        db.add(models.Assignment(
            event_id=twincity_event.id,
            photographer_id=new_photog_objs[3].id, # Kakira
            km_coverage_json=json.dumps(["Dataran Gemilang"]),
            gallery_url="https://kakiralensa.example/twincity2024"
        ))
        if action_pix:
            db.add(models.Assignment(
                event_id=twincity_event.id,
                photographer_id=action_pix.id, 
                km_coverage_json=json.dumps(["KM42"]),
                gallery_url="https://actionpix.example/twincity2024"
            ))

    db.commit()
    print("Seed complete.")
    return # Exit after new seed
    
    # Original code commented out below...

    db.commit()
    print("Seed complete.")

if __name__ == "__main__":
    seed()
