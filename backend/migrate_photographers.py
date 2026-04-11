import os
import sqlite3

# Get the absolute path to the database
# Based on database.py logic, it could be in ./storage/larianhub.db or ../storage/larianhub.db
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
docker_storage = os.path.join(BASE_DIR, "storage")
local_storage = os.path.join(BASE_DIR, "..", "storage")

if os.path.exists(os.path.join(docker_storage, "larianhub.db")) or not os.path.exists(local_storage):
    db_path = os.path.join(docker_storage, "larianhub.db")
else:
    db_path = os.path.join(local_storage, "larianhub.db")

print(f"Connecting to database at {db_path}")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE photographers ADD COLUMN is_public BOOLEAN DEFAULT 1;")
    print("Added is_public column to photographers table.")
except sqlite3.OperationalError as e:
    print(f"is_public column may already exist: {e}")

try:
    cursor.execute("ALTER TABLE photographers ADD COLUMN display_order INTEGER DEFAULT 0;")
    print("Added display_order column to photographers table.")
except sqlite3.OperationalError as e:
    print(f"display_order column may already exist: {e}")

conn.commit()
conn.close()
print("Migration completed successfully.")
