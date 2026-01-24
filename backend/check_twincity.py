from database import SessionLocal
from models import Assignment, Event

db = SessionLocal()

# Find Twincity 2026
event = db.query(Event).filter(
    Event.name.contains('Twincity')
).filter(
    Event.date.astype(str).startswith('2026')
).first()

if event:
    print(f'Event: {event.name}')
    print(f'Event ID: {event.id}')
    
    assignments = db.query(Assignment).filter(
        Assignment.event_id == event.id
    ).all()
    
    print(f'\nTotal assignments: {len(assignments)}')
    print('\nAssignments:')
    for a in assignments:
        print(f'  - ID {a.id}: photographer_id={a.photographer_id}')
else:
    print('Twincity 2026 event not found')

db.close()
