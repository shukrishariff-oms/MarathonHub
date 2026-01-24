#!/bin/bash
# MarathonHub Database Backup Script
# This script creates timestamped backups and keeps only the last 7 days

# Configuration
DB_PATH="/app/storage/larianhub.db"
BACKUP_DIR="/app/storage/backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="larianhub_backup_${TIMESTAMP}.db"
DAYS_TO_KEEP=7

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

# Check if database exists
if [ ! -f "${DB_PATH}" ]; then
    echo "ERROR: Database file not found at ${DB_PATH}"
    exit 1
fi

# Create backup using SQLite backup command (safer than cp)
echo "Starting backup at $(date)"
sqlite3 ${DB_PATH} ".backup '${BACKUP_DIR}/${BACKUP_FILE}'"

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "SUCCESS: Backup created: ${BACKUP_FILE}"
    
    # Get backup file size
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
    echo "Backup size: ${BACKUP_SIZE}"
else
    echo "ERROR: Backup failed!"
    exit 1
fi

# Clean up old backups (keep only last 7 days)
echo "Cleaning up old backups (keeping last ${DAYS_TO_KEEP} days)..."
find ${BACKUP_DIR} -name "larianhub_backup_*.db" -type f -mtime +${DAYS_TO_KEEP} -delete

# List remaining backups
echo "Current backups:"
ls -lh ${BACKUP_DIR}/larianhub_backup_*.db 2>/dev/null | awk '{print $9, $5, $6, $7, $8}'

echo "Backup completed at $(date)"
