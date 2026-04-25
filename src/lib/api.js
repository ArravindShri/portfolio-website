// Centralized API client. In dev, requests go through Vite's /api proxy
// to localhost:8000. In prod (Vercel), VITE_API_BASE_URL points at the
// Railway backend, e.g. https://portfolio-api-production.up.railway.app
const RAW_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
// Strip trailing slash so callers can use leading-slash paths.
const BASE = RAW_BASE.replace(/\/+$/, '');

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${BASE}${p}`;
}

export async function apiGet(path, init) {
  const res = await fetch(apiUrl(path), { ...init, method: 'GET' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GET ${path} failed: ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}
