# Portfolio Website — Complete Setup, Automation & Maintenance Guide (v2)

**Author:** Arravind Shri  
**Site:** https://arravindportfolio.tech  
**Last Updated:** April 26, 2026  
**GitHub:** https://github.com/ArravindShri/portfolio-website

---

## Table of Contents

1. Architecture Overview
2. Platform & Service Accounts
3. Repository Structure
4. Frontend Setup
5. Data Architecture (Static JSON)
6. Daily Automation Pipeline
7. Deployment Pipeline
8. DNS & Domain Configuration
9. Contact Form (Web3Forms)
10. SEO Setup
11. Environment Variables & Secrets
12. Page-by-Page Guide
13. Data Flow Diagrams
14. Common Issues & Fixes
15. Maintenance Calendar
16. Risk Register
17. Incident Response Playbook
18. Cost Summary
19. Rebuilding From Scratch

---

## 1. Architecture Overview

### Current Architecture (v2 — Static JSON)

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  React 18 + Vite + Tailwind + Recharts + react-helmet-async │
│  Hosted: Vercel (auto-deploy on git push)                   │
│  Domain: arravindportfolio.tech (Hostinger DNS → Vercel)    │
│  Data: Static JSON from /public/static/                     │
│  Build: npm run build → dist/ → Vercel CDN                  │
└─────────────────────────────────────────────────────────────┘
              ▲ Updated daily at 3:15 AM IST
              │
┌─────────────────────────────────────────────────────────────┐
│                  GITHUB ACTIONS (Daily Export)               │
│  Cron: 9:45 PM UTC (3:15 AM IST)                           │
│  Script: scripts/export_fabric_to_json.py                   │
│  Connects to Fabric → Queries Gold tables → Writes JSON     │
│  Commits + pushes → Vercel auto-deploys                     │
└──────┬──────────────┬───────────────────────────────────────┘
       │              │
       ▼              ▼
