# Railway image for the FastAPI backend (BigQuery edition).
#
# Migrated off Microsoft Fabric: the backend now uses google-cloud-bigquery,
# which talks to BigQuery over HTTPS - no ODBC driver required. The old
# msodbcsql18 / unixODBC install (the original reason this had to run on
# Railway rather than Vercel) is gone, so the image is much smaller.
FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# --- Python deps ----------------------------------------------------------
COPY requirements.txt ./
RUN pip install -r requirements.txt

# --- App source -----------------------------------------------------------
COPY api ./api
COPY public/static/defense ./public/static/defense

# Railway injects PORT - default to 8000 for local `docker run`.
ENV PORT=8000
EXPOSE 8000

# api/main.py imports siblings via flat namespace (from config import ...),
# so we run uvicorn from inside api/.
WORKDIR /app/api
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
