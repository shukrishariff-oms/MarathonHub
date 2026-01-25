import sqlite3
import os

try:
    # Handle DB path
    db_path = "storage/larianhub.db"
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check page_views columns
    cursor.execute("PRAGMA table_info(page_views)")
    columns = [row[1] for row in cursor.fetchall()]
    
    print(f"Columns in page_views: {columns}")
    
    if "event_id" not in columns:
        print("MISSING event_id! Running fix...")
        cursor.execute("ALTER TABLE page_views ADD COLUMN event_id INTEGER")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_page_views_event_id ON page_views (event_id)")
        conn.commit()
        print("Fix applied: Added event_id column.")
    else:
        print("event_id column already exists.")

except Exception as e:
    print(f"Error: {e}")
