import { useEffect, useRef, useState } from 'react';
import { apiUrl } from './api.js';

/**
 * Tiny GET hook for the FastAPI backend.
 * Returns `{ data, loading, error, source, lastUpdated }`.
 *
 * - `source`     — value of the `X-Data-Source` response header (live | cache).
 * - `lastUpdated`— value of `X-Last-Updated` (ISO timestamp).
 *
 * Re-fetches when `path` changes; aborts in-flight requests on unmount.
 */
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
          throw new Error(`${res.status} ${res.statusText}${body ? ` — ${body}` : ''}`);
        }
        const data = await res.json();
        setState({ data, loading: false, error: null, source, lastUpdated });
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setState({ data: null, loading: false, error: err, source: null, lastUpdated: null });
      });

    return () => ctrl.abort();
  }, [path, skip]);

  return state;
}
