# Portfolio Website — Complete Setup & Maintenance Guide

**Author:** Arravind Shri  
**Site:** https://arravindportfolio.tech  
**Last Updated:** April 25, 2026  
**GitHub:** https://github.com/ArravindShri/portfolio-website

---

## Table of Contents

1. Architecture Overview
2. Platform & Service Accounts
3. Repository Structure
4. Frontend Setup
5. Backend Setup
6. Database (Microsoft Fabric)
7. Deployment Pipeline
8. DNS & Domain Configuration
9. Contact Form (Web3Forms)
10. Environment Variables — Complete Reference
11. Page-by-Page Build Guide
12. Data Flow Per Page
13. Common Issues & Fixes
14. Maintenance Procedures
15. Cost Summary
16. Rebuilding From Scratch

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  React 18 + Vite + Tailwind + Recharts                      │
│  Hosted: Vercel (auto-deploy on git push)                   │
│  Domain: arravindportfolio.tech (Hostinger DNS → Vercel)     │
│  Build: npm run build → dist/ → Vercel CDN                  │
└─────────────┬───────────────────────────────────────────────┘
              │ HTTPS (fetch)
              ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                              │
│  Python FastAPI (uvicorn)                                    │
│  Hosted: Railway (Docker, auto-deploy on git push)           │
│  URL: portfolio-website-production-1f9d.up.railway.app       │
│  Auth: Azure Service Principal → Fabric                      │
└──────┬──────────────┬───────────────────────────────────────┘
       │              │
       ▼              ▼
