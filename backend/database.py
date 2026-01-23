from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Handle DB path carefully for Docker/Local environments
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Priority 1: DATABASE_URL ENV
# Priority 2: Check if ../storage exists (Local dev)
# Priority 3: Use ./storage in current directory (Docker flattened)
DB_URL_PATH = os.getenv("DATABASE_URL_PATH")

if not DB_URL_PATH:
    local_storage = os.path.join(BASE_DIR, "..", "storage")
    if os.path.exists(local_storage):
        DB_URL_PATH = os.path.join(local_storage, "larianhub.db")
    else:
        DB_URL_PATH = os.path.join(BASE_DIR, "storage", "larianhub.db")

# Ensure the directory exists before SQLAlchemy tries to connect
db_dir = os.path.dirname(DB_URL_PATH)
if not os.path.exists(db_dir):
    os.makedirs(db_dir, exist_ok=True)

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_URL_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
