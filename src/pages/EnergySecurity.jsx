import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import SectionTag from '../components/SectionTag.jsx';
import useApi from '../lib/useApi.js';

// ---------------------------------------------------------------------------
// Theme tokens used by charts. Mirrors src/styles/tokens.css.
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

// Coerce a JSON-typed value into a usable number. Some Fabric numeric
// columns historically arrived as strings (Decimal -> str); we tolerate
// either shape so existing data + future fixes both render correctly.
const toNum = (v) => {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};
const isNum = (v) => toNum(v) != null;

const fmtNumber = (v, opts = {}) => {
  const n = toNum(v);
  if (n == null) return '—';
  return Intl.NumberFormat('en-US', { maximumFractionDigits: 2, ...opts }).format(n);
};
const fmtPct = (v) => {
  const n = toNum(v);
  if (n == null) return '—';
  return `${n >= 0 ? '+' : ''}${fmtNumber(n)}%`;
};

// Format an ISO timestamp as "Apr 25, 2026" for the freshness banner.
// The Power BI refresh runs daily, so the date alone is the meaningful
// signal. Returns null if the input doesn't parse.
const fmtRefreshDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// ---------------------------------------------------------------------------
// Status chrome.
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
        <div className="hint">The query succeeded but the gold view is empty.</div>
      </div>
    );
  return children;
}

const chartGrid = <CartesianGrid stroke={C.rule} strokeDasharray="2 4" vertical={false} />;
const axisTickStyle = {
  fill: C.ink3,
  fontSize: 10.5,
  fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  letterSpacing: '0.04em',
};
const tooltipStyle = {
  background: C.bg2,
  border: `1px solid ${C.rule}`,
  borderRadius: 0,
  fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 11,
  color: C.ink,
};
const tooltipLabelStyle = { color: C.ink3, letterSpacing: '0.06em' };