┌──────────────┐ ┌──────────────────┐ ┌───────────────────┐
│ Fabric P1    │ │ Fabric P3        │ │ Static JSON       │
│ Investment   │ │ Energy Security  │ │ Defense (in repo) │
│ Portfolio    │ │ 6 gold tables    │ │ 9 JSON files      │
│ 7 gold tables│ │ pyodbc-token     │ │ /public/static/   │
│ pyodbc-token │ │                  │ │ defense/           │
└──────────────┘ └──────────────────┘ └───────────────────┘
```

**Design System:** Bloomberg terminal aesthetic — near-black background (#0F0E0C), terracotta accent (#DA7756), JetBrains Mono for data, Instrument Serif for headings.

---

## 2. Platform & Service Accounts

| Platform | Purpose | URL | Account |
|----------|---------|-----|---------|
| **GitHub** | Source code repository | github.com/ArravindShri/portfolio-website | ArravindShri |
| **Vercel** | Frontend hosting (CDN, auto-deploy) | vercel.com | arravindshri |
| **Railway** | Backend hosting (Docker, FastAPI) | railway.app | arravindshri |
| **Microsoft Fabric** | Data warehouses (P1 + P3) | app.fabric.microsoft.com | Service Principal |
| **Hostinger** | Domain registrar + email | hostinger.com | arravindshri |
| **Web3Forms** | Contact form submissions | web3forms.com | shri@arravindportfolio.tech |
| **Twelve Data** | Stock/ETF/Forex market data API | twelvedata.com | Groww plan |
| **EIA** | Energy data API | eia.gov | API key |
| **World Bank** | GDP, population data | worldbank.org | Public API |
| **SIPRI** | Arms trade data (Defense) | sipri.org | Manual export |
| **ACLED** | Conflict events data (Defense) | acleddata.com | API key |

### Service Principal (Azure AD)

Used by the backend to authenticate with Fabric warehouses:

- **Client ID:** Stored in Railway as `FABRIC_CLIENT_ID`
- **Client Secret:** Stored in Railway as `FABRIC_CLIENT_SECRET`
- **Tenant ID:** Stored in Railway as `FABRIC_TENANT_ID`
- **Auth flow:** `ClientSecretCredential` → access token → `SQL_COPT_SS_ACCESS_TOKEN` → pyodbc

---

## 3. Repository Structure

```
portfolio-website/
├── api/                          # Python FastAPI backend
│   ├── main.py                   # FastAPI app, CORS, router registration
│   ├── config.py                 # Environment variable loading
│   ├── database.py               # Fabric connection manager (dual warehouse)
│   ├── cache.py                  # In-memory cache with TTL (1 hour)
│   ├── index.py                  # Vercel serverless entry (unused on Railway)
│   └── routers/
│       ├── energy.py             # /api/energy/* endpoints (7 routes)
│       ├── portfolio.py          # /api/portfolio/* endpoints (6 routes)
│       ├── defense.py            # /api/defense/* endpoints (9 routes, static JSON)
│       ├── contact.py            # /api/contact POST (SMTP, unused — Web3Forms used instead)
│       └── _helpers.py           # Shared query builder + cache wrapper
│
├── src/                          # React frontend
│   ├── App.jsx                   # Router configuration (7 routes)
│   ├── main.jsx                  # React DOM entry point
│   ├── pages/
│   │   ├── Home.jsx              # Homepage
│   │   ├── Projects.jsx          # Projects index (3 hero + 4 mock cards)
│   │   ├── EnergySecurity.jsx    # Energy deep-dive (1,137 lines, 7 sections)
│   │   ├── DefenseIntelligence.jsx # Defense deep-dive (905 lines, 6 sections)
│   │   ├── InvestmentPortfolio.jsx # Portfolio deep-dive (898 lines, 6 sections)
│   │   ├── Journey.jsx           # Career timeline (187 lines)
│   │   └── Contact.jsx           # Contact form + channels (318 lines)
│   ├── components/
│   │   ├── Layout.jsx            # Page wrapper (Topbar + Footer)
│   │   ├── Topbar.jsx            # Navigation + FABRIC·LIVE clock
│   │   ├── Footer.jsx            # Site footer
│   │   ├── Ticker.jsx            # Live scrolling ticker bar
│   │   ├── SectionTag.jsx        # § section numbering component
│   │   ├── HeroBg.jsx            # Homepage background effect
│   │   ├── home/                 # Homepage sub-components
│   │   └── projects/             # Project card components
│   ├── styles/
│   │   ├── index.css             # CSS import manifest
│   │   ├── tokens.css            # CSS custom properties (colors, fonts)
│   │   ├── chrome.css            # Topbar, footer, freshness banners, repo CTAs
│   │   ├── home.css              # Homepage styles
│   │   ├── projects.css          # Projects page styles
│   │   ├── energy.css            # Energy Security styles (545 lines)
│   │   ├── defense.css           # Defense Intelligence styles
│   │   ├── portfolio.css         # Investment Portfolio styles
│   │   ├── journey.css           # Journey page styles
│   │   └── contact.css           # Contact page styles
│   ├── lib/
│   │   ├── api.js                # API base URL helper
│   │   └── useApi.js             # React hook for GET requests
│   ├── config/
│   │   └── theme.js              # Theme token exports
│   └── data/
│       ├── projects.js           # Project card data (3 hero + 4 mock)
│       ├── about.js              # About section data
│       └── stack.js              # Tech stack data
│
├── public/
│   └── static/
│       └── defense/              # 9 static JSON files for Defense page
│           ├── trade_overview.json
│           ├── imports_analysis.json
│           ├── exports_analysis.json
│           ├── partnerships.json
│           ├── conflict_events.json
│           ├── spending_tradeoffs.json
│           ├── top100_companies.json
│           ├── partnership_flow.json
│           └── partnership_strength.json
│
├── tests/
│   └── test_endpoints.py         # API endpoint tests
│
├── Dockerfile                    # Railway backend Docker build
├── requirements.txt              # Python dependencies
├── package.json                  # Node.js dependencies
├── vite.config.js                # Vite build configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── vercel.json                   # Vercel deployment config
├── railway.json                  # Railway deployment config
└── .vercelignore                 # Excludes Python files from Vercel build
```

**Codebase Stats:**
- Frontend: 3,542 lines JSX + 3,481 lines CSS = 7,023 lines
- Backend: 1,155 lines Python
- Total files: 76 (excluding node_modules/.git)
- Build output: ~660 KB JS / ~64 KB CSS (gzipped: ~184 KB / ~10 KB)

---

## 4. Frontend Setup

### Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2",
    "recharts": "^2.15.4"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "vite": "^5.4.11"
  }
}
```

### Local Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview
```

### Environment Variables (Frontend)

Set in **Vercel** dashboard → Environment Variables:

| Variable | Value | Purpose |
|----------|-------|---------|
| `VITE_API_BASE_URL` | `https://portfolio-website-production-1f9d.up.railway.app` | Backend API base URL |

In local development, create `.env`:
```
VITE_API_BASE_URL=http://localhost:8000
```

### useApi Hook