┌──────────────┐ ┌──────────────────┐ ┌───────────────────┐
│ Fabric P1    │ │ Fabric P3        │ │ Static JSON       │
│ Investment   │ │ Energy Security  │ │ Defense (in repo) │
│ Portfolio    │ │ 5 gold tables    │ │ 9 JSON files      │
│ 6 gold tables│ │                  │ │ /public/static/   │
│              │ │                  │ │ defense/           │
└──────────────┘ └──────────────────┘ └───────────────────┘
```

### Previous Architecture (v1 — Railway, Deprecated)

```
Frontend (Vercel) → Railway Backend (FastAPI + pyodbc) → Fabric Warehouses
```
Railway was removed due to OOM crashes on 1GB memory limit. The `api/` folder remains in the repo for reference but is not deployed.

### Design System

```
Background:  #0F0E0C (near-black)
Accent:      #DA7756 (terracotta/coral)
Good:        #9DB17C (sage green)
Bad:         #C45C4A (muted red)
Warn:        #D9A441 (amber)
Ink:         #F2EDE4 (warm white)
Fonts:       JetBrains Mono (data) / Instrument Serif (headings) / Inter (body)
Aesthetic:   Bloomberg terminal
```

---

## 2. Platform & Service Accounts

| Platform | Purpose | Cost | URL |
|----------|---------|------|-----|
| **GitHub** | Source code + Actions automation | Free | github.com/ArravindShri/portfolio-website |
| **Vercel** | Frontend hosting (CDN, auto-deploy) | Free (Hobby) | vercel.com |
| **Microsoft Fabric** | Data warehouses (P1 + P3) | Trial (37 days left as of Apr 26) | app.fabric.microsoft.com |
| **Hostinger** | Domain registrar + email | ~$12/year | hostinger.com |
| **Web3Forms** | Contact form submissions | Free (250/month) | web3forms.com |
| **Google Search Console** | SEO indexing + monitoring | Free | search.google.com/search-console |
| **Twelve Data** | Stock/ETF/Forex market data API | Free (Groww plan) | twelvedata.com |
| **Azure AD (Entra ID)** | Service Principal authentication | Free | entra.microsoft.com |

### Service Principal: energy-dbt-pipeline

| Property | Value |
|----------|-------|
| Client ID | `449d4d3c-dbfd-4a09-a6e8-4590635b98d9` |
| Tenant ID | `fef10f0c-5dcc-4598-97ed-663c2bce42a5` |
| Secret (github-actions-v2) | Expires **October 21, 2026** |
| Secret (github-actions) | Expires **April 23, 2028** |

---

## 3. Repository Structure

```
portfolio-website/
├── .github/workflows/
│   └── export-data.yml           # Daily Fabric → JSON export (3:15 AM IST)
│
├── scripts/
│   ├── export_fabric_to_json.py  # Connects to Fabric, exports Gold tables as JSON
│   └── generate_og_image.py      # Generates OG social sharing image
│
├── public/
│   ├── og-default.png            # 1200×630 social sharing image
│   ├── robots.txt                # Search engine crawl rules
│   ├── sitemap.xml               # 7 URLs for Google indexing
│   └── static/
│       ├── data_meta.json        # Last export timestamp + row counts
│       ├── energy/               # Energy Security data (5 tables + 8 country files)
│       │   ├── overview.json
│       │   ├── prices.json
│       │   ├── imports.json
│       │   ├── crisis.json
│       │   ├── stocks.json
│       │   └── country/          # Per-country deep-dive data
│       │       ├── australia.json
│       │       ├── china.json
│       │       ├── germany.json
│       │       ├── india.json
│       │       ├── qatar.json
│       │       ├── russia.json
│       │       ├── saudi_arabia.json
│       │       └── usa.json
│       ├── portfolio/            # Investment Portfolio data (6 tables)
│       │   ├── stocks.json
│       │   ├── currency_returns.json
│       │   ├── categories.json
│       │   ├── regions.json
│       │   ├── dividends.json
│       │   └── correlation.json
│       └── defense/              # Defense Intelligence data (9 files, manually updated)
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
├── src/
│   ├── App.jsx                   # Router (7 routes)
│   ├── main.jsx                  # Entry point (HelmetProvider wrapper)
│   ├── components/
│   │   ├── SEO.jsx               # Reusable meta tags component
│   │   ├── Layout.jsx            # Page wrapper
│   │   ├── Topbar.jsx            # Navigation + FABRIC·DAILY clock
│   │   ├── Footer.jsx            # Site footer
│   │   ├── Ticker.jsx            # Scrolling ticker bar
│   │   ├── SectionTag.jsx        # § section numbering
│   │   └── ...                   # Home/project sub-components
│   ├── pages/
│   │   ├── Home.jsx              # Homepage (19 lines)
│   │   ├── Projects.jsx          # Project index (90 lines)
│   │   ├── EnergySecurity.jsx    # Energy deep-dive (1,143 lines, 7 sections)
│   │   ├── DefenseIntelligence.jsx # Defense deep-dive (911 lines, 6 sections)
│   │   ├── InvestmentPortfolio.jsx # Portfolio deep-dive (904 lines, 6 sections)
│   │   ├── Journey.jsx           # Career timeline (193 lines)
│   │   └── Contact.jsx           # Contact form (356 lines)
│   ├── styles/                   # 10 CSS files (3,481 lines total)
│   └── lib/
│       ├── useApi.js             # Data fetching hook (static JSON + API fallback)
│       └── api.js                # API base URL helper
│
├── api/                          # DEPRECATED — Railway backend (kept for reference)
│   ├── main.py
│   ├── database.py
│   ├── routers/
│   └── ...
│
├── vercel.json                   # Vercel deployment config
├── package.json                  # Node.js dependencies
└── Dockerfile                    # DEPRECATED — Railway Docker build
```

**Codebase Stats:**
- Frontend: 3,616 lines JSX + 3,481 lines CSS = 7,097 lines
- Scripts: 416 lines Python
- Static data: 29 JSON files, 12 MB total
- Total files: 105 (excluding node_modules/.git)
- Build output: ~680 KB JS / ~64 KB CSS

---

## 4. Frontend Setup

### Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-helmet-async": "^3.0.0",
    "react-router-dom": "^6.26.2",
    "recharts": "^2.15.4"
  }
}
```