// ===========================================================================
//  03.1 — Hero / KPIs   (gold_energy_overview)
// ===========================================================================
function HeroSection() {
  const { data, loading, error, source, lastUpdated } = useApi('/api/energy/overview');

  const kpis = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return null;
    const years = new Set(data.map((r) => r.year).filter((y) => y != null));
    const products = new Set(data.map((r) => r.energy_product).filter(Boolean));
    const countries = new Set(data.map((r) => r.country_id).filter(Boolean));
    return {
      countries: countries.size,
      products: products.size,
      yearMin: years.size ? Math.min(...years) : null,
      yearMax: years.size ? Math.max(...years) : null,
      rows: data.length,
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
            <div className="freshness-banner live" role="status">
              <span className="dot" aria-hidden />
              <span className="lbl">Fabric · Live</span>
              <span className="sep">—</span>
              <span className="ts">
                Data as of {fmtRefreshDate(lastUpdated) ?? '—'}
              </span>
            </div>
            <div className="repo-cta">
              <a
                href="https://github.com/ArravindShri/energy-security-intelligence"
                target="_blank"
                rel="noopener noreferrer"
                className="repo-link"
              >
                <span className="repo-icon">↗</span>
                <span className="repo-text">
                  <span className="repo-label">GitHub · Source</span>
                  <span className="repo-desc">
                    EIA + Twelve Data + World Bank feeds, Fabric warehouse, dbt
                    models, FastAPI backend, React frontend
                  </span>
                </span>
              </a>
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
                {kpis && kpis.yearMin ? `${kpis.yearMin}–${kpis.yearMax}` : '—'}
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
//  03.2 — Price benchmarks   (gold_energy_prices)
//  x = period (YYYY-MM string), series per energy_product, value = avg_monthly_price.
// ===========================================================================
function PricesSection() {
  const { data, loading, error, source, lastUpdated } = useApi('/api/energy/prices');
  const [selected, setSelected] = useState(null);

  const { products, series, unit } = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return { products: [], series: [], unit: '' };
    const prods = Array.from(new Set(data.map((r) => r.energy_product).filter(Boolean))).sort();
    const byPeriod = new Map();
    for (const r of data) {
      const x = r.period;
      const p = r.energy_product;
      const v = toNum(r.avg_monthly_price);
      if (x == null || p == null || v == null) continue;
      if (!byPeriod.has(x)) byPeriod.set(x, { period: x });
      byPeriod.get(x)[p] = v;
    }
    const sorted = Array.from(byPeriod.values()).sort((a, b) =>
      String(a.period) > String(b.period) ? 1 : -1,
    );
    const unit = data.find((r) => r.price_unit)?.price_unit || '';
    return { products: prods, series: sorted, unit };
  }, [data]);

  const visible = selected ?? products;
  const isEmpty = !loading && !error && series.length === 0;

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
                className={`chip ${
                  Array.isArray(selected) && selected.length === 1 && selected[0] === p ? 'on' : ''
                }`}
                onClick={() => setSelected([p])}
              >
                {p}
              </button>
            ))}
            {unit && <span className="hint">unit: {unit}</span>}
          </div>
        )}

        <div className="data-note">
          ℹ Coal &amp; Electricity excluded — no global benchmark exists (traded regionally).
        </div>

        <div className="chart-frame">
          <StatePane loading={loading} error={error} empty={isEmpty}>
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={series} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
                {chartGrid}
                <XAxis dataKey="period" stroke={C.ink4} tick={axisTickStyle} />
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
//  03.3 — Trade flows   (gold_import_export_analysis)
//  Bars: import_volume vs export_volume aggregated per country_name.
// ===========================================================================
// Per-product coverage notes — keyed exactly by the energy_product value
// in gold_import_export_analysis. Products not in this map render no note
// (e.g. "Natural Gas", or any future product without a known data gap).
const IMPORTS_PRODUCT_NOTES = {
  Petroleum:
    'Petroleum: EIA publishes consumption only — no import/export volumes available. See Crude Oil for oil trade flows.',
  'Crude Oil':
    'Crude Oil: EIA reports production, imports & exports but not consumption (tracked under Petroleum as a refined product).',
  Coal:
    'Coal: limited trade data available for some countries. No global benchmark price exists.',
  Electricity:
    'Electricity: traded regionally, not globally. Only a few countries report cross-border electricity flows to the EIA.',
};