All API calls go through `src/lib/useApi.js` — a custom React hook that:
- Fetches data via GET request to the Railway backend
- Extracts `X-Data-Source` (live/cache) and `X-Last-Updated` headers
- Returns `{ data, loading, error, source, lastUpdated }`
- Aborts in-flight requests on component unmount

### Routing (App.jsx)

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Home | Homepage |
| `/projects` | Projects | Project index cards |
| `/projects/energy-security` | EnergySecurity | Energy deep-dive (7 sections) |
| `/projects/defense-intelligence` | DefenseIntelligence | Defense deep-dive (6 sections) |
| `/projects/investment-portfolio` | InvestmentPortfolio | Portfolio deep-dive (6 sections) |
| `/journey` | Journey | Career timeline |
| `/contact` | Contact | Contact form + channels |

---

## 5. Backend Setup

### Dependencies (requirements.txt)

```
fastapi==0.111.0
uvicorn[standard]==0.30.1
python-dotenv==1.0.1
azure-identity==1.16.0
pyodbc==5.1.0
msal==1.28.0
requests==2.32.0
```

### Local Development

```bash
# From project root
cd api
pip install -r ../requirements.txt
uvicorn main:app --reload --port 8000
```

**Note:** Local development requires:
- ODBC Driver 18 for SQL Server installed
- All `FABRIC_*` environment variables set
- Or use `FABRIC_CONNECTION_MODE=rest` for REST API fallback (limited — no SQL execution)

### API Endpoints

#### Energy Security (Live from Fabric P3)

| Endpoint | Source Table | Notes |
|----------|-------------|-------|
| `GET /api/energy/overview` | gold_energy_overview | Filterable by product, year, country |
| `GET /api/energy/prices` | gold_energy_prices | Filterable by product, start_year, end_year |
| `GET /api/energy/imports` | gold_import_export_analysis | Filterable by country, product, year |
| `GET /api/energy/crisis` | gold_crisis_analysis | Filterable by crisis_id, asset_type |
| `GET /api/energy/stocks` | gold_stock_performance | Filterable by asset_type, category |
| `GET /api/energy/country/{country_name}` | All 4 tables | Aggregates by country_name |

#### Investment Portfolio (Live from Fabric P1)

| Endpoint | Source Table | Rows |
|----------|-------------|------|
| `GET /api/portfolio/stocks` | gold_stock_performance | 12 |
| `GET /api/portfolio/currency-returns` | gold_currency_adjusted_returns | 12 |
| `GET /api/portfolio/categories` | gold_category_performance | 4 |
| `GET /api/portfolio/regions` | gold_region_performance | 3 |
| `GET /api/portfolio/dividends` | gold_dividend_analysis | 12 |
| `GET /api/portfolio/correlation` | gold_correlation_matrix | 66 |

#### Defense Intelligence (Static JSON)

| Endpoint | JSON File | Rows |
|----------|-----------|------|
| `GET /api/defense/overview` | trade_overview.json | 179 |
| `GET /api/defense/imports` | imports_analysis.json | 7,807 |
| `GET /api/defense/exports` | exports_analysis.json | 7,807 |
| `GET /api/defense/partnerships` | partnerships.json | 1,806 |
| `GET /api/defense/conflict` | conflict_events.json | 2,596 |
| `GET /api/defense/spending` | spending_tradeoffs.json | 4,440 |
| `GET /api/defense/companies` | top100_companies.json | 92 |
| `GET /api/defense/partnership-flow` | partnership_flow.json | 3,612 |
| `GET /api/defense/partnership-strength` | partnership_strength.json | 3,612 |

#### Health Check

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | Shows warehouse connectivity, cache status, CORS config |

### Caching

The backend has an in-memory cache with 1-hour TTL (`CACHE_TTL_SECONDS=3600`). Each query result is cached by a composite key (e.g., `energy.overview:product=Crude Oil:year=2024`). The cache is cleared on backend restart (Railway redeploy).

### Decimal→Float Sanitization

**Critical fix:** Fabric's pyodbc returns Python `Decimal` objects for numeric columns. FastAPI serializes `Decimal` as JSON strings (`"71.97"` instead of `71.97`). The `_sanitize_row()` function in `database.py` converts all `Decimal` values to `float` before returning query results. Without this, all frontend `typeof v !== 'number'` checks fail.

