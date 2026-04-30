# Production-ready multi-stage Dockerfile (Sample Python-based)
# Adapt this to your specific stack as needed.

# Stage 1: Build stage
FROM python:3.10-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY src/ai/requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Final image
FROM python:3.10-slim

WORKDIR /app

# Copy only the installed dependencies from the builder stage
COPY --from=builder /root/.local /root/.local
COPY src/ai/ .

# Make sure scripts in .local/bin are usable
ENV PATH=/root/.local/bin:$PATH

# Expose the port the app runs on
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
