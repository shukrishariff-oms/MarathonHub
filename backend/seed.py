from database import SessionLocal, engine
import models, schemas, crud
from datetime import datetime
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

    print("Seeding events data...")
    
    # All 14 events from production
    events_data = [
        {
            "name": "KL Standard Chartered Marathon 2025",
            "date": datetime(2026, 3, 24),
            "location": "Dataran Merdeka, KL",
            "organizer": "Dirigo Events",
            "description": "The biggest marathon in Malaysia.",
            "distances_json": json.dumps(["Full Marathon", "Half Marathon", "10KM", "5KM"]),
            "status": "Upcoming",
            "is_highlight": False,
        },
        {
            "name": "Penang Bridge International Marathon 2025",
            "date": datetime(2026, 5, 23),
            "location": "Penang Bridge",
            "organizer": "Penang Tourism",
            "description": "Run across the iconic bridge.",
            "distances_json": json.dumps(["Full Marathon", "Half Marathon", "10KM"]),
            "status": "Upcoming",
            "is_highlight": True,
        },
        {
            "name": "Putrajaya Night Run 2024",
            "date": datetime(2025, 12, 24),
            "location": "Putrajaya",
            "organizer": "Running Project",
            "description": "Night run in the federal administrative centre.",
            "distances_json": json.dumps(["15KM", "10KM", "5KM"]),
            "status": "Past",
            "is_highlight": False,
        },
        {
            "name": "Twincity Marathon 2026",
            "date": datetime(2026, 1, 16),
            "location": "Cyberjaya",
            "organizer": "Ten Senses",
            "description": "The race that connects two cities, Cyberjaya and Putrajaya.",
            "distances_json": json.dumps(["Full Marathon","Half Marathon","12KM","5KM"]),
            "status": "Past",
            "is_highlight": False,
        },
        {
            "name": "Standard Chartered KL Marathon 2026",
            "date": datetime(2026, 3, 15),
            "location": "Kuala Lumpur",
            "organizer": "Standard Chartered",
            "description": "Malaysia's premier international marathon featuring 42KM, 21KM, and 10KM categories through the heart of KL.",
            "distances_json": json.dumps(["42KM", "21KM", "10KM"]),
            "status": "Upcoming",
            "is_highlight": False,
            "cover_image_url": "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=1200",
        },
        {
            "name": "Penang Bridge International Marathon 2026",
            "date": datetime(2026, 11, 23),
            "location": "Penang",
            "organizer": "Penang State Government",
            "description": "Run across the iconic Penang Bridge! Southeast Asia's longest bridge marathon with stunning ocean views.",
            "distances_json": json.dumps(["42KM", "21KM", "10KM"]),
            "status": "Upcoming",
            "is_highlight": False,
        },
        {
            "name": "Borneo International Marathon 2026",
            "date": datetime(2026, 5, 10),
            "location": "Kota Kinabalu, Sabah",
            "organizer": "Sabah Tourism Board",
            "description": "Experience running in one of the world's most beautiful cities with Mount Kinabalu as your backdrop.",
            "distances_json": json.dumps(["42KM", "21KM", "10KM", "5KM"]),
            "status": "Upcoming",
            "is_highlight": True,
        },
        {
            "name": "Kuching Marathon 2026",
            "date": datetime(2026, 8, 23),
            "location": "Kuching, Sarawak",
            "organizer": "Sarawak Sports Council",
            "description": "Run through the Cat City! A scenic marathon along the Sarawak River featuring 42KM, 21KM, and 10KM.",
            "distances_json": json.dumps(["42KM", "21KM", "10KM"]),
            "status": "Upcoming",
            "is_highlight": False,
            "cover_image_url": "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=1200",
        },
        {
            "name": "Langkawi International Marathon 2026",
            "date": datetime(2026, 10, 11),
            "location": "Langkawi, Kedah",
            "organizer": "Langkawi Development Authority",
            "description": "Run in paradise! A tropical island marathon with beach views and UNESCO Geopark scenery.",
            "distances_json": json.dumps(["42KM", "21KM", "10KM"]),
            "status": "Upcoming",
            "is_highlight": False,
            "cover_image_url": "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=1200",
        },
        {
            "name": "Putrajaya Night Marathon 2026",
            "date": datetime(2026, 4, 12),
            "location": "Putrajaya",
            "organizer": "Putrajaya Corporation",
            "description": "Malaysia's premier night run! Experience the beautifully lit federal administrative capital after dark.",
            "distances_json": json.dumps(["42KM", "21KM", "10KM", "5KM"]),
            "status": "Upcoming",
            "is_highlight": False,
        },
        {
            "name": "Malakka River Marathon 2026",
            "date": datetime(2026, 6, 14),
            "location": "Melaka",
            "organizer": "Melaka Sports Council",
            "description": "Run through UNESCO World Heritage sites! A historic marathon in the culturally rich city of Melaka.",
            "distances_json": json.dumps(["42KM", "21KM", "10KM"]),
            "status": "Upcoming",
            "is_highlight": True,
            "cover_image_url": "https://images.unsplash.com/photo-1483691278019-cb7253bee49f?w=1200",
        },
        {
            "name": "Ipoh Eco Run 2026",
            "date": datetime(2026, 7, 19),
            "location": "Ipoh, Perak",
            "organizer": "Ipoh City Council",
            "description": "Experience limestone hills and heritage buildings! A scenic run through Malaysia's foodie capital.",
            "distances_json": json.dumps(["21KM", "10KM", "5KM"]),
            "status": "Upcoming",
            "is_highlight": False,
            "cover_image_url": "https://images.unsplash.com/photo-1472224371017-08207f84aaae?w=1200",
        },
        {
            "name": "Cyberjaya Tech Run 2026",
            "date": datetime(2026, 9, 20),
            "location": "Cyberjaya, Selangor",
            "organizer": "Cyberview Sdn Bhd",
            "description": "Malaysia's tech city marathon featuring smart runner tracking and digital race experience.",
            "distances_json": json.dumps(["21KM", "10KM", "5KM"]),
            "status": "Upcoming",
            "is_highlight": False,
            "cover_image_url": "https://images.unsplash.com/photo-1486218119243-13883505764c?w=1200",
        },
        {
            "name": "Sandakan Trail Run 2026",
            "date": datetime(2026, 12, 6),
            "location": "Sandakan, Sabah",
            "organizer": "Sabah Trail Runners",
            "description": "Adventure through rainforest trails! A challenging trail marathon in Borneo's wildlife capital.",
            "distances_json": json.dumps(["21KM", "12KM", "5KM"]),
            "status": "Upcoming",
            "is_highlight": False,
            "cover_image_url": "https://images.unsplash.com/photo-1551632811-561732d1e306?w=1200",
        },
    ]

    # Create events (SAFE - checks if exists first)
    created_count = 0
    skipped_count = 0
    
    for event_data in events_data:
        existing = db.query(models.Event).filter(models.Event.name == event_data["name"]).first()
        
        if not existing:
            event = models.Event(**event_data)
            db.add(event)
            created_count += 1
            print(f"✓ Created: {event_data['name']}")
        else:
            skipped_count += 1
            print(f"- Skipped (exists): {event_data['name']}")
    
    db.commit()
    print(f"\nSummary: {created_count} events created, {skipped_count} events skipped (already exist)")
    print("Seed complete.")

if __name__ == "__main__":
    seed()
