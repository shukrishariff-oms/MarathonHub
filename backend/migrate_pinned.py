import sqlite3
import os

# Try to find the database
db_paths = [
    "storage/larianhub.db",
    "../storage/larianhub.db",
    "j:/LarianHub/storage/larianhub.db"
]

db_path = None
for path in db_paths:
    if os.path.exists(path):
        db_path = path
        break

if not db_path:
    print("Database not found!")
    exit(1)

print(f"Migrating database at: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if column exists
    cursor.execute("PRAGMA table_info(assignments)")
    columns = [info[1] for info in cursor.fetchall()]
    
    if "is_pinned" not in columns:
        print("Adding is_pinned column...")
        cursor.execute("ALTER TABLE assignments ADD COLUMN is_pinned BOOLEAN DEFAULT 0 NOT NULL")
        conn.commit()
        print("Migration successful!")
    else:
        print("Column is_pinned already exists.")
        
    conn.close()
except Exception as e:
    print(f"Error during migration: {e}")
    exit(1)
