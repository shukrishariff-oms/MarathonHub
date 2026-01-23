import shutil
import os
from datetime import datetime
import sqlite3

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SOURCE_DB = os.path.join(BASE_DIR, "storage", "larianhub.db")
BACKUP_DIR = os.path.join(BASE_DIR, "storage", "backups")

def create_backup():
    # 1. Ensure backup directory exists
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
        print(f"Created backup directory: {BACKUP_DIR}")

    # 2. Generate backup filename with timestamp
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    backup_filename = f"larianhub_backup_{timestamp}.db"
    destination_path = os.path.join(BACKUP_DIR, backup_filename)

    # 3. Perform backup
    try:
        # We use sqlite3 to perform a proper backup (to handle any active transactions)
        # although shutil.copy2 works if the DB is not being written to.
        # sqlite3 vacuum/backup is safer.
        
        print(f"Starting backup from {SOURCE_DB} to {destination_path}...")
        
        src_conn = sqlite3.connect(SOURCE_DB)
        dst_conn = sqlite3.connect(destination_path)
        
        with dst_conn:
            src_conn.backup(dst_conn)
            
        dst_conn.close()
        src_conn.close()
        
        print(f"SUCCESS: Backup successful: {backup_filename}")
        
        # 4. Optional: Clean up old backups (keep only last 7 days)
        clean_old_backups(7)
        
    except Exception as e:
        print(f"ERROR: Backup failed: {str(e)}")

def clean_old_backups(days_to_keep):
    print(f"Cleaning up backups older than {days_to_keep} days...")
    now = datetime.now()
    backups = [f for f in os.listdir(BACKUP_DIR) if f.startswith("larianhub_backup_")]
    
    for backup in backups:
        file_path = os.path.join(BACKUP_DIR, backup)
        file_age_days = (now - datetime.fromtimestamp(os.path.getmtime(file_path))).days
        
        if file_age_days > days_to_keep:
            os.remove(file_path)
            print(f"Removed old backup: {backup}")

if __name__ == "__main__":
    create_backup()