function ImportsSection() {
  const { data, loading, error, source, lastUpdated } = useApi('/api/energy/imports');
  const [product, setProduct] = useState('Crude Oil');

  // Distinct energy_product list (used by the chip row).
  const products = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    return Array.from(new Set(data.map((r) => r.energy_product).filter(Boolean))).sort();
  }, [data]);

  // Different products use different volume_units (BKWH/year vs Mbbl etc.),
  // so we MUST filter by a single product before aggregating per country.
  const { rows, unit } = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return { rows: [], unit: '' };
    // Effective product: explicit pick, else Crude Oil if present, else first.
    const effective = products.includes(product)
      ? product
      : products.includes('Crude Oil')
      ? 'Crude Oil'
      : products[0];
    const filtered = data.filter((r) => r.energy_product === effective);
    const acc = new Map();
    for (const r of filtered) {
      const c = r.country_name;
      if (!c) continue;
      if (!acc.has(c)) acc.set(c, { country: c, imports: 0, exports: 0 });
      const imp = toNum(r.import_volume);
      const exp = toNum(r.export_volume);
      if (imp != null) acc.get(c).imports += imp;
      if (exp != null) acc.get(c).exports += exp;
    }
    const sorted = Array.from(acc.values())
      .sort((a, b) => b.imports + b.exports - (a.imports + a.exports))
      .slice(0, 12);
    const unit = filtered.find((r) => r.volume_unit)?.volume_unit || '';
    return { rows: sorted, unit };
  }, [data, product, products]);

  const isEmpty = !loading && !error && rows.length === 0;

  return (
    <section className="section energy-imports">
      <div className="container">
        <SectionTag
          num="03.3"
          label="Trade flows · Imports vs exports"
          path="/ api / energy / imports"
        />
        <div className="panel-head">
          <h2>
            Who buys, <em>who sells</em> — top 12 by total volume.
          </h2>
          <DataBadge source={source} lastUpdated={lastUpdated} error={error} loading={loading} />
        </div>

        {products.length > 0 && (
          <div className="filter-row">
            <span className="label">Product</span>
            {products.map((p) => (
              <button
                key={p}
                className={`chip ${product === p ? 'on' : ''}`}
                onClick={() => setProduct(p)}
              >
                {p}
              </button>
            ))}
            {unit && <span className="hint">unit: {unit}</span>}
          </div>
        )}

        {IMPORTS_PRODUCT_NOTES[product] && (
          <div className="data-note">ℹ {IMPORTS_PRODUCT_NOTES[product]}</div>
        )}

        <div className="chart-frame">
          <StatePane loading={loading} error={error} empty={isEmpty}>
            <ResponsiveContainer width="100%" height={420}>
              <BarChart
                data={rows}
                layout="vertical"
                margin={{ top: 16, right: 24, left: 24, bottom: 8 }}
              >
                {chartGrid}
                <XAxis
                  type="number"
                  stroke={C.ink4}
                  tick={axisTickStyle}
                  label={
                    unit
                      ? { value: unit, position: 'insideBottom', offset: -4, fill: C.ink4, fontSize: 10 }
                      : undefined
                  }
                />
                <YAxis
                  type="category"
                  dataKey="country"
                  width={140}
                  stroke={C.ink4}
                  tick={axisTickStyle}
                />
                <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                <Legend wrapperStyle={{ fontFamily: axisTickStyle.fontFamily, fontSize: 11 }} />
                <Bar dataKey="imports" fill={C.accent} name="Imports" />
                <Bar dataKey="exports" fill={C.good} name="Exports" />
              </BarChart>
            </ResponsiveContainer>
          </StatePane>
        </div>
      </div>
    </section>
  );
}

