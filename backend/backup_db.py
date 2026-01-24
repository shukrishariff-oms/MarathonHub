import os
import shutil
from datetime import datetime, timedelta
import sqlite3

# Configuration
DB_PATH = "/app/storage/larianhub.db"
BACKUP_DIR = "/app/storage/backups"
DAYS_TO_KEEP = 7

def create_backup():
    # Create backup directory if it doesn't exist
    os.makedirs(BACKUP_DIR, exist_ok=True)
    
    # Check if database exists
    if not os.path.exists(DB_PATH):
        print(f"ERROR: Database file not found at {DB_PATH}")
        return False
    
    # Generate timestamp and backup filename
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    backup_file = f"larianhub_backup_{timestamp}.db"
    backup_path = os.path.join(BACKUP_DIR, backup_file)
    
    # Create backup using sqlite3 backup API
    print(f"Starting backup at {datetime.now()}")
    try:
        # Connect to source database
        src_conn = sqlite3.connect(DB_PATH)
        dst_conn = sqlite3.connect(backup_path)
        
        # Perform backup
        with dst_conn:
            src_conn.backup(dst_conn)
        
        # Close connections
        dst_conn.close()
        src_conn.close()
        
        # Get backup file size
        backup_size = os.path.getsize(backup_path)
        backup_size_kb = backup_size / 1024
        
        print(f"SUCCESS: Backup created: {backup_file}")
        print(f"Backup size: {backup_size_kb:.1f}K")
        
    except Exception as e:
        print(f"ERROR: Backup failed: {str(e)}")
        return False
    
    # Clean up old backups
    print(f"Cleaning up old backups (keeping last {DAYS_TO_KEEP} days)...")
    cutoff_date = datetime.now() - timedelta(days=DAYS_TO_KEEP)
    
    for filename in os.listdir(BACKUP_DIR):
        if filename.startswith("larianhub_backup_") and filename.endswith(".db"):
            file_path = os.path.join(BACKUP_DIR, filename)
            file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path))
            
            if file_mtime < cutoff_date:
                os.remove(file_path)
                print(f"Removed old backup: {filename}")
    
    # List remaining backups
    print("\nCurrent backups:")
    backups = []
    for filename in os.listdir(BACKUP_DIR):
        if filename.startswith("larianhub_backup_") and filename.endswith(".db"):
            file_path = os.path.join(BACKUP_DIR, filename)
            file_size = os.path.getsize(file_path) / 1024
            file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path))
            backups.append((filename, file_size, file_mtime))
    
    # Sort by modification time (newest first)
    backups.sort(key=lambda x: x[2], reverse=True)
    
    for filename, size, mtime in backups:
        print(f"  {filename} - {size:.1f}KB - {mtime.strftime('%Y-%m-%d %H:%M:%S')}")
    
    print(f"\nBackup completed at {datetime.now()}")
    return True

if __name__ == "__main__":
    success = create_backup()
    exit(0 if success else 1)
