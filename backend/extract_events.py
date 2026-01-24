from database import SessionLocal
from models import Event
import json

db = SessionLocal()

events = db.query(Event).all()

print("events_data = [")
for e in events:
    print("    {")
    print(f'        "name": "{e.name}",')
    print(f'        "date": datetime({e.date.year}, {e.date.month}, {e.date.day}),')
    print(f'        "location": "{e.location}",')
    print(f'        "organizer": "{e.organizer}",')
    print(f'        "description": """{e.description or ""}""",')
    print(f'        "distances_json": """{e.distances_json}""",')
    print(f'        "status": "{e.status}",')
    print(f'        "is_highlight": {e.is_highlight},')
    cover_url = f'"{e.cover_image_url}"' if e.cover_image_url else "None"
    print(f'        "cover_image_url": {cover_url},')
    print(f'        "highlight_images_json": """{e.highlight_images_json or "[]"}""",')
    print("    },")
print("]")

db.close()