```python
from decimal import Decimal

def _sanitize_row(row: dict) -> dict:
    return {k: float(v) if isinstance(v, Decimal) else v for k, v in row.items()}
```

---

## 6. Database (Microsoft Fabric)

### Warehouses

| Warehouse | Env Key | Purpose | Tables |
|-----------|---------|---------|--------|
| `warehouse_investment_portfolio` | `FABRIC_DATABASE_P1` | Investment Portfolio (Project 1) | 7 gold tables |
| `energy_dw` | `FABRIC_DATABASE_P3` | Energy Security (Project 3) | 5 gold tables |

### Connection Method

`PyodbcTokenBackend` — ODBC Driver 18 + Azure AD access token:
1. `ClientSecretCredential` acquires token for scope `https://database.windows.net/.default`
2. Token is UTF-16-LE encoded and packed into `SQL_COPT_SS_ACCESS_TOKEN`
3. pyodbc connects using the token (no password in connection string)

### Gold Table Schemas — Energy Security (P3)

**gold_energy_overview:** country_id, country_name, region, year, energy_product, production_volume, consumption_volume, import_volume, export_volume, volume_unit, self_sufficiency_ratio, energy_role, net_trade_position, benchmark_price_avg, estimated_import_cost_usd, gdp_usd, gdp_year_used, gdp_data_source, energy_cost_burden_pct, population, per_capita_consumption

**gold_energy_prices:** energy_product, period, year, month, benchmark_ticker, avg_monthly_price, high_monthly_price, low_monthly_price, price_unit, price_mom_change_pct, price_yoy_change_pct

**gold_import_export_analysis:** country_id, country_name, region, year, energy_product, production_volume, consumption_volume, import_volume, export_volume, volume_unit, energy_role, import_dependency_pct, net_trade_balance, yoy_import_change_pct, yoy_export_change_pct

**gold_crisis_analysis:** crisis_id, crisis_name, is_ongoing, crisis_duration_days, start_date, ticker, company_name, country_id, asset_type, category, pre_crisis_date, post_crisis_date, crisis_low, crisis_high, pre_crisis_price, post_crisis_price, country_name, energy_role, crisis_return_pct, max_drawdown_pct, has_recovered, recovery_days

**gold_stock_performance:** ticker, company_name, country_id, country_name, energy_role, asset_type, category, currency, current_price, current_price_usd, yoy_return_pct, week_52_high, week_52_low, volatility, sharpe_ratio, risk_free_rate_used, avg_daily_volume, price_date

### Gold Table Schemas — Investment Portfolio (P1)

**gold_stock_performance:** ticker, company_name, category, region, currency, current_price, yoy_return_pct, week_52_high, week_52_low, volatility, sharpe_ratio, pe_ratio, market_cap, roe, debt_to_equity, dividend_yield

**gold_currency_adjusted_returns:** ticker, company_name, category, region, original_currency, return_local_pct, inr_start_rate, inr_end_rate, return_inr_pct, currency_impact_pct

**gold_category_performance:** category, average_yoy_return_pct, avg_volatility, best_stock, worst_stock, avg_pe_ratio, total_market_cap, avg_dividend_yield

**gold_region_performance:** region, avg_yoy_return_pct, avg_volatility, avg_sharpe_ratio, stock_count, best_category, avg_currency_impact_pct

**gold_dividend_analysis:** ticker, company_name, category, region, stock_price, annual_dividend, dividend_yield_pct, payout_ratio, dividend_in_inr, pays_dividend

**gold_correlation_matrix:** stock_1, stock_2, stock_1_category, stock_2_category, stock_1_region, stock_2_region, correlation_coefficient, relationship

**gold_daily_inr_returns:** ticker, trade_date, close_price, close_price_inr, daily_return_local_pct, daily_return_inr_pct, forex_rate, currency_pair

### Known Data Issues

| Issue | Impact | Resolution |
|-------|--------|------------|
| Petroleum — consumption only | No production/import/export data | Inline note on page |
| Crude Oil — no consumption | Tracked under Petroleum | Inline note on page |
| Coal/Electricity — no benchmark | No global price exists | Excluded from prices chart |
| China/Russia — no stocks | SSE/MOEX not on Groww plan | Inline note when 0 rows |
| Saudi/Qatar — ETF proxies | KSA/QAT ETFs used | Documented in data notes |
| Crisis duplicates | Same row repeated 50+ times in gold_crisis_analysis | Frontend dedupe by crisis_id+ticker |
| country_id mismatch | Different IDs across gold tables for same country | Country deep-dive queries by country_name |

