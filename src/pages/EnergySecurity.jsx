import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import SectionTag from '../components/SectionTag.jsx';
import useApi from '../lib/useApi.js';

// ---------------------------------------------------------------------------
// Theme tokens used by the charts. Mirrors src/styles/tokens.css.
// ---------------------------------------------------------------------------
const C = {
  ink: '#F2EDE4',
  ink2: '#C9C1B3',
  ink3: '#8A8276',
  ink4: '#5A5348',
  rule: '#2A2622',
  bg1: '#141310',
  bg2: '#1A1816',
  accent: '#DA7756',
  accentDim: '#8A4A34',
  good: '#9DB17C',
  bad: '#C45C4A',
  warn: '#D9A441',
};
const SERIES_COLORS = [C.accent, C.good, C.warn, '#7BA7C9', '#B98AC9', C.bad];

// ---------------------------------------------------------------------------
// Field-name helpers — Fabric column names vary, so we look for the most
// common candidates and fall back to whatever's present.
// ---------------------------------------------------------------------------
const pickKey = (row, candidates) =>
  candidates.find((k) => row && Object.prototype.hasOwnProperty.call(row, k));

const numericKeys = (row) =>
  row
    ? Object.keys(row).filter((k) => {
        const v = row[k];
        return typeof v === 'number' && Number.isFinite(v);
      })
    : [];

const fmtNumber = (v, opts = {}) => {
  if (v == null || Number.isNaN(v)) return '—';
  return Intl.NumberFormat('en-US', { maximumFractionDigits: 2, ...opts }).format(v);
};

const fmtPct = (v) => (v == null ? '—' : `${v >= 0 ? '+' : ''}${fmtNumber(v)}%`);

// ---------------------------------------------------------------------------
// Status chrome: shows live | cache | error and a last-updated timestamp.
// ---------------------------------------------------------------------------
function DataBadge({ source, lastUpdated, error, loading }) {
  if (loading) return <span className="data-badge loading">Loading…</span>;
  if (error) return <span className="data-badge err">Error</span>;
  if (!source) return null;
  const ts = lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '';
  return (
    <span className={`data-badge ${source}`}>
      {source === 'live' ? '● LIVE' : '○ CACHE'} {ts && <span className="ts">· {ts}</span>}
    </span>
  );
}

function StatePane({ loading, error, empty, children }) {
  if (loading)
    return (
      <div className="pane-state loading">
        <div className="dots">
          <span /> <span /> <span />
        </div>
        <div className="msg">Querying Fabric warehouse…</div>
      </div>
    );
  if (error)
    return (
      <div className="pane-state err">
        <div className="msg">Backend error</div>
        <code className="err-detail">{error.message}</code>
        <div className="hint">
          The Railway backend is up but the Fabric warehouse couldn't be reached.
          Check <code>/api/health</code> and confirm <code>FABRIC_*</code> env vars on
          Railway.
        </div>
      </div>
    );
  if (empty)
    return (
      <div className="pane-state empty">
        <div className="msg">No rows returned</div>
        <div className="hint">The query succeeded but the warehouse view is empty.</div>
      </div>
    );
  return children;
}

// ---------------------------------------------------------------------------
// Shared chart frame — the dotted-grid + axis style that recurs across panels.
// ---------------------------------------------------------------------------
const chartGrid = <CartesianGrid stroke={C.rule} strokeDasharray="2 4" vertical={false} />;
const axisTickStyle = {
  fill: C.ink3,
  fontSize: 10.5,
  fontFamily:
    "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  letterSpacing: '0.04em',
};
const tooltipStyle = {
  background: C.bg2,
  border: `1px solid ${C.rule}`,
  borderRadius: 0,
  fontFamily:
    "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 11,
  color: C.ink,
};
const tooltipLabelStyle = { color: C.ink3, letterSpacing: '0.06em' };

