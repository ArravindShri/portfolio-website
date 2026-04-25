# Railway-friendly image for the FastAPI backend.
#
# Includes the Microsoft ODBC Driver 18 for SQL Server so that pyodbc can
# connect to Fabric warehouses with an AAD access token. Vercel's Python
# runtime can't ship this driver; Railway can.
FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    ACCEPT_EULA=Y

# --- System deps + Microsoft ODBC Driver 18 -------------------------------
# Pulls msodbcsql18 from the Microsoft Debian 12 (bookworm) feed.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
        ca-certificates curl gnupg apt-transport-https unixodbc unixodbc-dev \
 && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc \
        | gpg --dearmor -o /usr/share/keyrings/microsoft.gpg \
 && echo "deb [arch=amd64,arm64,armhf signed-by=/usr/share/keyrings/microsoft.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" \
        > /etc/apt/sources.list.d/mssql-release.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends msodbcsql18 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- Python deps ----------------------------------------------------------
COPY requirements.txt ./
RUN pip install -r requirements.txt

# --- App source -----------------------------------------------------------
# Only what the backend needs at runtime.
COPY api ./api
COPY public/static/defense ./public/static/defense

# Railway injects PORT — default to 8000 for local `docker run`.
ENV PORT=8000
EXPOSE 8000

# `api/main.py` imports siblings via flat namespace (`from config import ...`),
# so we run uvicorn from inside `api/`.
WORKDIR /app/api
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
