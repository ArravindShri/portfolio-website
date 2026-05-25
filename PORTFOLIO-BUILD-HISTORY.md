# Portfolio Website — Build History

**Repository:** `portfolio-website` (`/Users/shri-16088/Desktop/Real Projects/Portfolio Website`)
**Build period:** 2026-04-25 → 2026-05-02 (8 days, 58 commits)
**Status:** Live on Vercel; backend formerly on Railway (now mostly static JSON architecture)

## Overview

This document reconstructs the build history of the portfolio website from git log and the current codebase state. The site is a single-author engineering portfolio showcasing three live data projects (Energy Security, Defense Intelligence, Investment Portfolio) plus standard portfolio pages (Home, Projects index, Journey, Contact). It connects to a Microsoft Fabric warehouse via a FastAPI backend (originally) or pre-exported static JSON (current default), with daily/weekly GitHub Actions refresh workflows.

The 8-day build evolved through five distinct architectural phases — a monorepo scaffold, three live-data project pages, a major pivot from live API to static JSON, and a final stretch of workflow hardening and incident recovery.

## Project at a Glance

| | |
|---|---|
| **Frontend** | React 18.3 + Vite 5.4 + React Router 6.26 + Tailwind 3.4 |
| **Backend** | FastAPI 0.111 + Pyodbc 5.1 + MSAL 1.28 (Microsoft Fabric warehouse) |
| **Charting** | Recharts 2.15 |
| **SEO** | React Helmet Async 3.0 |
| **Data warehouse** | Microsoft Fabric (P1 portfolio + P3 energy/defense, dual-warehouse) |
| **Frontend hosting** | Vercel (SPA rewrites) |
| **Backend hosting** | Railway (Docker, msodbcsql18) — used selectively post-static-JSON pivot |
| **Form handling** | Web3Forms (replaced SMTP backend) |
| **Pages** | 7 (Home, Projects, Energy Security, Defense Intelligence, Investment Portfolio, Journey, Contact) |
| **Total commits** | 58 |
| **Most recent commit** | `7afd8dc` chore(pages): update Power BI dashboard CTA URLs (May 2) |

## Architecture

### Three-tier separation
1. **Frontend (Vercel):** Vite-built React SPA serving the 7 pages. Reads data from `public/static/*.json` for snapshot-based pages or hits `/api/*` for live-data pages.
2. **Backend (Railway):** Containerized FastAPI app with Microsoft ODBC Driver 18 baked in. Handles live Fabric queries via Azure AD service-principal auth, with a REST API fallback if ODBC fails. Includes manual GC every 100 requests to fit Railway's 1 GB RAM tier.
3. **Data refresh (GitHub Actions):** Two scheduled workflows — daily export and weekly crisis refresh — run pyodbc queries against Fabric, write JSON files into `public/static/`, and commit them back to `main`.

### Dual-warehouse strategy
- **P1 (Portfolio warehouse):** investment data (categories, currency returns, dividends, regions, stocks, correlations)
- **P3 (Energy warehouse):** energy + defense data (gold tables for overview, prices, imports, crisis, stocks, country slices)

This split reduces cross-workload contention on Fabric F4 trial capacity.

### Static-JSON-first
After the April 26 refactor (`4ebc213`), most pages no longer make live API calls. They consume snapshot JSON files committed to the repo. Only `/api/energy/crisis` retains a live-query fallback (with 1-hour in-memory cache). This pivot eliminated Railway always-on costs for the bulk of traffic and decoupled rendering from Fabric query latency.

## Build History — Chronological

### Phase 1 — Initial scaffold & backend architecture (April 25, 09:16 → 11:05 IST, 9 commits)

**Commits:** `919fd1e` → `83d456a`

The first commit (`919fd1e`) landed a full monorepo: Vite frontend, FastAPI serverless backend, dual-warehouse connections (`d9ea20f`), and Azure AD authentication for Fabric (`8270897`, `77f2a2a`). Initial design was Vercel-only — frontend and backend deployed as serverless functions.

**Major pivot at `83d456a`:** moved the FastAPI backend to Railway with Docker + msodbcsql18, leaving Vercel as frontend-only. Reason: Vercel serverless functions can't easily install the Microsoft ODBC driver needed for Fabric connections, and timeouts were unsuitable for multi-second warehouse queries.

### Phase 2 — Energy Security page build (April 25, 12:20 → 13:52 IST, 5 commits)

**Commits:** `2637cb1` → `3f7a337`

The Energy Security project page was the first complex feature. `2637cb1` wired six sections (Overview heatmap, Prices line chart, Imports flow diagram, Crisis correlation, Stocks performance, Country deep-dive) to live Railway API endpoints reading from Fabric gold tables.

