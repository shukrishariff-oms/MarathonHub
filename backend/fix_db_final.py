import sqlite3
import os

db_path = "storage/larianhub.db"
print(f"Connecting to {db_path}...")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Check if page_views table exists
    cursor.execute("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='page_views'")
    exists = cursor.fetchone()[0]

    if exists == 0:
        print("Table 'page_views' MISSING. Creating it now...")
        cursor.execute("""
            CREATE TABLE page_views (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path VARCHAR,
                entity_type VARCHAR,
                entity_id INTEGER,
                ip_hash VARCHAR,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                user_agent VARCHAR,
                event_id INTEGER
            )
        """)
        # Create indices
        cursor.execute("CREATE INDEX ix_page_views_path ON page_views (path)")
        cursor.execute("CREATE INDEX ix_page_views_entity_type ON page_views (entity_type)")
        cursor.execute("CREATE INDEX ix_page_views_entity_id ON page_views (entity_id)")
        cursor.execute("CREATE INDEX ix_page_views_timestamp ON page_views (timestamp)")
        cursor.execute("CREATE INDEX ix_page_views_event_id ON page_views (event_id)")
        conn.commit()
        print("Table 'page_views' created successfully!")
    else:
        print("Table 'page_views' EXISTS. Checking for event_id column...")
        cursor.execute("PRAGMA table_info(page_views)")
        cols = [row[1] for row in cursor.fetchall()]
        if "event_id" not in cols:
            print("Column 'event_id' MISSING. Adding it...")
            cursor.execute("ALTER TABLE page_views ADD COLUMN event_id INTEGER")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_page_views_event_id ON page_views (event_id)")
            conn.commit()
            print("Column 'event_id' added!")
        else:
            print("Column 'event_id' already exists.")

    conn.close()
    print("DB Check Complete.")

except Exception as e:
    print(f"CRITICAL ERROR: {e}")
