FROM python:3.11-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    OPENCV_FOR_THREADS_NUM=1 \
    OMP_NUM_THREADS=1 \
    PYTHONPATH=/app

RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 \
        libglib2.0-0 \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --default-timeout=1000 --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Copy NudeNet ONNX models into image
COPY app/models/nudenet /app/models/nudenet

RUN useradd -m appuser
USER appuser

EXPOSE 80

CMD ["uvicorn", "app.main:app", "--host=0.0.0.0", "--port=80", "--workers=4"]