The next four commits (`4ec8287`, `ae7474d`, `d403f1e`, `9be5673`, `128272c`, `3f7a337`) iterated on column-name mismatches, Decimal-to-Number coercion, unit display bugs, deduplication on the country-level joins, and a stale-data leak between countries. This phase reflects typical real-data integration friction — schema drift between code expectations and warehouse reality.

### Phase 3 — Defense Intelligence & freshness UX (April 25, 14:05 → 14:46 IST, 6 commits)

**Commits:** `ef7caea` → `273d569`

The Defense Intelligence deep-dive (`ef7caea`, `3d492a5`) added six sections (Trade, Military Budgets, Armed Conflicts, Defense Partnerships, Country profiles, Defense Companies) plus three new backend endpoints. Unlike Energy, Defense was built JSON-first — pre-exported static files in `public/static/defense/`.

`cde26b4` introduced a Hero freshness banner showing live-data timestamps for Energy alongside a static-data label for Defense. `b306b96` and `273d569` refined this: date-only formatting, topbar date display, data-coverage hints.

### Phase 4 — Core pages, mobile, contact, SEO (April 26, 14:27 → 20:46 IST, 11 commits)

**Commits:** `46b0955` → `5b220b5`

This phase built out the remaining standard pages and made the site shippable:

- **Investment Portfolio** (`46b0955`, `b5150cb`) — dashboard with category, currency, stock, dividend, correlation sections, all reading from `public/static/portfolio/*.json`
- **Journey** (`208a1f1`) — three-chapter narrative (Detour, Acceleration, Validation) with role/year/stack/lesson per chapter
- **Contact** (`208a1f1`, `0808301`, `1ccb8a5`) — terminal-styled form, originally with SMTP backend, then pivoted to Web3Forms (frontend-only public key). Memory optimization in `1ccb8a5` to fit Railway 1 GB.
- **GitHub repo CTAs** across project pages (`dd48b69`)
- **Mobile responsiveness** (`a689d4e`) — comprehensive breakpoints at 1100px and 720px
- **SEO + OG images** (`5b220b5`) — React Helmet integration plus OG share image generation script

### Phase 5 — Static JSON pivot, workflow hardening, incident recovery (April 26, 19:33 → May 2, 13:30 IST, 27 commits)

**Commits:** `4ebc213` → `7afd8dc`

The largest phase by commit count, this stretch architecturally re-shaped the project.

**The static-JSON pivot (`4ebc213`):** Rather than serving frontend pages from live Railway API calls, pre-export the gold tables to `public/static/*.json` daily and ship those with the site. The Vercel-deployed frontend reads the JSON directly. Railway is consulted only for the few pages that genuinely need live data.

**Why:** keep Vercel snappy, avoid Railway cold-starts, decouple page render from Fabric query latency, eliminate idle-server cost.

**Workflow hardening:** the next ~20 commits iterated on the `export-data.yml` GitHub Actions workflow to handle every real-world Fabric quirk:
- `0922ff1`, `df9118c`, `6bb1f91` — git pull-rebase, deduplication, safer commits
- `c2502ae` — DDL collision handling (Fabric error 3961)
- `da5aaf1` — Fabric CU throttle retries (error 24801)
- `a4faf3c` — query timeout bumped to 15 min
- `0054884` — unbuffered Python stdout for diagnostics
- `ab6f093` — client-side dedup instead of `SELECT DISTINCT`
- `b365914` — skip the slow `gold_crisis_analysis` read, reuse static `crisis.json` instead
- `d6b9f8f` — major perf win: build per-country JSON slices in memory rather than running per-country warehouse queries

**Auto-generated data refreshes:** workflows commit JSON refreshes back to `main` (e.g., `1f2e439`, `93790b7`, `4d484ec`, `1f3f3d7`).

**The weekly crisis refresh (`80ef0dc`):** since `gold_crisis_analysis` query is too slow for the daily export budget, it was split into a separate `refresh-crisis.yml` running Sundays only, with its own 60-minute query timeout.

**Power BI dashboard CTAs (`7afd8dc`):** updated CTA URLs across project pages — the most recent commit on `main`.

## Pages & Routes