// ===========================================================================
//  03.4 — Crisis stress tests   (gold_crisis_analysis)
//  Top 8 by |crisis_return_pct|.
// ===========================================================================
function CrisisSection() {
  const { data, loading, error, source, lastUpdated } = useApi('/api/energy/crisis');

  const cards = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    // Dedupe BEFORE sorting/slicing. The gold_crisis_analysis view returns
    // many duplicate rows per (crisis_id, ticker) — without this dedupe the
    // top-8-by-|return| was filled entirely by 8 copies of the highest row.
    const seen = new Set();
    const unique = [];
    for (const r of data) {
      if (!isNum(r.crisis_return_pct)) continue;
      const key = `${r.crisis_id ?? r.crisis_name ?? ''}::${r.ticker ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(r);
    }
    const ranked = unique.sort(
      (a, b) =>
        Math.abs(toNum(b.crisis_return_pct) ?? 0) -
        Math.abs(toNum(a.crisis_return_pct) ?? 0),
    );
    return ranked.slice(0, 8).map((r, i) => ({
      id: `${r.crisis_id || r.crisis_name}-${r.ticker || i}`,
      crisis: r.crisis_name,
      ticker: r.ticker,
      company: r.company_name,
      asset: r.asset_type,
      category: r.category,
      before: toNum(r.pre_crisis_price),
      after: toNum(r.post_crisis_price),
      pct: toNum(r.crisis_return_pct),
      drawdown: toNum(r.max_drawdown_pct),
      recovered: r.has_recovered,
      recoveryDays: toNum(r.recovery_days),
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
                const dir = c.pct >= 0 ? 'up' : 'dn';
                return (
                  <article key={c.id} className={`crisis-card ${dir}`}>
                    <div className="ch">
                      <span className="title">{c.crisis}</span>
                      <span className="asset">{c.ticker}{c.asset ? ` · ${c.asset}` : ''}</span>
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
                    <div className="crisis-foot">
                      {c.drawdown != null && (
                        <span>max drawdown {fmtPct(c.drawdown)}</span>
                      )}
                      {c.recovered != null && (
                        <span className={c.recovered ? 'good' : 'warn'}>
                          {c.recovered
                            ? `recovered · ${fmtNumber(c.recoveryDays)}d`
                            : 'not recovered'}
                        </span>
                      )}
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
//  03.5 — Energy equities   (gold_stock_performance)
//  This view is a snapshot per ticker (no time series), so we show a
//  horizontal bar chart of yoy_return_pct, sorted, colored by sign.
// ===========================================================================
function StocksSection() {
  const { data, loading, error, source, lastUpdated } = useApi('/api/energy/stocks');
  const [category, setCategory] = useState('All');
  const [sortDir, setSortDir] = useState('top'); // 'top' | 'bottom'

  const categories = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return ['All'];
    const s = new Set();
    for (const r of data) if (r.category) s.add(r.category);
    return ['All', ...Array.from(s).sort()];
  }, [data]);

  const rows = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    const filtered = data
      .filter((r) => category === 'All' || r.category === category)
      .filter((r) => isNum(r.yoy_return_pct))
      .map((r) => ({ ...r, _yoy: toNum(r.yoy_return_pct) }));
    filtered.sort((a, b) =>
      sortDir === 'top' ? b._yoy - a._yoy : a._yoy - b._yoy,
    );
    return filtered.slice(0, 15).map((r) => ({
      ticker: r.ticker,
      company: r.company_name,
      yoy: r._yoy,
      category: r.category,
      country: r.country_name,
      role: r.energy_role,
      vol: toNum(r.volatility),
      sharpe: toNum(r.sharpe_ratio),
      price: toNum(r.current_price_usd),
    }));
  }, [data, category, sortDir]);

  const isEmpty = !loading && !error && rows.length === 0;

  return (
    <section className="section energy-stocks">
      <div className="container">
        <SectionTag num="03.5" label="Equities · YoY returns" path="/ api / energy / stocks" />
        <div className="panel-head">
          <h2>
            Where <em>capital</em> moved — top 15 by YoY return.
          </h2>
          <DataBadge source={source} lastUpdated={lastUpdated} error={error} loading={loading} />
        </div>

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
          <span className="spacer-flex" />
          <span className="label">Show</span>
          <button
            className={`chip ${sortDir === 'top' ? 'on' : ''}`}
            onClick={() => setSortDir('top')}
          >
            Top
          </button>
          <button
            className={`chip ${sortDir === 'bottom' ? 'on' : ''}`}
            onClick={() => setSortDir('bottom')}
          >
            Bottom
          </button>
        </div>

        <div className="chart-frame">
          <StatePane loading={loading} error={error} empty={isEmpty}>
            <ResponsiveContainer width="100%" height={Math.max(300, rows.length * 26 + 60)}>
              <BarChart
                data={rows}
                layout="vertical"
                margin={{ top: 16, right: 24, left: 8, bottom: 8 }}
              >
                {chartGrid}
                <XAxis type="number" stroke={C.ink4} tick={axisTickStyle} />
                <YAxis
                  type="category"
                  dataKey="ticker"
                  width={90}
                  stroke={C.ink4}
                  tick={axisTickStyle}
                />
                <ReferenceLine x={0} stroke={C.ink4} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  formatter={(value) => [fmtPct(value), 'YoY return']}
                  labelFormatter={(label, payload) => {
                    const p = payload?.[0]?.payload;
                    return p ? `${label} · ${p.company || ''}` : label;
                  }}
                />
                <Bar dataKey="yoy" name="YoY %">
                  {rows.map((r, i) => (
                    <Cell key={i} fill={r.yoy >= 0 ? C.good : C.bad} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </StatePane>
        </div>

        {rows.length > 0 && (
          <div className="stocks-meta">
            <span>
              avg volatility{' '}
              {(() => {
                const vols = rows.map((r) => r.vol).filter((v) => v != null);
                return vols.length ? fmtPct(vols.reduce((s, v) => s + v, 0) / vols.length) : '—';
              })()}
            </span>
            <span>
              avg sharpe{' '}
              {(() => {
                const sh = rows.map((r) => r.sharpe).filter((v) => v != null);
                return sh.length ? fmtNumber(sh.reduce((s, v) => s + v, 0) / sh.length) : '—';
              })()}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

// ===========================================================================
//  03.6 — Country deep-dive   (/api/energy/country/{country_id})
// ===========================================================================
function CountrySection() {
  const { data: overview } = useApi('/api/energy/overview');

  const countries = useMemo(() => {
    if (!Array.isArray(overview) || overview.length === 0) return [];
    // Join on country_name instead of country_id — the gold tables don't
    // share a consistent id, so id-based fan-out queries returned the
    // wrong country's crisis/stocks rows. Names are stable across views.
    // Explicit String() coercion guarantees the id we hand to setPicked
    // is always a string, even if Fabric ever returns a numeric label.
    const seen = new Set();
    const out = [];
    for (const r of overview) {
      const raw = r.country_name;
      if (raw == null || raw === '') continue;
      const name = String(raw);
      if (seen.has(name)) continue;
      seen.add(name);
      out.push({ id: name, name });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }, [overview]);

  const [picked, setPicked] = useState(null);

  // Client-side cache keyed by country_id. Stored in state (not a ref) so
  // adding an entry triggers a re-render. Each entry: { data, source,
  // lastUpdated }.
  const [cache, setCache] = useState({});

  // Always fetch when a country is picked — the FastAPI router has its own
  // 1-hour cache, so repeated calls are cheap. The client cache below is
  // purely for instant re-display and to avoid a network round-trip.
  const path = picked ? `/api/energy/country/${encodeURIComponent(picked)}` : null;
  const fetched = useApi(path);

  // useApi preserves stale state across path changes: between the click
  // (setPicked) and the next time useApi's effect commits a `loading: true`,
  // `fetched.data` still points at the PREVIOUS country. We tag the latest
  // settled fetch with the picked it was for, and refuse to display fetched
  // results until the tag matches the current pick.
  const [fetchedFor, setFetchedFor] = useState(null);

  // Ground-truth check: does fetched.data actually contain rows for the
  // currently-picked country? `loading: false` alone isn't enough —
  // between the click that changes `picked` and useApi's next commit,
  // fetched.data still references the PREVIOUS country. Without this
  // guard the cache would store Australia's payload under the key
  // "Germany".
  const dataMatchesPicked = !!fetched.data?.overview?.some(
    (r) => r.country_name === picked,
  );

  useEffect(() => {
    if (!picked) return;
    if (fetched.loading) return; // wait for the in-flight request to settle
    if (!dataMatchesPicked) return; // stale fetched.data — let the next fetch land
    setFetchedFor(picked);
    if (!cache[picked]) {
      setCache((prev) => ({
        ...prev,
        [picked]: {
          data: fetched.data,
          source: fetched.source || 'live',
          lastUpdated: fetched.lastUpdated || new Date().toISOString(),
        },
      }));
    }
  }, [
    picked,
    cache,
    fetched.loading,
    fetched.data,
    fetched.source,
    fetched.lastUpdated,
    dataMatchesPicked,
  ]);

  // ---- Display selection ------------------------------------------------
  const cachedEntry = picked ? cache[picked] : null;
  // Fetched results are only safe to show when (a) we already tagged this
  // fetch as belonging to `picked` AND (b) the data actually contains a
  // row for `picked`. The dataMatchesPicked check closes the loop — stale
  // data can never leak through.
  const fetchIsForCurrentPick = fetchedFor === picked && dataMatchesPicked;
  const view = cachedEntry
    ? {
        data: cachedEntry.data,
        loading: false,
        error: null,
        source: 'cache',
        lastUpdated: cachedEntry.lastUpdated,
      }
    : fetched.loading || !fetchIsForCurrentPick
    ? { data: null, loading: true, error: null, source: null, lastUpdated: null }
    : {
        data: fetched.data,
        loading: false,
        error: fetched.error,
        source: fetched.source,
        lastUpdated: fetched.lastUpdated,
      };
  const { data, loading, error, source, lastUpdated } = view;

  const buckets = useMemo(() => {
    if (!data || typeof data !== 'object') return null;
    // Bug 4: gold_crisis_analysis can return thousands of dupes. Dedupe by
    // (crisis_id, ticker) for crisis and by ticker for stocks. Keep first.
    const dedupe = (rows, keyFn) => {
      if (!Array.isArray(rows)) return [];
      const seen = new Set();
      const out = [];
      for (const r of rows) {
        const k = keyFn(r);
        if (k == null || seen.has(k)) continue;
        seen.add(k);
        out.push(r);
      }
      return out;
    };
    return {
      overview: Array.isArray(data.overview) ? data.overview : [],
      imports: Array.isArray(data.imports) ? data.imports : [],
      crisis: dedupe(
        data.crisis,
        (r) => `${r.crisis_id ?? r.crisis_name ?? ''}::${r.ticker ?? ''}`,
      ),
      stocks: dedupe(data.stocks, (r) => r.ticker),
    };
  }, [data]);

  const isEmpty =
    picked &&
    !loading &&
    !error &&
    buckets &&
    Object.values(buckets).every((b) => b.length === 0);

  return (
    <section className="section energy-country">
      <div className="container">
        <SectionTag
          num="03.6"
          label="Country · Deep dive"
          path="/ api / energy / country / { id }"
        />
        <div className="panel-head">
          <h2>
            Pick a country, <em>see the system</em> — overview, trade, crises, equities.
          </h2>
          <DataBadge source={source} lastUpdated={lastUpdated} error={error} loading={loading} />
        </div>

        {countries.length > 0 ? (
          <div className="filter-row scroll">
            <span className="label">Country</span>
            {countries.map((c) => (
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
              const showCoverageNote =
                (bucket === 'crisis' || bucket === 'stocks') &&
                !loading &&
                !error &&
                (!rows || rows.length === 0);
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
                    <CountryBucket bucket={bucket} rows={rows} />
                  </StatePane>
                  {showCoverageNote && (
                    <div className="data-note in-cell">
                      ℹ China &amp; Russia: SSE/MOEX exchanges not available on
                      current data plan. Saudi Arabia &amp; Qatar: country ETFs
                      used as proxies.
                    </div>
                  )}
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

// Render each country bucket with the columns that matter for it.
function CountryBucket({ bucket, rows }) {
  if (!rows || rows.length === 0) return null;

  const COLS = {
    overview: [
      ['year', 'Year'],
      ['energy_product', 'Product'],
      ['production_volume', 'Production'],
      ['consumption_volume', 'Consumption'],
      ['self_sufficiency_ratio', 'Self-suff.'],
      ['energy_role', 'Role'],
    ],
    imports: [
      ['year', 'Year'],
      ['energy_product', 'Product'],
      ['import_volume', 'Imports'],
      ['export_volume', 'Exports'],
      ['net_trade_balance', 'Net'],
      ['import_dependency_pct', 'Dep %'],
    ],
    crisis: [
      ['crisis_name', 'Crisis'],
      ['ticker', 'Ticker'],
      ['asset_type', 'Asset'],
      ['crisis_return_pct', 'Return %'],
      ['max_drawdown_pct', 'Max DD %'],
      ['has_recovered', 'Rec?'],
    ],
    stocks: [
      ['ticker', 'Ticker'],
      ['company_name', 'Company'],
      ['category', 'Sector'],
      ['yoy_return_pct', 'YoY %'],
      ['volatility', 'Vol'],
      ['sharpe_ratio', 'Sharpe'],
    ],
  };

  const cols = COLS[bucket] || Object.keys(rows[0]).slice(0, 5).map((k) => [k, k]);

  return (
    <div className="mini-table">
      <table>
        <thead>
          <tr>
            {cols.map(([k, label]) => (
              <th key={k}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 8).map((r, i) => (
            <tr key={i}>
              {cols.map(([k]) => {
                const v = r[k];
                // Booleans first (avoid coercing to numbers).
                if (v === true) return <td key={k}>✓</td>;
                if (v === false) return <td key={k}>—</td>;
                // Numeric values, including numeric strings, get formatted.
                if (isNum(v)) return <td key={k}>{fmtNumber(v)}</td>;
                return <td key={k}>{String(v ?? '—')}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 8 && <div className="more">+ {rows.length - 8} more rows</div>}
    </div>
  );
}

// ===========================================================================
//  03.7 — Data notes (limitations & coverage)
//  Static, page-local data. No fetches, no shared state, fully additive.
// ===========================================================================
const DATA_NOTES = [
  {
    limit: 'Petroleum — consumption only',
    detail:
      'EIA publishes consumption but not production / imports / exports for petroleum. Trade data is filed under "Crude Oil".',
    affected: 'Overview, Country',
  },
  {
    limit: 'Crude Oil — no consumption',
    detail:
      'Crude oil is refined before consumption. EIA tracks consumption at the petroleum level instead.',
    affected: 'Overview, Country',
  },
  {
    limit: 'Coal & Electricity — no benchmark price',
    detail:
      'No single global commodity benchmark exists. Both are traded regionally with widely varying pricing.',
    affected: 'Prices',
  },
  {
    limit: 'China & Russia — no stock coverage',
    detail:
      'SSE, HKEX, and MOEX exchanges are not available on the Twelve Data Groww plan. PetroChina ADR (PTR) was delisted in October 2022.',
    affected: 'Crisis, Stocks, Country',
  },
  {
    limit: 'Saudi Arabia & Qatar — ETF proxies',
    detail:
      'Tadawul and QE exchanges are blocked on the current plan. KSA and QAT country ETFs are used as proxies; KSA is roughly 70 % weighted toward Saudi Aramco.',
    affected: 'Stocks, Country',
  },
  {
    limit: 'Benchmark prices are proxies',
    detail:
      'WTI (crude) and Henry Hub (gas) are used as global proxies. Actual import prices vary by bilateral agreements, LNG contracts, and regional premiums.',
    affected: 'Prices, Overview',
  },
  {
    limit: 'GDP data 1–2 year lag',
    detail:
      'World Bank GDP is verified through 2024. IMF estimates are used for gap-fill — the gdp_data_source column distinguishes verified vs estimated rows.',
    affected: 'Overview',
  },
  {
    limit: 'Iran–Israel crisis ongoing',
    detail:
      'No end date set. Returns shown are crisis-to-date and will move until the crisis resolves.',
    affected: 'Crisis, Country',
  },
];

function DataNotesSection() {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className="section energy-data-notes">
      <div className="container">
        <SectionTag num="03.7" label="Data notes · Limitations" path="/ data / coverage.json" />
        <div className="panel-head">
          <h2>
            What the data <em>doesn’t</em> cover — and why.
          </h2>
          <button
            type="button"
            className={`chip ${expanded ? 'on' : ''}`}
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? 'Hide data notes' : 'Show data notes'}
          </button>
        </div>
        {expanded && (
          <div className="chart-frame">
            <div className="mini-table data-notes-table">
              <table>
                <thead>
                  <tr>
                    <th>Limitation</th>
                    <th>Detail</th>
                    <th>Affected sections</th>
                  </tr>
                </thead>
                <tbody>
                  {DATA_NOTES.map((row) => (
                    <tr key={row.limit}>
                      <td className="limit">{row.limit}</td>
                      <td className="detail">{row.detail}</td>
                      <td className="affected">{row.affected}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
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
      <DataNotesSection />
    </>
  );
}
