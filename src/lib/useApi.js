import { useEffect, useRef, useState } from 'react';
import { apiUrl } from './api.js';

/**
 * GET hook used by every deep-dive page.
 *
 * Returns `{ data, loading, error, source, lastUpdated }`.
 *
 * The contract is unchanged from the Railway era so existing page
 * components don't have to know how data arrives. What changed is
 * WHERE the data comes from:
 *
 *   1. If the requested path matches one of the static-export targets
 *      written by `.github/workflows/export-data.yml` (or the country
 *      deep-dive pattern), we fetch the corresponding JSON file from
 *      `/static/...`. `source` is set to `'static'`, `lastUpdated`
 *      comes from `/static/data_meta.json` (cached at module level so
 *      we only hit it once per session).
 *
 *   2. Otherwise we fall back to the original Railway-era fetch via
 *      `apiUrl(path)`. Kept as an escape hatch for any /api/* route
 *      that doesn't have a static export yet.
 */

// Static-export route table. Keep keys aligned with the FastAPI router
// paths so page components keep using the same `useApi('/api/...')` calls.
const STATIC_MAP = {
  // Energy Security (P3 warehouse → public/static/energy)
  '/api/energy/overview': '/static/energy/overview.json',
  '/api/energy/prices': '/static/energy/prices.json',
  '/api/energy/imports': '/static/energy/imports.json',
  '/api/energy/crisis': '/static/energy/crisis.json',
  '/api/energy/stocks': '/static/energy/stocks.json',
  // Investment Portfolio (P1 warehouse → public/static/portfolio)
  '/api/portfolio/stocks': '/static/portfolio/stocks.json',
  '/api/portfolio/currency-returns': '/static/portfolio/currency_returns.json',
  '/api/portfolio/categories': '/static/portfolio/categories.json',
  '/api/portfolio/regions': '/static/portfolio/regions.json',
  '/api/portfolio/dividends': '/static/portfolio/dividends.json',
  '/api/portfolio/correlation': '/static/portfolio/correlation.json',
  // Defense Intelligence (already static; keys preserved for symmetry).
  '/api/defense/overview': '/static/defense/trade_overview.json',
  '/api/defense/imports': '/static/defense/imports_analysis.json',
  '/api/defense/exports': '/static/defense/exports_analysis.json',
  '/api/defense/partnerships': '/static/defense/partnerships.json',
  '/api/defense/conflict': '/static/defense/conflict_events.json',
  '/api/defense/spending': '/static/defense/spending_tradeoffs.json',
  '/api/defense/companies': '/static/defense/top100_companies.json',
  '/api/defense/partnership-flow': '/static/defense/partnership_flow.json',
  '/api/defense/partnership-strength': '/static/defense/partnership_strength.json',
};

const COUNTRY_PREFIX = '/api/energy/country/';

// Resolve an /api/... path to the corresponding /static/... URL, or null
// if the path doesn't have a static export.
function staticPathFor(path) {
  if (!path) return null;
  if (STATIC_MAP[path]) return STATIC_MAP[path];
  if (path.startsWith(COUNTRY_PREFIX)) {
    const raw = decodeURIComponent(path.slice(COUNTRY_PREFIX.length));
    const safe = raw.toLowerCase().replace(/\s+/g, '_');
    return `/static/energy/country/${safe}.json`;
  }
  return null;
}

// /static/data_meta.json is fetched exactly once per session. Subsequent
// hook calls reuse the same Promise so we don't pile on requests.
let metaPromise = null;
function getMeta() {
  if (!metaPromise) {
    metaPromise = fetch('/static/data_meta.json')
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return metaPromise;
}

export default function useApi(path, { skip = false } = {}) {
  const [state, setState] = useState({
    data: null,
    loading: !skip,
    error: null,
    source: null,
    lastUpdated: null,
  });
  const cancelRef = useRef(null);

  useEffect(() => {
    if (skip || !path) {
      setState((s) => ({ ...s, loading: false }));
      return undefined;
    }
    const ctrl = new AbortController();
    cancelRef.current = ctrl;
    setState((s) => ({ ...s, loading: true, error: null }));

    const staticPath = staticPathFor(path);

    if (staticPath) {
      // ---- Static branch ------------------------------------------------
      Promise.all([
        fetch(staticPath, { signal: ctrl.signal }).then(async (res) => {
          if (!res.ok) {
            throw new Error(
              `${res.status} ${res.statusText} — ${staticPath}`,
            );
          }
          return res.json();
        }),
        getMeta(),
      ])
        .then(([data, meta]) => {
          setState({
            data,
            loading: false,
            error: null,
            source: 'static',
            lastUpdated: meta?.last_export || null,
          });
        })
        .catch((err) => {
          if (err.name === 'AbortError') return;
          setState({
            data: null,
            loading: false,
            error: err,
            source: null,
            lastUpdated: null,
          });
        });
      return () => ctrl.abort();
    }

    // ---- Fallback branch (legacy Railway API) ---------------------------
    fetch(apiUrl(path), { signal: ctrl.signal })
      .then(async (res) => {
        const source = res.headers.get('X-Data-Source');
        const lastUpdated = res.headers.get('X-Last-Updated');
        if (!res.ok) {
          let body = '';
          try {
            const j = await res.json();
            body = j?.message || j?.detail?.message || JSON.stringify(j);
          } catch {
            body = await res.text().catch(() => '');
          }
          throw new Error(
            `${res.status} ${res.statusText}${body ? ` — ${body}` : ''}`,
          );
        }
        const data = await res.json();
        setState({ data, loading: false, error: null, source, lastUpdated });
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setState({
          data: null,
          loading: false,
          error: err,
          source: null,
          lastUpdated: null,
        });
      });

    return () => ctrl.abort();
  }, [path, skip]);

  return state;
}
