FROM python:3.11-slim

# Install system dependencies (FFmpeg, OpenCV libGL, networking tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsm6 \
    libxext6 \
    libgl1 \
    libglib2.0-0 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY engine/requirements.txt /app/engine/requirements.txt
RUN pip install --no-cache-dir -r /app/engine/requirements.txt

# Copy engine code
COPY engine/ /app/engine/

# Expose HTTP/WS port
EXPOSE 8080

CMD ["python", "engine/main.py"]
