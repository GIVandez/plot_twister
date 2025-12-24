# Use Python 3.11 as base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy pyproject.toml first for better caching
COPY pyproject.toml ./

# Install uv package manager
RUN pip install --no-cache-dir uv

# Install Python dependencies
RUN uv pip install --system --no-cache-dir \
    fastapi>=0.124.4 \
    psycopg2>=2.9.11 \
    pydantic[email]>=2.12.5 \
    python-multipart>=0.0.21 \
    sqlalchemy>=2.0.45 \
    uvicorn>=0.38.0

# Copy application code
COPY src/ ./src/
COPY README.md ./

# Create uploads directory
RUN mkdir -p ./src/uploads

# Expose port
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/src

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000').read()" || exit 1

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