| Route | Component | Data source | Notes |
|---|---|---|---|
| `/` | `Home.jsx` | Static text | Hero + About + Stack |
| `/projects` | `Projects.jsx` | Static + filters | Grid of 3 featured projects + 2 mock cards + domain filter UI |
| `/projects/energy-security` | `EnergySecurity.jsx` | Live API + static JSON | 6 sections including country deep-dive |
| `/projects/defense-intelligence` | `DefenseIntelligence.jsx` | Static JSON only | 6 sections from `public/static/defense/*.json` |
| `/projects/investment-portfolio` | `InvestmentPortfolio.jsx` | Static JSON only | 6 sections from `public/static/portfolio/*.json` |
| `/journey` | `Journey.jsx` | Static text | 3-chapter career narrative |
| `/contact` | `Contact.jsx` | Web3Forms | Terminal-styled form |

## Backend API surface

All endpoints under `/api/*`. Responses include `X-Data-Source` and `X-Last-Updated` headers.

**Energy router (`api/routers/energy.py`):**
- `GET /overview`, `/prices`, `/imports`, `/crisis`, `/stocks`
- `GET /country/{country_name}` — assembles country deep-dive (joins overview + crisis filtered by name)

**Defense router (`api/routers/defense.py`):** 9 endpoints — all read pre-exported static JSON from `public/static/defense/`.

**Portfolio router (`api/routers/portfolio.py`):** mirrors `public/static/portfolio/*.json`.

**Contact router (`api/routers/contact.py`):** `POST /contact` → Web3Forms forwarder.

**Health:** `GET /api/health` — exposes per-route data source.

**Auth & connection:** Azure AD service principal → MSAL token → pyodbc TDS connection with `attrs_before={1256: token_struct}`. REST API fallback if ODBC fails. 1-hour in-memory cache on heavy routes (crisis, imports). Manual `gc.collect()` every 100 requests + on startup.

## Data Pipeline

### Schedule chain (intentional sequencing)

```
20:30–21:00 UTC  Bronze ETL (Fabric notebooks: Twelve Data, EIA, Forex APIs)
21:30 UTC        dbt-transform builds gold tables           [energy repo]
22:30 UTC        export-data.yml snapshots tables → JSON    [portfolio repo]
23:30 UTC (Sun)  refresh-crisis.yml updates crisis.json     [portfolio repo]
```

The 1-hour buffers between stages exist to prevent DDL/snapshot-isolation conflicts seen earlier in the build (Fabric error 3961, surfaced in commit `c2502ae`).

### Workflows

**`export-data.yml`** — daily 22:30 UTC weekdays + manual dispatch
- Reads P1 (portfolio) + P3 (energy) gold tables via pyodbc
- Builds per-country JSON slices in memory (no per-country queries — perf optimization in `d6b9f8f`)
- Validates each output ≤ 50 MB
- Commits as `github-actions[bot]` if changed
- Retries on transient errors (3961 snapshot, 08S01 tcp, 24801 throttle, HYT00 timeout)

**`refresh-crisis.yml`** — weekly Sun 23:30 UTC + manual dispatch
- Queries `gold_crisis_analysis` only (separate budget — query takes 15-30 min on F4)
- 75-min job cap, 60-min internal query timeout
- Writes `public/static/energy/crisis.json`

### Static JSON files
`public/static/` contains:
- `energy/{overview,prices,imports,crisis,stocks}.json` + `country/{N}.json` for 8 countries
- `portfolio/{categories,correlation,currency_returns,dividends,regions,stocks}.json`
- `defense/` — 12 JSON files
- `data_meta.json` — last_export timestamp + per-table row counts (drives the freshness banner)

## Design System

**Color palette** (`tailwind.config.js`, `src/styles/tokens.css`):

| Token | Hex | Use |
|---|---|---|
| `bg` | `#0F0E0C` | Primary background (near-black) |
| `bg-1`, `bg-2`, `bg-3` | `#141310`, `#1A1816`, `#221F1C` | Layered depth |
| `ink` | `#F2EDE4` | Primary text |
| `ink-2`, `ink-3`, `ink-4` | `#C9C1B3`, `#8A8276`, `#5A5348` | Text hierarchy |
| `accent` | `#DA7756` | Terracotta — CTAs, highlights |
| `good` | `#9DB17C` | Positive (green) |
| `bad` | `#C45C4A` | Negative (red) |
| `warn` | `#D9A441` | Warning (amber) |

**Typography:**
- Sans: **Inter** (UI)
- Mono: **JetBrains Mono** (code, terminal)
- Serif: **Instrument Serif** (display)

**Global aesthetic:**
- 12-column grid overlay (1 px white, 1.8% opacity) — visible structure cue
- Perlin-style noise texture (3% opacity, overlay blend)
- Container max-width 1400 px; responsive padding 32 → 24 → 16 px

The aesthetic is consistently terminal-inspired — sharp edges, monospace typography, subtle scan/grid overlays, restrained color usage with terracotta as the single accent.

