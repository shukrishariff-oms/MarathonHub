# LarianHub (Phase 1)

Localhost-only web app for managing running events and photographers.

## Prerequisites
- Python 3.8+
- Node.js 16+

## Setup & Run

### 1. Backend

```bash
cd backend
# Create virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn main:app --reload
```
API Documentation: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
# Install dependencies
npm install

# Run dev server
npm run dev
```
App URL: http://localhost:5173

## Admin
The seed script creates a default admin:
- Username: `admin`
- Password: `admin123`

## Directory Structure
- `backend/`: FastAPI application
- `frontend/`: React + Vite application
- `storage/`: SQLite database file
