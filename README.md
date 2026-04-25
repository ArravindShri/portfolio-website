# portfolio-website

Monorepo for [shri-arravindhar](https://github.com/ArravindShri)'s portfolio.
One Vercel project, two runtimes:

- **Frontend** — Vite + React + React Router. Source in `src/`, output in `dist/`.
- **Backend** — Python FastAPI on Vercel serverless functions. Source in `api/`.

## Layout

```
portfolio-website/
├── api/                       Python FastAPI app (Vercel serverless)
│   ├── index.py               Vercel entry — re-exports the FastAPI app
│   ├── main.py                FastAPI app + CORS + health
│   ├── config.py              Env vars
│   ├── cache.py               1h in-memory cache, stale-cache fallback
│   ├── database.py            Fabric backend: pyodbc → REST fallback
│   └── routers/
│       ├── energy.py          /api/energy/*  (live Fabric)
│       ├── portfolio.py       /api/portfolio/* (live Fabric)
│       ├── defense.py         /api/defense/*  (static JSON)
│       └── _helpers.py
├── public/
│   └── static/defense/        Static JSON for Project 2
├── src/                       React app
│   ├── components/
│   ├── pages/
│   ├── data/
│   ├── styles/
│   └── config/theme.js
├── tests/test_endpoints.py    pytest smoke tests for the API
├── requirements.txt           Python deps
├── .env.example               All required env vars
├── vercel.json                Frontend + serverless routing
├── package.json               Vite + React + Router
└── tailwind.config.js
```

## Local development

```bash
# Frontend
npm install
npm run dev                   # http://localhost:5173

# Backend (separate terminal)
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # fill in Fabric credentials
uvicorn api.main:app --reload --port 8000
```

When deployed to Vercel, the same project serves the React app at `/`
and the FastAPI handler at `/api/*` — no separate hosts.

## Tests

```bash
pytest -q
```

## Deploy

```bash
vercel --prod
```

Set the env vars from `.env.example` in the Vercel project settings.

## Connection methods

`api/database.py` chooses lazily on first request:

1. **pyodbc** — preferred. Needs ODBC Driver 18.
2. **azure-identity + REST** — fallback. Works on Vercel where ODBC is
   unavailable. Service Principal token, POST query to the Fabric
   warehouse REST endpoint.

Override with `FABRIC_CONNECTION_MODE=pyodbc|rest|auto`.

`/api/health` reports the active backend.