### Local Development

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # Production build
npm run preview    # Preview production build
```

### Data Fetching (useApi Hook)

`src/lib/useApi.js` maps API paths to static JSON files:

```javascript
const STATIC_MAP = {
  '/api/energy/overview': '/static/energy/overview.json',
  '/api/energy/prices': '/static/energy/prices.json',
  '/api/portfolio/stocks': '/static/portfolio/stocks.json',
  // ... 19 total mappings
};
```

Country deep-dive paths (`/api/energy/country/Australia`) are dynamically mapped to `/static/energy/country/australia.json`.

Returns: `{ data, loading, error, source, lastUpdated }`

The hook fetches `/static/data_meta.json` once to get the `last_export` timestamp for freshness badges.

### Routing

| Path | Component | SEO Title |
|------|-----------|-----------|
| `/` | Home | Home |
| `/projects` | Projects | Projects |
| `/projects/energy-security` | EnergySecurity | Energy Security Intelligence |
| `/projects/defense-intelligence` | DefenseIntelligence | Defense Intelligence |
| `/projects/investment-portfolio` | InvestmentPortfolio | Investment Portfolio Analytics |
| `/journey` | Journey | Journey |
| `/contact` | Contact | Contact |

---

## 5. Data Architecture (Static JSON)

### Why Static JSON?

The Railway backend (FastAPI + pyodbc + Azure SDK) consumed too much memory on Railway's 1GB limit, causing OOM crashes. Since the data only refreshes once daily (3:00 AM IST via Power BI), there was no benefit to querying Fabric on every visitor request.

Static JSON provides:
- **Instant page loads** — served from Vercel CDN (<50ms)
- **Zero runtime costs** — no backend server
- **No OOM crashes** — no memory-intensive processes
- **Same data freshness** — daily export matches daily refresh

### Data Sources

| Source | Warehouse | Tables | Rows | Refresh |
|--------|-----------|--------|------|---------|
| Energy Security | Fabric P3 (energy_dw) | 5 + 8 country files | ~10,000 | Daily (odd days) |
| Investment Portfolio | Fabric P1 (warehouse_investment_portfolio) | 6 | ~117 | Daily (even days) |
| Defense Intelligence | Manual export | 9 | ~34,000 | Quarterly |

### Crisis Data Deduplication

`gold_crisis_analysis` has massive duplicates (thousands of identical rows per crisis_id + ticker). The export script uses `SELECT DISTINCT` with explicit columns to deduplicate at export time. Without this, country JSON files exceed GitHub's 100MB limit.

---

## 6. Daily Automation Pipeline

### Complete Timeline

```
2:00-2:30 AM IST → Project 3 Fabric Notebooks (Bronze ingestion)
2:35-2:55 AM IST → Project 1 Fabric Notebooks (Bronze ingestion)
3:00 AM IST      → Both dbt workflows run (GitHub Actions on project repos)
~3:02 AM IST     → dbt finishes → Gold tables updated in Fabric
3:15 AM IST      → Export Action runs (portfolio-website repo)
                     → Connects to both Fabric warehouses
                     → Queries all Gold tables
                     → Writes JSON to public/static/
                     → Commits + pushes to main
