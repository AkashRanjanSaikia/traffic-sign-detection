# Step 1: Build React frontend
FROM node:18 AS frontend-builder
WORKDIR /app/frontend

# Copy frontend files (including package.json, vite.config.js, etc.)
COPY frontend/ ./

# Install deps and build
RUN npm install && npm run build

# Step 2: Setup Python backend
FROM python:3.10-slim
WORKDIR /app

# Install system dependencies (for OpenCV, Pillow, etc.)
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
 && rm -rf /var/lib/apt/lists/*

# Copy Python requirements
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy YOLO model
COPY backend/model/ ./backend/model/

# Copy built frontend
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Expose port
EXPOSE 7860

# Run FastAPI with uvicorn
CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "7860"]