// ===========================================================================
//  SECTION 01 — Hero / KPIs
// ===========================================================================
function HeroSection() {
  const { data, loading, error, source, lastUpdated } = useApi('/api/energy/overview');

  const kpis = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return null;
    const sample = data[0];
    const yearKey = pickKey(sample, ['year', 'reporting_year']);
    const productKey = pickKey(sample, ['energy_product', 'product', 'commodity']);
    const countryKey = pickKey(sample, ['country_id', 'country', 'iso3']);
    const numCols = numericKeys(sample);

    const years = yearKey ? new Set(data.map((r) => r[yearKey]).filter(Boolean)) : new Set();
    const products = productKey
      ? new Set(data.map((r) => r[productKey]).filter(Boolean))
      : new Set();
    const countries = countryKey
      ? new Set(data.map((r) => r[countryKey]).filter(Boolean))
      : new Set();

    return {
      countries: countries.size,
      products: products.size,
      years: years.size,
      yearMin: years.size ? Math.min(...years) : null,
      yearMax: years.size ? Math.max(...years) : null,
      rows: data.length,
      numCols: numCols.length,
    };
  }, [data]);

  return (
    <section className="section energy-hero">
      <div className="container">
        <SectionTag num="03.1" label="Project · Energy Security" path="/ projects / energy-security" />
        <div className="hero-row">
          <div className="hero-copy">
            <h1>
              Energy <em>Security</em>
            </h1>
            <p className="lede">
              EIA + Twelve Data feeds, <em>normalized</em> into a Fabric warehouse, surfaced
              through a Power BI model that watches Brent, Henry Hub, coal benchmarks, and
              uranium spot — plus the equities that move with them.
            </p>
            <div className="meta-row">
              <DataBadge
                source={source}
                lastUpdated={lastUpdated}
                error={error}
                loading={loading}
              />
              <span className="meta-sep">·</span>
              <span className="meta">
                P3 warehouse · gold_energy_overview · {kpis ? `${kpis.rows} rows` : '—'}
              </span>
            </div>
          </div>
          <div className="hero-kpis">
            <div className="kpi">
              <div className="k">Countries</div>
              <div className="v">{kpis ? fmtNumber(kpis.countries) : '—'}</div>
            </div>
            <div className="kpi">
              <div className="k">Products</div>
              <div className="v">{kpis ? fmtNumber(kpis.products) : '—'}</div>
            </div>
            <div className="kpi">
              <div className="k">Year span</div>
              <div className="v">
                {kpis && kpis.yearMin
                  ? `${kpis.yearMin}–${kpis.yearMax}`
                  : '—'}
              </div>
            </div>
            <div className="kpi">
              <div className="k">Rows</div>
              <div className="v">{kpis ? fmtNumber(kpis.rows) : '—'}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ===========================================================================
//  SECTION 02 — Price benchmarks
// ===========================================================================
function PricesSection() {
  const { data, loading, error, source, lastUpdated } = useApi('/api/energy/prices');
  const [selected, setSelected] = useState(null);

  const { products, series } = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return { products: [], series: [] };
    const sample = data[0];
    const prodKey = pickKey(sample, ['energy_product', 'product', 'commodity']);
    const yearKey = pickKey(sample, ['year', 'date', 'period']);
    const priceKey = pickKey(sample, ['price', 'avg_price', 'value', 'close', 'usd']);
    if (!prodKey || !yearKey || !priceKey) return { products: [], series: [] };
    const prods = Array.from(new Set(data.map((r) => r[prodKey]).filter(Boolean)));
    // Pivot to {year, [product]: price}.
    const byYear = new Map();
    for (const r of data) {
      const y = r[yearKey];
      const p = r[prodKey];
      const v = r[priceKey];
      if (y == null || p == null || typeof v !== 'number') continue;
      if (!byYear.has(y)) byYear.set(y, { year: y });
      byYear.get(y)[p] = v;
    }
    const sorted = Array.from(byYear.values()).sort((a, b) => (a.year > b.year ? 1 : -1));
    return { products: prods, series: sorted };
  }, [data]);

  const visible = selected ?? products;
  const isEmpty = !loading && !error && (!series || series.length === 0);

  return (
    <section className="section energy-prices">
      <div className="container">
        <SectionTag num="03.2" label="Benchmarks · Spot prices" path="/ api / energy / prices" />
        <div className="panel-head">
          <h2>
            Four commodities, <em>one curve</em> — what the world actually pays for energy.
          </h2>
          <DataBadge source={source} lastUpdated={lastUpdated} error={error} loading={loading} />
        </div>

        {products.length > 0 && (
          <div className="filter-row">
            <span className="label">Series</span>
            <button
              className={`chip ${selected == null ? 'on' : ''}`}
              onClick={() => setSelected(null)}
            >
              All
            </button>
            {products.map((p) => (
              <button
                key={p}
                className={`chip ${Array.isArray(selected) && selected.includes(p) && selected.length === 1 ? 'on' : ''}`}
                onClick={() => setSelected([p])}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        <div className="chart-frame">
          <StatePane loading={loading} error={error} empty={isEmpty}>
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={series} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
                {chartGrid}
                <XAxis dataKey="year" stroke={C.ink4} tick={axisTickStyle} />
                <YAxis stroke={C.ink4} tick={axisTickStyle} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                <Legend wrapperStyle={{ fontFamily: axisTickStyle.fontFamily, fontSize: 11 }} />
                {visible.map((p, i) => (
                  <Line
                    key={p}
                    type="monotone"
                    dataKey={p}
                    stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3, fill: SERIES_COLORS[i % SERIES_COLORS.length] }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </StatePane>
        </div>
      </div>
    </section>
  );
}

// ===========================================================================
//  SECTION 03 — Imports & exports (trade flows)
// ===========================================================================
function ImportsSection() {
  const { data, loading, error, source, lastUpdated } = useApi('/api/energy/imports');

  const { rows, importKey, exportKey } = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return { rows: [] };
    const sample = data[0];
    const countryKey = pickKey(sample, ['country_name', 'country', 'country_id']);
    const importKey = pickKey(sample, ['imports', 'total_imports', 'imports_value']);
    const exportKey = pickKey(sample, ['exports', 'total_exports', 'exports_value']);
    if (!countryKey || (!importKey && !exportKey)) return { rows: [] };
    // Aggregate by country: sum imports/exports across years/products.
    const acc = new Map();
    for (const r of data) {
      const c = r[countryKey];
      if (!c) continue;
      if (!acc.has(c)) acc.set(c, { country: c, imports: 0, exports: 0 });
      if (importKey && typeof r[importKey] === 'number') acc.get(c).imports += r[importKey];
      if (exportKey && typeof r[exportKey] === 'number') acc.get(c).exports += r[exportKey];
    }
    const sorted = Array.from(acc.values())
      .sort((a, b) => Math.abs(b.imports - b.exports) - Math.abs(a.imports - a.exports))
      .slice(0, 12);
    return { rows: sorted, importKey, exportKey };
  }, [data]);

  const isEmpty = !loading && !error && rows.length === 0;

  return (
    <section className="section energy-imports">
      <div className="container">
        <SectionTag num="03.3" label="Trade flows · Imports vs exports" path="/ api / energy / imports" />
        <div className="panel-head">
          <h2>
            Who buys, <em>who sells</em> — net positions across the top movers.
          </h2>
          <DataBadge source={source} lastUpdated={lastUpdated} error={error} loading={loading} />
        </div>
        <div className="chart-frame">
          <StatePane loading={loading} error={error} empty={isEmpty}>
            <ResponsiveContainer width="100%" height={420}>
              <BarChart
                data={rows}
                layout="vertical"
                margin={{ top: 16, right: 24, left: 24, bottom: 8 }}
              >
                {chartGrid}
                <XAxis type="number" stroke={C.ink4} tick={axisTickStyle} />
                <YAxis
                  type="category"
                  dataKey="country"
                  width={140}
                  stroke={C.ink4}
                  tick={axisTickStyle}
                />
                <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                <Legend wrapperStyle={{ fontFamily: axisTickStyle.fontFamily, fontSize: 11 }} />
                {importKey && <Bar dataKey="imports" fill={C.accent} name="Imports" />}
                {exportKey && <Bar dataKey="exports" fill={C.good} name="Exports" />}
              </BarChart>
            </ResponsiveContainer>
          </StatePane>
        </div>
      </div>
    </section>
  );
}

// ===========================================================================
//  SECTION 04 — Crisis stress tests
// ===========================================================================
function CrisisSection() {
  const { data, loading, error, source, lastUpdated } = useApi('/api/energy/crisis');

  const cards = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    const sample = data[0];
    const nameKey = pickKey(sample, ['crisis_name', 'crisis_id', 'event']);
    const typeKey = pickKey(sample, ['asset_type', 'category', 'asset_class']);
    const beforeKey = pickKey(sample, ['before_value', 'price_before', 'pre']);
    const afterKey = pickKey(sample, ['after_value', 'price_after', 'post']);
    const pctKey = pickKey(sample, ['change_pct', 'pct_change', 'change_percent']);
    if (!nameKey) return [];
    return data.slice(0, 8).map((r, idx) => ({
      id: idx,
      name: r[nameKey],
      asset: typeKey ? r[typeKey] : '',
      before: beforeKey ? r[beforeKey] : null,
      after: afterKey ? r[afterKey] : null,
      pct:
        pctKey && typeof r[pctKey] === 'number'
          ? r[pctKey]
          : beforeKey && afterKey && typeof r[beforeKey] === 'number' && typeof r[afterKey] === 'number'
          ? ((r[afterKey] - r[beforeKey]) / r[beforeKey]) * 100
          : null,
    }));
  }, [data]);

  const isEmpty = !loading && !error && cards.length === 0;

  return (
    <section className="section energy-crisis">
      <div className="container">
        <SectionTag num="03.4" label="Stress tests · Crisis impact" path="/ api / energy / crisis" />
        <div className="panel-head">
          <h2>
            What <em>shocks</em> the curve — and by how much.
          </h2>
          <DataBadge source={source} lastUpdated={lastUpdated} error={error} loading={loading} />
        </div>

        <div className="chart-frame">
          <StatePane loading={loading} error={error} empty={isEmpty}>
            <div className="crisis-grid">
              {cards.map((c) => {
                const dir = c.pct != null && c.pct >= 0 ? 'up' : 'dn';
                return (
                  <article key={c.id} className={`crisis-card ${dir}`}>
                    <div className="ch">
                      <span className="title">{c.name}</span>
                      {c.asset && <span className="asset">{c.asset}</span>}
                    </div>
                    <div className="cv">
                      <div className="delta">{fmtPct(c.pct)}</div>
                      <div className="ba">
                        <span>before {fmtNumber(c.before)}</span>
                        <span className="arr">→</span>
                        <span>after {fmtNumber(c.after)}</span>
                      </div>
                    </div>
                    <div className="bar">
                      <div
                        className="fill"
                        style={{
                          width: `${Math.min(100, Math.abs(c.pct ?? 0))}%`,
                          background: dir === 'up' ? C.good : C.bad,
                        }}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </StatePane>
        </div>
      </div>
    </section>
  );
}

// ===========================================================================
//  SECTION 05 — Energy equities
// ===========================================================================
function StocksSection() {
  const { data, loading, error, source, lastUpdated } = useApi('/api/energy/stocks');
  const [category, setCategory] = useState('All');

  const { categories, byTicker } = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return { categories: [], byTicker: {} };
    const sample = data[0];
    const tickerKey = pickKey(sample, ['ticker', 'symbol', 'asset_id']);
    const catKey = pickKey(sample, ['category', 'sector', 'asset_type']);
    const dateKey = pickKey(sample, ['date', 'year', 'period']);
    const valueKey = pickKey(sample, ['close', 'price', 'value', 'pct_change']);
    if (!tickerKey || !dateKey || !valueKey) return { categories: [], byTicker: {} };

    const cats = new Set();
    const grouped = new Map();
    for (const r of data) {
      const t = r[tickerKey];
      if (!t) continue;
      if (catKey && r[catKey]) cats.add(r[catKey]);
      if (!grouped.has(t)) grouped.set(t, { ticker: t, category: catKey ? r[catKey] : '', points: [] });
      const v = r[valueKey];
      if (typeof v === 'number') grouped.get(t).points.push({ x: r[dateKey], y: v });
    }
    for (const g of grouped.values()) {
      g.points.sort((a, b) => (a.x > b.x ? 1 : -1));
    }
    return { categories: ['All', ...Array.from(cats)], byTicker: Object.fromEntries(grouped) };
  }, [data]);

  // Pivot to {x, [ticker]: y} restricted to selected category.
  const series = useMemo(() => {
    const tickers = Object.values(byTicker).filter(
      (t) => category === 'All' || t.category === category
    );
    const xs = new Set();
    for (const t of tickers) for (const p of t.points) xs.add(p.x);
    const sortedXs = Array.from(xs).sort((a, b) => (a > b ? 1 : -1));
    return {
      tickers,
      rows: sortedXs.map((x) => {
        const row = { x };
        for (const t of tickers) {
          const point = t.points.find((p) => p.x === x);
          if (point) row[t.ticker] = point.y;
        }
        return row;
      }),
    };
  }, [byTicker, category]);

  const isEmpty = !loading && !error && series.rows.length === 0;

  return (
    <section className="section energy-stocks">
      <div className="container">
        <SectionTag num="03.5" label="Equities · Sector performance" path="/ api / energy / stocks" />
        <div className="panel-head">
          <h2>
            Where <em>capital</em> moved — sector by sector.
          </h2>
          <DataBadge source={source} lastUpdated={lastUpdated} error={error} loading={loading} />
        </div>

        {categories.length > 1 && (
          <div className="filter-row">
            <span className="label">Sector</span>
            {categories.map((c) => (
              <button
                key={c}
                className={`chip ${category === c ? 'on' : ''}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="chart-frame">
          <StatePane loading={loading} error={error} empty={isEmpty}>
            <ResponsiveContainer width="100%" height={360}>
              <AreaChart data={series.rows} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
                <defs>
                  {series.tickers.map((t, i) => (
                    <linearGradient key={t.ticker} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={SERIES_COLORS[i % SERIES_COLORS.length]}
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="100%"
                        stopColor={SERIES_COLORS[i % SERIES_COLORS.length]}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  ))}
                </defs>
                {chartGrid}
                <XAxis dataKey="x" stroke={C.ink4} tick={axisTickStyle} />
                <YAxis stroke={C.ink4} tick={axisTickStyle} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                <Legend wrapperStyle={{ fontFamily: axisTickStyle.fontFamily, fontSize: 11 }} />
                {series.tickers.map((t, i) => (
                  <Area
                    key={t.ticker}
                    type="monotone"
                    dataKey={t.ticker}
                    stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                    strokeWidth={1.5}
                    fill={`url(#grad-${i})`}
                    isAnimationActive
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </StatePane>
        </div>
      </div>
    </section>
  );
}

// ===========================================================================
//  SECTION 06 — Country deep-dive
// ===========================================================================
function CountrySection() {
  // Pull overview to populate the country selector.
  const { data: overview } = useApi('/api/energy/overview');

  const countries = useMemo(() => {
    if (!Array.isArray(overview) || overview.length === 0) return [];
    const sample = overview[0];
    const idKey = pickKey(sample, ['country_id', 'iso3', 'country_code']);
    const nameKey = pickKey(sample, ['country_name', 'country', 'name']);
    if (!idKey) return [];
    const seen = new Map();
    for (const r of overview) {
      const id = r[idKey];
      if (id && !seen.has(id)) seen.set(id, nameKey ? r[nameKey] : id);
    }
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [overview]);

  const [picked, setPicked] = useState(null);
  const path = picked ? `/api/energy/country/${encodeURIComponent(picked)}` : null;
  const { data, loading, error, source, lastUpdated } = useApi(path, { skip: !picked });

  const buckets = useMemo(() => {
    if (!data || typeof data !== 'object') return null;
    return {
      overview: Array.isArray(data.overview) ? data.overview : [],
      imports: Array.isArray(data.imports) ? data.imports : [],
      crisis: Array.isArray(data.crisis) ? data.crisis : [],
      stocks: Array.isArray(data.stocks) ? data.stocks : [],
    };
  }, [data]);

  const isEmpty = picked && !loading && !error && buckets && Object.values(buckets).every((b) => b.length === 0);

  return (
    <section className="section energy-country">
      <div className="container">
        <SectionTag num="03.6" label="Country · Deep dive" path="/ api / energy / country / { id }" />
        <div className="panel-head">
          <h2>
            Pick a country, <em>see the system</em> — overview, trade, crises, equities.
          </h2>
          <DataBadge source={source} lastUpdated={lastUpdated} error={error} loading={loading} />
        </div>

        {countries.length > 0 ? (
          <div className="filter-row scroll">
            <span className="label">Country</span>
            {countries.slice(0, 30).map((c) => (
              <button
                key={c.id}
                className={`chip ${picked === c.id ? 'on' : ''}`}
                onClick={() => setPicked(c.id)}
                title={c.name}
              >
                {c.name}
              </button>
            ))}
          </div>
        ) : (
          <div className="filter-row">
            <span className="label">Country</span>
            <span className="hint">(populates from /api/energy/overview)</span>
          </div>
        )}

        {!picked ? (
          <div className="chart-frame">
            <div className="pane-state empty">
              <div className="msg">Select a country above</div>
              <div className="hint">
                Each pick aggregates four warehouse views into one round-trip from the FastAPI
                router.
              </div>
            </div>
          </div>
        ) : (
          <div className="country-grid">
            {['overview', 'imports', 'crisis', 'stocks'].map((bucket) => {
              const rows = buckets ? buckets[bucket] : [];
              return (
                <div key={bucket} className="country-cell">
                  <div className="cell-head">
                    <span className="bk">{bucket}</span>
                    <span className="bn">{rows ? `${rows.length} rows` : '—'}</span>
                  </div>
                  <StatePane
                    loading={loading}
                    error={error}
                    empty={!loading && !error && (!rows || rows.length === 0)}
                  >
                    <MiniTable rows={rows} max={6} />
                  </StatePane>
                </div>
              );
            })}
            {isEmpty && (
              <div className="country-cell wide">
                <div className="pane-state empty">
                  <div className="msg">No data for {picked}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// Compact tabular preview used in the country grid.
function MiniTable({ rows, max = 6 }) {
  if (!rows || rows.length === 0) return null;
  const cols = Object.keys(rows[0]).slice(0, 5);
  return (
    <div className="mini-table">
      <table>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, max).map((r, i) => (
            <tr key={i}>
              {cols.map((c) => (
                <td key={c}>
                  {typeof r[c] === 'number' ? fmtNumber(r[c]) : String(r[c] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > max && <div className="more">+ {rows.length - max} more rows</div>}
    </div>
  );
}

// ===========================================================================
//  Page
// ===========================================================================
export default function EnergySecurity() {
  return (
    <>
      <HeroSection />
      <PricesSection />
      <ImportsSection />
      <CrisisSection />
      <StocksSection />
      <CountrySection />
    </>
  );
}