~3:17 AM IST     → Vercel auto-deploys → website has fresh data
3:30 AM IST      → Project 3 Power BI semantic refresh
3:45 AM IST      → Project 1 Power BI semantic refresh
```

### Export GitHub Action

**File:** `.github/workflows/export-data.yml`  
**Cron:** `45 21 * * *` (9:45 PM UTC = 3:15 AM IST)  
**Manual trigger:** Actions tab → "Export Fabric Data to Static JSON" → "Run workflow"

**Steps:**
1. Checkout portfolio-website (with GH_PAT for push access)
2. Install Python 3.12 + ODBC Driver 18
3. Install pyodbc + msal
4. Run `scripts/export_fabric_to_json.py`
5. Check file sizes (fail if any JSON > 50MB)
6. Fetch origin/main, reset soft, commit, push

**Export Script:** `scripts/export_fabric_to_json.py`
- Authenticates via MSAL Service Principal
- Connects to both P1 and P3 warehouses via pyodbc
- Exports 5 energy tables + 8 country files + 6 portfolio tables
- Crisis data uses SELECT DISTINCT to avoid duplicates
- Writes `data_meta.json` with export timestamp
- Sanitizes Decimal → float, datetime → ISO string

### GitHub Secrets (portfolio-website repo)

| Secret | Purpose |
|--------|---------|
| `AZURE_CLIENT_ID` | Service Principal app ID |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_CLIENT_SECRET` | Service Principal secret |
| `FABRIC_SQL_ENDPOINT_P1` | P1 warehouse SQL endpoint |
| `FABRIC_SQL_ENDPOINT_P3` | P3 warehouse SQL endpoint |
| `GH_PAT` | Personal Access Token (repo write for push) |

### Fabric Warehouse Endpoints

| Warehouse | SQL Endpoint |
|-----------|-------------|
| P1 (Investment Portfolio) | `bqh7d7wmlwmelf7nmy6cxtscuu-3meh6j254juu3mhsaahgwhxwyi.datawarehouse.fabric.microsoft.com` |
| P3 (Energy Security) | `bqh7d7wmlwmelf7nmy6cxtscuu-xo4jnpiynodufcb6pfqliax3vu.datawarehouse.fabric.microsoft.com` |

---

## 7. Deployment Pipeline

### How Code Gets Live

```
Local edit → git push origin main → Vercel auto-deploys (~30 seconds)
```

### How Data Gets Live

```
GitHub Action (3:15 AM) → export JSON → git push → Vercel auto-deploys
```

### Vercel Configuration

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/((?!assets/|static/|.*\\.(?:js|css|svg|png|...|xml|txt|json|webmanifest)).*)", "destination": "/index.html" }
  ]
}
```

**Key:** The rewrite excludes `.xml`, `.txt`, `.json`, `.webmanifest` so that `sitemap.xml`, `robots.txt`, and static JSON files are served directly — not rewritten to `index.html`.

### Git Workflow

Claude Code cannot push to GitHub. After every commit:
```bash
cd "C:\Mac\Home\Desktop\Real Projects\Portfolio Website"
git add -A
git commit -m "description"
git pull --rebase origin main  # In case the daily Action pushed data
git push origin main
```

---

## 8. DNS & Domain Configuration

### Vercel Domains

| Domain | Type | Status |
|--------|------|--------|
| arravindportfolio.tech | Primary (307 → www) | Valid |
| www.arravindportfolio.tech | Production | Valid |
| portfolio-website-liard-nu-61.vercel.app | Original Vercel URL | Valid |

### Hostinger DNS Records

| Type | Name | Value | TTL | Purpose |
|------|------|-------|-----|---------|
| A | @ | 216.198.79.1 | 60 | Root → Vercel |
| CNAME | www | a54596e0d21d0305.vercel-dns-017.com. | 300 | www → Vercel |
| MX | @ | mx1.hostinger.com (5) | 14400 | Email |
| MX | @ | mx2.hostinger.com (10) | 14400 | Email |
| TXT, CNAME | various | Hostinger DKIM/SPF/DMARC | various | Email auth |

**Do not delete** MX, SPF, DKIM, or DMARC records — they're for email.

---

## 9. Contact Form (Web3Forms)

### Setup

| Property | Value |
|----------|-------|
| Service | Web3Forms |
| Access Key | `69975f17-4d28-4000-bed2-8372b90c531c` |
| Email | shri@arravindportfolio.tech |
| Limit | 250 submissions/month (free) |

### How It Works

1. Visitor fills terminal-style form (name, email, org, intent, message)
2. Frontend POSTs directly to `https://api.web3forms.com/submit`
3. Web3Forms sends email to shri@arravindportfolio.tech
4. 60-second cooldown after successful send