## Recent State (May 2 → May 4)

The most recent 10 commits all sit in Phase 5 (workflow hardening). They reflect a focus on operational reliability: timeout retries, throttle handling, schedule decoupling, and the weekly crisis refresh split.

**Last 10 commits:**

| SHA | Message |
|---|---|
| `7afd8dc` | chore(pages): update Power BI dashboard CTA URLs |
| `80ef0dc` | feat(actions): weekly crisis refresh workflow + standalone script |
| `1f3f3d7` | data: refresh static JSON — 2026-05-02 06:48 UTC |
| `b365914` | fix(actions): skip gold_crisis_analysis read; reuse static crisis.json |
| `ab6f093` | fix(actions): dedupe crisis rows client-side instead of SELECT DISTINCT |
| `0054884` | fix(actions): unbuffered Python stdout + early diagnostic prints |
| `a4faf3c` | fix(actions): bump query timeout to 15min and retry on HYT00 |
| `d6b9f8f` | perf(actions): build per-country slices in-memory, not via per-country queries |
| `da5aaf1` | fix(actions): retry Fabric capacity throttling (24801) with longer backoff |
| `c2502ae` | fix(actions): harden Fabric export against DDL collisions |

**Open work in flight (uncommitted):** modifications to `.github/workflows/refresh-crisis.yml`, `public/static/data_meta.json`, `scripts/refresh_crisis.py`, plus the untracked `INCIDENT-2026-05-04-fabric-crisis-query-timeout.md` postmortem.

## Notable Architectural Knowledge

Captured from incident postmortem and code review:

1. **Fabric CTE inlining** — Multiple references to a CTE/view in a single query each trigger full re-evaluation (not memoized). Drove the decision to materialize gold tables and a separate weekly crisis refresh.
2. **Trial-vs-paid F4 are identical** — both 4 CU. Upgrading from FTL4 to F4 paid does not increase headroom; F8 ($1,050/mo) needed for real expansion.
3. **Failed long queries cost real CU** — two 60-min `refresh_crisis.py` timeouts on broken SQL drove F4 utilization to 125%, triggering Background Rejection. Cancel stuck queries rather than waiting for timeout.
4. **Schedule buffers are load-bearing** — the 1-hour buffers between bronze ETL → dbt → export → crisis refresh exist to prevent observed DDL conflicts.
5. **Static-JSON architecture is the default** — Live Fabric queries are reserved for the few cases where freshness genuinely matters (currently just `/api/energy/crisis`).

## Known Tech Debt / Future Work

- No linting config (`.eslintrc`, prettier) — code style is implicit
- No test files (no jest/vitest setup)
- Capacity-aware error handling for Fabric error 24801 (CU throttle) — currently script consumes full hour before failing
- Workflow failure alerts (Discord/Slack) — silent staleness possible if workflow fails repeatedly
- Re-attempt table materialization of `gold_crisis_analysis` once Fabric capacity is healthy (the May 4 attempt was inconclusive)
- `dbt-transform.yml` has no `push: [main]` trigger — SQL changes don't auto-deploy; require manual `workflow_dispatch`
- Scheduled Fabric pause/resume to extend trial credits

## Cross-Repo Dependencies

This portfolio repo depends on a sibling repo:

- **`energy-security-intelligence`** (`/Users/shri-16088/Desktop/Real Projects/Real Project 3- Energy Intelligence/energy-security-intelligence`) — dbt project that builds the Fabric warehouse gold tables this site reads from. Its `dbt-transform.yml` workflow runs daily at 21:30 UTC, just before this repo's `export-data.yml` at 22:30 UTC. The two repos coordinate via shared Azure AD secrets and Fabric warehouse names.

## Appendix: Phase Summary

| Phase | Date range | Commits | Theme |
|---|---|---|---|
| 1 — Scaffold | Apr 25 morning | 9 | Monorepo, dual-warehouse auth, Vercel→Railway pivot |
| 2 — Energy Security | Apr 25 midday | 5 | First complex live-data page, schema iteration |
| 3 — Defense + freshness | Apr 25 afternoon | 6 | Defense page, freshness UX |
| 4 — Standard pages | Apr 26 | 11 | Investment Portfolio, Journey, Contact, mobile, SEO |
| 5 — Static JSON + workflows | Apr 26 → May 2 | 27 | Major architectural pivot + operational hardening |

Total: 58 commits across 8 days.

---

*Generated 2026-05-04 from git log + codebase analysis. Cross-reference with `INCIDENT-2026-05-04-fabric-crisis-query-timeout.md` for the most recent operational context.*
