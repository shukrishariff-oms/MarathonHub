from database import SessionLocal
import models

db = SessionLocal()

# Find and delete invalid assignments (where photographer_id is None or photographer doesn't exist)
invalid_assignments = db.query(models.Assignment).filter(
    models.Assignment.photographer_id == None
).all()

print(f"Found {len(invalid_assignments)} invalid assignments with NULL photographer_id")

for assignment in invalid_assignments:
    print(f"Deleting assignment ID {assignment.id} (event_id: {assignment.event_id})")
    db.delete(assignment)

db.commit()
print("Cleanup complete!")
db.close()