---

## 7. Deployment Pipeline

### Workflow

```
Local edit → git push origin main → Both deploy automatically:
                                     ├── Vercel (frontend) — ~30 seconds
                                     └── Railway (backend) — ~1 minute (Docker rebuild)
```

### Vercel (Frontend)

- **Trigger:** Auto-deploy on push to `main`
- **Build command:** `npm run build`
- **Output:** `dist/`
- **Framework:** Vite
- **Rewrites:** All non-asset paths → `/index.html` (SPA routing)
- **Domains:** arravindportfolio.tech, www.arravindportfolio.tech, portfolio-website-liard-nu-61.vercel.app

### Railway (Backend)

- **Trigger:** Auto-deploy on push to `main`
- **Build:** Docker (Dockerfile in repo root)
- **Base image:** `python:3.11-slim-bookworm`
- **Key dependency:** `msodbcsql18` (Microsoft ODBC Driver 18) — installed via apt in Dockerfile
- **Port:** Injected via Railway's `PORT` env var (typically 8080)
- **Health check:** `GET /api/health`

### Git Workflow (No SSH Push)

Claude Code cannot push to GitHub. After every commit in Claude Code:

```bash
cd "C:\Mac\Home\Desktop\Real Projects\Portfolio Website"
git push origin main
```

If Claude Code creates files but doesn't commit:
```bash
git add -A
git commit -m "description of changes"
git push origin main
```

---

## 8. DNS & Domain Configuration

### Hostinger DNS Records

| Type | Name | Value | TTL | Purpose |
|------|------|-------|-----|---------|
| A | @ | 216.198.79.1 | 60 | Root domain → Vercel |
| CNAME | www | a54596e0d21d0305.vercel-dns-017.com. | 300 | www → Vercel |
| MX | @ | mx1.hostinger.com (priority 5) | 14400 | Email |
| MX | @ | mx2.hostinger.com (priority 10) | 14400 | Email |
| TXT | @ | v=spf1 include:_spf.mail.hostinger.com ~all | 14400 | SPF |
| TXT | @ | MS=485865B969DA83CCC263D271E98D865741226959 | 14400 | Domain verification |
| TXT | _dmarc | v=DMARC1; p=none | 3600 | DMARC |
| CNAME | hostingermail-* (×3) | *.dkim.mail.hostinger.com | 300 | DKIM |
| CNAME | autodiscover | autodiscover.mail.hostinger.com | 300 | Email autodiscover |
| CNAME | autoconfig | autoconfig.mail.hostinger.com | 300 | Email autoconfig |

**Important:** Do not delete MX, SPF, DKIM, or DMARC records — they're for email service.

### Vercel Domain Config

- `arravindportfolio.tech` → 307 redirect to `www.arravindportfolio.tech`
- `www.arravindportfolio.tech` → Production
- `portfolio-website-liard-nu-61.vercel.app` → Production (original Vercel URL, still works)

---

## 9. Contact Form (Web3Forms)

### Setup