### Why Not SMTP?

Railway blocked outbound SMTP on port 465. Web3Forms uses HTTPS (port 443). The old `api/routers/contact.py` SMTP endpoint still exists in the repo but is unused.

---

## 10. SEO Setup

### Technical SEO Components

| Component | File | Purpose |
|-----------|------|---------|
| Meta tags | src/components/SEO.jsx | Per-page title, description, OG, Twitter cards |
| HelmetProvider | src/main.jsx | Wraps app for client-side meta management |
| Sitemap | public/sitemap.xml | 7 URLs for Google crawling |
| Robots | public/robots.txt | Allow all crawlers, sitemap pointer |
| Structured data | index.html | JSON-LD Person schema |
| OG image | public/og-default.png | 1200×630 social sharing image |
| Default meta | index.html | Crawler fallback tags |

### Google Search Console

- **Property:** arravindportfolio.tech
- **Verification:** Domain name provider (DNS TXT record)
- **Sitemap:** Submitted at https://arravindportfolio.tech/sitemap.xml
- **Status:** Verified, awaiting indexing (2-7 days)

### SEO Best Practices Applied

- Every page has unique title + description
- Canonical URLs prevent duplicate content
- Open Graph tags for LinkedIn/WhatsApp/Twitter sharing
- JSON-LD structured data identifies you as a Person with skills
- sitemap.xml lists all 7 pages with priority and changefreq
- robots.txt allows all crawlers
- Fast page loads (static JSON from CDN)

### To Boost Rankings Further

1. **Google Search Console** — monitor which queries find you, submit new pages
2. **LinkedIn** — add arravindportfolio.tech to profile website field + featured section
3. **Blog posts** — write project writeups on Medium/Dev.to linking back
4. **Stack Overflow/Reddit** — answer Fabric/dbt questions with portfolio link in profile

---

## 11. Environment Variables & Secrets

### Vercel (Frontend)

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_API_BASE_URL` | `https://portfolio-website-production-1f9d.up.railway.app` | Legacy — useApi now reads static JSON first. Can be removed but harmless as fallback. |

### GitHub Secrets (portfolio-website repo)

| Secret | Purpose | Rotation |
|--------|---------|----------|
| `AZURE_CLIENT_ID` | SP app ID | Never changes |
| `AZURE_TENANT_ID` | Tenant ID | Never changes |
| `AZURE_CLIENT_SECRET` | SP secret | Rotate before Oct 21, 2026 |
| `FABRIC_SQL_ENDPOINT_P1` | P1 SQL endpoint | Changes if workspace migrated |
| `FABRIC_SQL_ENDPOINT_P3` | P3 SQL endpoint | Changes if workspace migrated |
| `GH_PAT` | GitHub push token | Check expiry in GitHub settings |

### Railway (DEPRECATED — can be deleted)

Previously held FABRIC_*, CORS_ORIGINS, SMTP_*, CACHE_TTL_SECONDS variables. No longer needed.

---

## 12. Page-by-Page Guide

### Energy Security (EnergySecurity.jsx — 1,143 lines)

