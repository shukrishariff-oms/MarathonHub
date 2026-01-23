# Stage 1: Build Frontend
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Setup Backend & Serve Frontend
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./

# Copy built frontend from Stage 1
COPY --from=frontend-build /app/frontend/dist ./static

# Create storage directory (This should be mapped to a volume in Coolify)
RUN mkdir -p /app/storage/uploads

# Set environment variables
ENV PORT=8000

# Start server
# We use static file serving for the frontend in production
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