- **Service:** Web3Forms (https://web3forms.com)
- **Access Key:** `69975f17-4d28-4000-bed2-8372b90c531c` (public key, safe in client code)
- **Email:** Submissions go to shri@arravindportfolio.tech
- **Cost:** Free (250 submissions/month)

### How It Works

1. User fills form on Contact page (name, email, org, intent, message)
2. Frontend POSTs directly to `https://api.web3forms.com/submit` (no backend involved)
3. Web3Forms sends email to shri@arravindportfolio.tech
4. Email includes: subject line with intent, name, email (as Reply-To), org, full message

### Why Not SMTP?

Railway blocks outbound SMTP connections on port 465. The original `/api/contact` endpoint using `smtplib.SMTP_SSL` hung indefinitely. Web3Forms uses HTTPS (port 443) which is not blocked.

The `api/routers/contact.py` file still exists in the repo but is unused — the frontend bypasses it entirely.

---

## 10. Environment Variables — Complete Reference

### Vercel (Frontend)

| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | `https://portfolio-website-production-1f9d.up.railway.app` |

### Railway (Backend)

| Variable | Purpose |
|----------|---------|
| `FABRIC_SQL_ENDPOINT_P1` | Investment Portfolio warehouse SQL endpoint |
| `FABRIC_DATABASE_P1` | `warehouse_investment_portfolio` |
| `FABRIC_SQL_ENDPOINT_P3` | Energy Security warehouse SQL endpoint |
| `FABRIC_DATABASE_P3` | `energy_dw` |
| `FABRIC_CLIENT_ID` | Azure Service Principal client ID |
| `FABRIC_CLIENT_SECRET` | Azure Service Principal secret |
| `FABRIC_TENANT_ID` | Azure AD tenant ID |
| `FABRIC_CONNECTION_MODE` | `auto` (pyodbc primary, REST fallback) |
| `CORS_ORIGINS` | `https://portfolio-website-liard-nu-61.vercel.app,https://arravindportfolio.tech,https://www.arravindportfolio.tech,http://localhost:5173` |
| `CACHE_TTL_SECONDS` | `3600` (1 hour) |
| `SMTP_HOST` | `smtp.hostinger.com` (unused — Web3Forms used instead) |
| `SMTP_PORT` | `465` (unused) |
| `SMTP_USER` | `shri@arravindportfolio.tech` (unused) |
| `SMTP_PASS` | Email password (unused) |

---

## 11. Page-by-Page Build Guide

### Shared Patterns (Used by All Deep-Dive Pages)

Every deep-dive page follows the same architecture:

```jsx
// Theme tokens
const C = {
  ink: '#F2EDE4', ink2: '#C9C1B3', ink3: '#8A8276', ink4: '#5A5348',
  rule: '#2A2622', bg1: '#141310', bg2: '#1A1816',
  accent: '#DA7756', accentDim: '#8A4A34',
  good: '#9DB17C', bad: '#C45C4A', warn: '#D9A441',
};

// Helpers
const toNum = (v) => { /* parse number or numeric string, return null if invalid */ };
const isNum = (v) => toNum(v) !== null;
const fmtNumber = (v) => { /* format with commas, 2 decimal places */ };
const fmtPct = (v) => { /* format as +X.XX% or -X.XX% */ };

// Components: DataBadge, StatePane, SectionTag
// Charts: Recharts (BarChart, LineChart, ResponsiveContainer)
// Data fetching: useApi hook
```

### Energy Security (EnergySecurity.jsx — 1,137 lines)

| Section | API | Key Features |
|---------|-----|-------------|
| §03.1 Hero | /api/energy/overview | KPI tiles, freshness banner, GitHub CTA |
| §03.2 Prices | /api/energy/prices | 3-line chart (Crude Oil, Natural Gas, Petroleum), filter chips |
| §03.3 Trade Flows | /api/energy/imports | Product filter (default Crude Oil), horizontal bar chart, data notes per product |
| §03.4 Crisis | /api/energy/crisis | Deduped by crisis_id+ticker, top 8 cards by absolute return |
| §03.5 Stocks | /api/energy/stocks | Sector filter chips, top/bottom toggle, horizontal bars |
| §03.6 Country | /api/energy/country/{name} | Client-side cache (useState), dataMatchesPicked validation, deduped crisis/stocks |
| §03.7 Data Notes | None | Collapsible table of 8 data limitations, inline notes on empty states |

**Key bugs fixed during build:**
- Decimal→float serialization (all sections showed "NO ROWS RETURNED")
- Country deep-dive: country_id mismatch across tables → switched to country_name
- Stale data leak: useApi preserves old data during loading → dataMatchesPicked guard
- Crisis duplicates: 6,912 identical rows → dedupe by crisis_id+ticker
- Trade flows: mixed units when aggregating all products → product filter

### Defense Intelligence (DefenseIntelligence.jsx — 905 lines)

| Section | API | Key Features |
|---------|-----|-------------|
| §02.1 Hero | /api/defense/overview | KPI tiles, static freshness banner, GitHub CTA |
| §02.2 Imports | /api/defense/imports | Weapon category filter, top 15 recipients bar chart |
| §02.3 Exports | /api/defense/exports | Weapon category filter, top 15 suppliers bar chart |
| §02.4 Partnerships | /api/defense/partnerships | Top 20 table by partnership_strength |
| §02.5 Conflict+Spending | /api/defense/conflict + /api/defense/spending | Synced country filter, dual-pane charts, latest-year KPIs |
| §02.6 Top 100 | /api/defense/companies | Region filter, sortable columns, arms share >80% highlighted |

### Investment Portfolio (InvestmentPortfolio.jsx — 898 lines)

| Section | API | Key Features |
|---------|-----|-------------|
| §01.1 Overview | /api/portfolio/stocks | KPI tiles, all 12 stocks bar chart + data table |
| §01.2 Currency | /api/portfolio/currency-returns | Grouped bars (local vs INR), currency impact KPIs |
| §01.3 Categories | /api/portfolio/categories | 2×2 category cards with big numbers |
| §01.4 Regions | /api/portfolio/regions | 3 region cards with forex impact |
| §01.5 Dividends | /api/portfolio/dividends | All/Payers filter, yield bar chart + table |
| §01.6 Correlation | /api/portfolio/correlation | 12×12 heatmap from 66 pairs, 4-stop color scale |

---

## 12. Data Flow Per Page

### Energy Security — Live Data Flow

```
EIA API → silver_eia_energy (dbt) → gold_energy_overview → /api/energy/overview → useApi → HeroSection
Twelve Data API → silver_stock_prices → gold_energy_prices → /api/energy/prices → useApi → PricesSection
                                       → gold_crisis_analysis → /api/energy/crisis → useApi → CrisisSection
                                       → gold_stock_performance → /api/energy/stocks → useApi → StocksSection
World Bank API → silver_world_bank → gold_import_export_analysis → /api/energy/imports → useApi → ImportsSection
```

Refresh: Daily via Power BI scheduled refresh → Fabric warehouse updated → API serves fresh data

### Investment Portfolio — Live Data Flow

```
Twelve Data API → silver_stock_prices → sp_refresh_gold (SQL Server 3:00 AM IST) → 7 gold tables
                                         → Fabric warehouse (migrated) → /api/portfolio/* → useApi → sections
```

### Defense Intelligence — Static Data Flow

```
SIPRI/ACLED → SQL Server (local) → Gold tables → SSMS export CSV → Convert to JSON → /public/static/defense/
                                                                                       → /api/defense/* → useApi
```

To update defense data: re-export CSVs from SSMS, convert to JSON, replace files in repo, push.

---

## 13. Common Issues & Fixes

### "NO ROWS RETURNED" on all sections

**Cause:** Fabric returns `Decimal` objects → serialized as JSON strings → `typeof v !== 'number'` fails.  
**Fix:** `_sanitize_row()` in `database.py` converts Decimal→float.

### Country deep-dive shows wrong country's data

**Cause 1:** `country_id` values are inconsistent across gold tables.  
**Fix:** Query by `country_name` instead of `country_id`.

**Cause 2:** `useApi` preserves stale data during loading via `setState` spread.  
**Fix:** `dataMatchesPicked` validation — check if `overview` rows contain the picked country_name before displaying.

### CORS errors from custom domain

**Cause:** Railway's `CORS_ORIGINS` doesn't include the new domain.  
**Fix:** Add `https://arravindportfolio.tech,https://www.arravindportfolio.tech` to `CORS_ORIGINS` in Railway Variables.

### Contact form hangs on "SENDING"

**Cause:** Railway blocks outbound SMTP on port 465.  
**Fix:** Use Web3Forms (HTTPS-based, no port restrictions).

### Backend won't start on Railway

**Cause:** Missing ODBC driver.  
**Fix:** The Dockerfile installs `msodbcsql18` from Microsoft's Debian feed. Ensure the Dockerfile hasn't been modified.

### Charts show 0 for all countries

**Cause:** Trade flows aggregating all products (different units).  
**Fix:** Product filter defaults to "Crude Oil"; only aggregates rows with matching product.

### Railway deploy fails

**Check:** Docker build logs in Railway dashboard. Common causes:
- `pip install` failure (check requirements.txt)
- ODBC driver install failure (check Dockerfile)
- Python syntax error (run `python -c "import main"` locally)

### Vercel deploy fails

**Check:** Build logs in Vercel dashboard. Common causes:
- `npm run build` failure (check for JSX syntax errors)
- Import errors (check file paths are correct)
- Missing dependencies (check package.json)

---

## 14. Maintenance Procedures

### Daily (Automatic)

- Power BI refreshes Fabric warehouses (Energy P3, Portfolio P1)
- Backend serves fresh data via 1-hour cache
- No manual action needed

### Updating Defense Data

1. Re-run queries in SSMS to get updated gold table data
2. Export as CSV from SSMS
3. Convert CSVs to JSON (flat arrays, nulls for missing values)
4. Replace files in `public/static/defense/`
5. `git add -A && git commit -m "update defense data" && git push origin main`
6. Railway auto-redeploys with new JSON files

### Adding a New Stock to Portfolio (P1)

1. Add to `silver_companies` in SQL Server
2. Add to `silver_stocks_reference`
3. Run `EXEC sp_refresh_gold` in SQL Server
4. Fabric warehouse syncs on next refresh
5. Frontend automatically shows the new stock (no code changes)

### Renewing Azure Service Principal Secret

1. Go to Azure AD → App registrations → your app → Certificates & secrets
2. Create new client secret
3. Update `FABRIC_CLIENT_SECRET` in Railway Variables
4. Railway auto-redeploys

### Renewing Hostinger Domain/Email

- Domain: arravindportfolio.tech — check expiry in Hostinger dashboard
- Email: shri@arravindportfolio.tech — tied to Hostinger plan
- Vercel: Pro trial expires in 13 days (as of April 25, 2026) — add payment method

### Monitoring

- **Backend health:** https://portfolio-website-production-1f9d.up.railway.app/api/health
- **Railway logs:** Railway dashboard → portfolio-website → Deployments → Logs
- **Vercel logs:** Vercel dashboard → portfolio-website → Deployments
- **Web3Forms:** web3forms.com dashboard → submission history

---

## 15. Cost Summary

| Service | Plan | Cost | Notes |
|---------|------|------|-------|
| Vercel | Pro Trial (then Hobby) | $0/month (Hobby) or $20/month (Pro) | Hobby has 100GB bandwidth |
| Railway | Trial → Developer | ~$5/month | Docker backend, pay-per-use |
| Hostinger | Domain + Email | ~$12/year | Domain registration + email |
| Microsoft Fabric | F2/Trial | Varies | Warehouse compute |
| Twelve Data | Groww | Free tier | 800 calls/day, limited exchanges |
| Web3Forms | Free | $0 | 250 submissions/month |
| GitHub | Free | $0 | Public repo |

**Estimated monthly cost:** ~$5-25/month (mostly Railway + Vercel if upgraded)

---

## 16. Rebuilding From Scratch

If you need to recreate the entire setup from zero:

### Step 1: Repository

```bash
git clone https://github.com/ArravindShri/portfolio-website.git
cd portfolio-website
npm install
```

### Step 2: Vercel (Frontend)

1. Go to vercel.com → Import Git Repository → select `portfolio-website`
2. Framework: Vite
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variable: `VITE_API_BASE_URL` = your Railway URL
6. Deploy

### Step 3: Railway (Backend)

1. Go to railway.app → New Project → Deploy from GitHub → select `portfolio-website`
2. Railway auto-detects Dockerfile
3. Add all environment variables (see Section 10)
4. Deploy
5. Note the generated URL (e.g., `https://xxx.up.railway.app`)
6. Update Vercel's `VITE_API_BASE_URL` with this URL
7. Update Railway's `CORS_ORIGINS` with Vercel's URL

### Step 4: DNS (Domain)

1. In Vercel: Settings → Domains → Add `arravindportfolio.tech`
2. In Hostinger: DNS → set A record to Vercel's IP, CNAME www to Vercel's DNS
3. Wait for propagation (5-30 minutes)
4. Update Railway `CORS_ORIGINS` with the custom domain

### Step 5: Contact Form

1. Go to web3forms.com → create form with your email
2. Get access key
3. Update `WEB3FORMS_ACCESS_KEY` in `src/pages/Contact.jsx`

### Step 6: Verify

- [ ] Homepage loads at custom domain
- [ ] Projects page shows 3 cards with "Explore →" links
- [ ] Energy Security shows live data, all 7 sections
- [ ] Defense Intelligence shows static data, all 6 sections
- [ ] Investment Portfolio shows live data, all 6 sections, heatmap works
- [ ] Journey page renders timeline
- [ ] Contact form sends email to your inbox
- [ ] Mobile view works on all pages
- [ ] `/api/health` returns all green

---

*Documentation created: April 25, 2026*  
*This document covers the complete portfolio website as deployed at arravindportfolio.tech*