| Section | Data Source | Key Features |
|---------|------------|--------------|
| §03.1 Hero | overview.json | KPI tiles, freshness banner, GitHub CTA |
| §03.2 Prices | prices.json | 3-line chart (Crude Oil, Natural Gas, Petroleum), product filter |
| §03.3 Trade Flows | imports.json | Product filter (default Coal), horizontal bars, per-product data notes |
| §03.4 Crisis | crisis.json | Deduped by crisis_id+ticker, top 8 cards |
| §03.5 Stocks | stocks.json | Sector filter, top/bottom toggle |
| §03.6 Country | country/{name}.json | Client-side cache, dataMatchesPicked validation, deduped |
| §03.7 Data Notes | None | Collapsible limitations table, inline empty-state notes |

### Defense Intelligence (DefenseIntelligence.jsx — 911 lines)

| Section | Data Source | Key Features |
|---------|------------|--------------|
| §02.1 Hero | trade_overview.json | KPI tiles, static freshness banner, GitHub CTA |
| §02.2 Imports | imports_analysis.json | Weapon category filter, top 15 recipients |
| §02.3 Exports | exports_analysis.json | Weapon category filter, top 15 suppliers |
| §02.4 Partnerships | partnerships.json | Top 20 table by strength |
| §02.5 Conflict+Spending | conflict_events.json + spending_tradeoffs.json | Synced country filter, dual-pane |
| §02.6 Top 100 | top100_companies.json | Region filter, sortable, >80% arms highlighted |

### Investment Portfolio (InvestmentPortfolio.jsx — 904 lines)

| Section | Data Source | Key Features |
|---------|------------|--------------|
| §01.1 Overview | stocks.json | KPI tiles, 12-stock bar chart + data table |
| §01.2 Currency | currency_returns.json | Grouped bars (local vs INR) |
| §01.3 Categories | categories.json | 2×2 category cards |
| §01.4 Regions | regions.json | 3 region cards with forex impact |
| §01.5 Dividends | dividends.json | All/Payers filter, yield chart |
| §01.6 Correlation | correlation.json | 12×12 heatmap from 66 pairs |

---

## 13. Data Flow Diagrams

### Energy Security (Daily)

```
Twelve Data API → Fabric Notebook (Bronze) → dbt (Silver/Gold) → gold tables in energy_dw
                                                                         │
GitHub Action (3:15 AM) ← SELECT * / SELECT DISTINCT ←──────────────────┘
         │
         ▼
public/static/energy/*.json → git push → Vercel CDN → visitor browser
```

### Investment Portfolio (Daily)

```
Twelve Data + yfinance → Fabric Notebooks → dbt → gold tables in warehouse_investment_portfolio
                                                         │
GitHub Action (3:15 AM) ← SELECT * ←────────────────────┘
         │
         ▼
public/static/portfolio/*.json → git push → Vercel CDN → visitor browser
```

### Defense Intelligence (Quarterly manual)

```
SIPRI + ACLED → SQL Server (local) → Gold tables → SSMS export CSV → Convert to JSON
                                                                         │
Drop files in public/static/defense/ → git push → Vercel CDN ←──────────┘
```

---

## 14. Common Issues & Fixes

### Export Action fails

| Error | Cause | Fix |
|-------|-------|-----|
| `Authentication failed` | SP secret expired | Rotate in Azure AD → update GitHub secret |
| `File exceeds 100MB` | Crisis duplicates | Script uses SELECT DISTINCT — if it recurs, check ETL JOINs |
| `rejected — fetch first` | Remote ahead of local | Script does `git fetch + reset --soft` — should self-heal |
| `YAML syntax error` | Malformed workflow | Validate YAML at yamllint.com before committing |
| `Fabric timeout` | Warehouse paused | Resume in Fabric portal; check capacity |

### Frontend shows empty data

| Symptom | Cause | Fix |
|---------|-------|-----|
| All sections empty | JSON files are `[]` (placeholder) | Trigger export Action manually |
| Country deep-dive empty | Bucket names wrong in JSON | Check country/*.json has keys: overview, imports, crisis, stocks |
| "NO ROWS RETURNED" for Crisis/Stocks | Normal — no stock data for China/Russia | Inline data notes explain this |

### Contact form doesn't send

| Symptom | Cause | Fix |
|---------|-------|-----|
| Hangs on "SENDING" | Web3Forms down | Check status.web3forms.com |
| 429 error | Monthly limit hit | Wait for reset or upgrade plan |

### Sitemap can't be read

| Symptom | Cause | Fix |
|---------|-------|-----|
| Google says "could not be read" | Vercel SPA rewrite intercepting XML | vercel.json rewrite must exclude .xml/.txt |

---

## 15. Maintenance Calendar

### Daily (Automatic)

| What | When | How |
|------|------|-----|
| Fabric Notebooks run | 2:00-2:55 AM IST | Fabric Scheduler |
| dbt transforms | 3:00 AM IST | GitHub Actions (project repos) |
| JSON export | 3:15 AM IST | GitHub Action (portfolio-website repo) |
| Vercel deploy | ~3:17 AM IST | Auto-triggered by git push |
| Power BI refresh | 3:30-3:45 AM IST | PBI Service scheduled refresh |

### Monthly

| Task | How |
|------|-----|
| Check GitHub Actions runs | Actions tab — verify daily exports are green |
| Check Google Search Console | Monitor impressions, clicks, indexing errors |
| Check Web3Forms submissions | web3forms.com dashboard |

### Quarterly

| Task | How |
|------|-----|
| Update Defense data | Re-export from SSMS → convert CSV to JSON → push |
| Check Azure SP secret expiry | Azure Portal → Entra ID → Certificates & secrets |
| Update ticker bar prices | Edit src/components/Ticker.jsx → push |
| Check GH_PAT expiry | GitHub → Settings → Personal access tokens |

### Annual

| Task | How |
|------|-----|
| Add risk-free rate for new year | silver_risk_free_rate.csv → EXEC sp_refresh_gold |
| Renew Hostinger domain | Hostinger dashboard → enable auto-renew |
| Rotate Azure SP secret | New secret → update 4 GitHub repos → delete old |
| Review Twelve Data plan | Check exchange coverage, API limits |

### Key Dates

| Date | Event | Action |
|------|-------|--------|
| Oct 1, 2026 | SP secret reminder | Rotate github-actions-v2 (expires Oct 21) |
| Oct 21, 2026 | SP secret expires | MUST be rotated before this date |
| Jun 2, 2026 | Fabric trial expiry | ~37 days from Apr 26. Plan for capacity purchase or migration. |

---

## 16. Risk Register

### P0 — CRITICAL

| Risk | Impact | Mitigation |
|------|--------|------------|
| Fabric trial expires | Export Action fails, data goes stale | Purchase F2 capacity or export one final time |
| Azure SP secret expires | Export Action fails | Calendar reminder Oct 1, rotate before Oct 21 |
| GH_PAT expires | Export Action can't push | Check expiry in GitHub settings, recreate |

### P1 — HIGH

| Risk | Impact | Mitigation |
|------|--------|------------|
| Hostinger domain expires | Site unreachable | Enable auto-renew |
| Vercel account issues | Site goes down | Downgrade to Hobby (free), keep deploying |
| Crisis data re-duplicates | Export files too large (>100MB) | SELECT DISTINCT in export script + 50MB file size check |

### P2 — MEDIUM

| Risk | Impact | Mitigation |
|------|--------|------------|
| Defense data gets stale | Shows outdated info | Quarterly re-export calendar reminder |
| Web3Forms 250/month limit | Contact form stops | Client-side 60s cooldown; unlikely to hit limit |
| New country added to Fabric | Country deep-dive breaks | Verify country_name consistency across tables |

### P3 — LOW

| Risk | Impact | Mitigation |
|------|--------|------------|
| Risk-free rate needs update | Sharpe ratio slightly off | Add new year's rate in January |
| Ticker bar prices stale | Cosmetic | Update Ticker.jsx quarterly |
| OG image needs update | Social previews stale | Run scripts/generate_og_image.py |

---

## 17. Incident Response Playbook

### "Site loads but all data is empty"

```
1. Check public/static/energy/overview.json in the repo — is it []?
2. If yes: the export Action hasn't run successfully
3. Go to Actions → Export Fabric Data → check latest run
4. If failed: read the error, fix, re-run
5. If no runs: trigger manually via "Run workflow"
6. Wait for Vercel to deploy (~30 seconds after push)
```

### "Export Action fails daily"

```
1. Check the error in the Actions log
2. Common causes:
   a. "Authentication failed" → SP secret expired → rotate
   b. "Cannot connect" → Fabric capacity paused → resume in portal
   c. "File exceeds 50MB" → crisis duplicates returned → check gold_crisis_analysis in SSMS
   d. "push rejected" → git conflict → the reset --soft step should handle this; if not, check workflow YAML
3. Fix the cause, then trigger manually to verify
```

### "Contact form hangs"

```
1. Open browser DevTools → Console
2. Check for network errors to api.web3forms.com
3. If 429: monthly limit hit → wait for reset
4. If network error: Web3Forms may be down → try later
5. If CORS error: Web3Forms doesn't have CORS issues — check for browser extensions blocking
```

### "Google can't read sitemap"

```
1. Visit https://arravindportfolio.tech/sitemap.xml in browser
2. If it shows HTML instead of XML: vercel.json rewrite is catching it
3. Check the rewrite regex excludes .xml
4. If it shows XML: re-submit in Search Console, wait 24 hours
```

---

## 18. Cost Summary

| Service | Monthly | Annual | Notes |
|---------|---------|--------|-------|
| Vercel | $0 | $0 | Hobby tier (100GB bandwidth) |
| GitHub Actions | $0 | $0 | 2,000 min/month free |
| Hostinger | ~$1 | ~$12 | Domain + email |
| Web3Forms | $0 | $0 | 250 submissions/month |
| Google Search Console | $0 | $0 | Free |
| Fabric | Varies | Varies | Trial → need capacity plan |
| **Total** | **~$1** | **~$12** | **Excluding Fabric** |

Railway was $5-10/month — now eliminated.

---

## 19. Rebuilding From Scratch

### Step 1: Clone & Install

```bash
git clone https://github.com/ArravindShri/portfolio-website.git
cd portfolio-website
npm install
```

### Step 2: Vercel

1. vercel.com → Import Git Repository → portfolio-website
2. Framework: Vite, Build: `npm run build`, Output: `dist`
3. Add env var: `VITE_API_BASE_URL` (optional, fallback only)
4. Deploy

### Step 3: Domain

1. Vercel → Settings → Domains → Add arravindportfolio.tech
2. Hostinger → DNS → A record: 216.198.79.1, CNAME www: Vercel DNS
3. Wait for propagation

### Step 4: GitHub Secrets

Add 6 secrets to portfolio-website repo (see Section 6).

### Step 5: Trigger First Export

Actions → "Export Fabric Data to Static JSON" → "Run workflow" → main

### Step 6: Contact Form

1. web3forms.com → create form → get access key
2. Update `WEB3FORMS_ACCESS_KEY` in Contact.jsx

### Step 7: SEO

1. Google Search Console → add property → verify via DNS
2. Submit sitemap: https://arravindportfolio.tech/sitemap.xml

### Step 8: Verify

- [ ] Homepage loads at custom domain
- [ ] All 3 project deep-dives show data with charts
- [ ] Country deep-dive shows 4 buckets per country
- [ ] Contact form sends email
- [ ] Mobile responsive on all pages
- [ ] robots.txt and sitemap.xml accessible
- [ ] OG image shows when sharing link on LinkedIn
- [ ] Export Action scheduled for 3:15 AM IST daily

---

*Documentation v2 created: April 26, 2026*  
*Covers: Static JSON architecture, daily automation, SEO, Railway removal*  
*Previous version (v1) covered Railway-based architecture*
