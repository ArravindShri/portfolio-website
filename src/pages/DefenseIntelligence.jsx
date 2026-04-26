import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import SectionTag from '../components/SectionTag.jsx';
import SEO from '../components/SEO.jsx';
import useApi from '../lib/useApi.js';

// ---------------------------------------------------------------------------
// Theme tokens (mirrors src/styles/tokens.css). Kept local so chart styling
// is colocated with chart definitions.
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

// ---------------------------------------------------------------------------
// Number coercion / formatting. Static JSON has many nulls; we accept either
// real numbers or numeric strings so future Fabric migrations don't break
// formatting.
// ---------------------------------------------------------------------------
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
// Source data is in millions of USD; spec wants billions for the top-100.
const fmtBillions = (v) => {
  const n = toNum(v);
  if (n == null) return '—';
  return `$${fmtNumber(n / 1000, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}B`;
};

// ---------------------------------------------------------------------------
// Status chrome — same structure as EnergySecurity's, plus a STATIC variant
// because every defense endpoint serves from JSON (X-Data-Source: static).
// ---------------------------------------------------------------------------
function DataBadge({ source, lastUpdated, error, loading }) {
  if (loading) return <span className="data-badge loading">Loading…</span>;
  if (error) return <span className="data-badge err">Error</span>;
  if (!source) return null;
  const ts = lastUpdated ? new Date(lastUpdated).toLocaleDateString() : '';
  const variant =
    source === 'live' ? 'live' : source === 'static' ? 'static' : 'cache';
  const dot =
    source === 'live' ? '● LIVE' : source === 'static' ? '● STATIC' : '○ CACHE';
  return (
    <span className={`data-badge ${variant}`}>
      {dot} {ts && <span className="ts">· {ts}</span>}
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
        <div className="msg">Loading static dataset…</div>
      </div>
    );
  if (error)
    return (
      <div className="pane-state err">
        <div className="msg">Backend error</div>
        <code className="err-detail">{error.message}</code>
        <div className="hint">
          Confirm <code>public/static/defense/*.json</code> is present on the
          backend deploy.
        </div>
      </div>
    );
  if (empty)
    return (
      <div className="pane-state empty">
        <div className="msg">No rows returned</div>
      </div>
    );
  return children;
}

// ---------------------------------------------------------------------------
// Recharts shared chrome.
// ---------------------------------------------------------------------------
const chartGrid = (
  <CartesianGrid stroke={C.rule} strokeDasharray="2 4" vertical={false} />
);
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
//  02.1 — OVERVIEW   (trade_overview.json + conflict_events.json for year)
// ===========================================================================
function OverviewSection() {
  const { data, loading, error, source, lastUpdated } = useApi('/api/defense/overview');
  // Pulled here to compute the most recent year in the dataset for the
  // freshness banner. The §02.5 section also fetches this — same URL, the
  // browser caches it after the first hit.
  const conflict = useApi('/api/defense/conflict');

  const maxYear = useMemo(() => {
    if (!Array.isArray(conflict.data)) return null;
    let m = -Infinity;
    for (const r of conflict.data) {
      const y = toNum(r.year);
      if (y != null && y > m) m = y;
    }
    return m === -Infinity ? null : m;
  }, [conflict.data]);

  const { kpis, topExporters } = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0)
      return { kpis: null, topExporters: [] };
    const totalImports = data.reduce((s, r) => s + (toNum(r.total_imports_deals) ?? 0), 0);
    const totalExports = data.reduce((s, r) => s + (toNum(r.total_exports_deals) ?? 0), 0);
    const balance = data.reduce((s, r) => s + (toNum(r.trade_balance_deals) ?? 0), 0);
    const top = [...data]
      .filter((r) => isNum(r.total_exports_deals))
      .sort((a, b) => toNum(b.total_exports_deals) - toNum(a.total_exports_deals))
      .slice(0, 10)
      .map((r) => ({ country: r.country_name, exports: toNum(r.total_exports_deals) }));
    return {
      kpis: {
        countries: data.length,
        totalImports,
        totalExports,
        balance,
      },
      topExporters: top,
    };
  }, [data]);

  return (
    <section className="section defense-hero">
      <div className="container">
        <SectionTag num="02.1" label="Project · Defense Intelligence" path="/ projects / defense-intelligence" />
        <div className="hero-row">
          <div className="hero-copy">
            <h1>
              Defense <em>Intelligence</em>
            </h1>
            <p className="lede">
              SIPRI arms-transfer registers stitched to ACLED conflict events and
              World Bank fiscal accounts, <em>resolved</em> into a coherent
              picture of who buys, who sells, who fights — and what each
              country trades away to fund it all.
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
                static JSON · trade_overview · {kpis ? `${kpis.countries} countries` : '—'}
              </span>
            </div>
            <div className="freshness-banner static" role="status">
              <span className="diamond" aria-hidden>◇</span>
              <span className="lbl">Static</span>
              <span className="sep">·</span>
              <span className="ts">
                Dataset through {maxYear ?? '—'}
              </span>
            </div>
            <div className="repo-cta">
              <a
                href="https://github.com/ArravindShri/Global-Defense-Conflict-Intelligence"
                target="_blank"
                rel="noopener noreferrer"
                className="repo-link"
              >
                <span className="repo-icon">↗</span>
                <span className="repo-text">
                  <span className="repo-label">GitHub · Source</span>
                  <span className="repo-desc">
                    SIPRI + ACLED pipeline, medallion architecture, 23 tables,
                    Tableau story
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
              <div className="k">Import deals</div>
              <div className="v">{kpis ? fmtNumber(kpis.totalImports) : '—'}</div>
            </div>
            <div className="kpi">
              <div className="k">Export deals</div>
              <div className="v">{kpis ? fmtNumber(kpis.totalExports) : '—'}</div>
            </div>
            <div className="kpi">
              <div className="k">Net balance</div>
              <div className="v">{kpis ? fmtNumber(kpis.balance) : '—'}</div>
            </div>
          </div>
        </div>

        <div className="panel-head sub">
          <h2>
            Top 10 exporters — <em>who arms the world.</em>
          </h2>
        </div>
        <div className="chart-frame">
          <StatePane
            loading={loading}
            error={error}
            empty={!loading && !error && topExporters.length === 0}
          >
            <ResponsiveContainer width="100%" height={420}>
              <BarChart
                data={topExporters}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 16, bottom: 8 }}
              >
                {chartGrid}
                <XAxis type="number" stroke={C.ink4} tick={axisTickStyle} />
                <YAxis
                  type="category"
                  dataKey="country"
                  width={150}
                  stroke={C.ink4}
                  tick={axisTickStyle}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  formatter={(v) => [fmtNumber(v), 'Export deals']}
                />
                <Bar dataKey="exports" fill={C.accent} name="Export deals" />
              </BarChart>
            </ResponsiveContainer>
          </StatePane>
        </div>
      </div>
    </section>
  );
}

// ===========================================================================
//  Shared aggregation hooks for §02.2 + §02.3.
// ===========================================================================
function useTopByDeals(rows, { countryKey, category }) {
  return useMemo(() => {
    if (!Array.isArray(rows) || rows.length === 0) return [];
    const acc = new Map();
    for (const r of rows) {
      if (category !== 'All' && r.weapon_category !== category) continue;
      const c = r[countryKey];
      if (!c) continue;
      const prev = acc.get(c) ?? 0;
      acc.set(c, prev + (toNum(r.deal_count) ?? 0));
    }
    return Array.from(acc.entries())
      .map(([country, deals]) => ({ country, deals }))
      .sort((a, b) => b.deals - a.deals)
      .slice(0, 15);
  }, [rows, countryKey, category]);
}

function useCategories(rows) {
  return useMemo(() => {
    if (!Array.isArray(rows) || rows.length === 0) return ['All'];
    const s = new Set();
    for (const r of rows) if (r.weapon_category) s.add(r.weapon_category);
    return ['All', ...Array.from(s).sort()];
  }, [rows]);
}

// ===========================================================================
//  02.2 — IMPORT ANALYSIS   (imports_analysis.json)
// ===========================================================================
function ImportsSection() {
  const { data, loading, error, source, lastUpdated } = useApi('/api/defense/imports');
  const [category, setCategory] = useState('All');
  const categories = useCategories(data);
  const top = useTopByDeals(data, { countryKey: 'recipient_name', category });

  return (
    <section className="section defense-imports">
      <div className="container">
        <SectionTag num="02.2" label="Import analysis · Recipients" path="/ api / defense / imports" />
        <div className="panel-head">
          <h2>
            Who <em>buys</em>, from whom — global arms import flows.
          </h2>
          <DataBadge source={source} lastUpdated={lastUpdated} error={error} loading={loading} />
        </div>

        <div className="filter-row">
          <span className="label">Weapon</span>
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

        <div className="chart-frame">
          <StatePane
            loading={loading}
            error={error}
            empty={!loading && !error && top.length === 0}
          >
            <ResponsiveContainer width="100%" height={520}>
              <BarChart
                data={top}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 16, bottom: 8 }}
              >
                {chartGrid}
                <XAxis type="number" stroke={C.ink4} tick={axisTickStyle} />
                <YAxis
                  type="category"
                  dataKey="country"
                  width={170}
                  stroke={C.ink4}
                  tick={axisTickStyle}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  formatter={(v) => [fmtNumber(v), 'Deals']}
                />
                <Bar dataKey="deals" fill={C.accent} name="Deals" />
              </BarChart>
            </ResponsiveContainer>
          </StatePane>
        </div>
      </div>
    </section>
  );
}

// ===========================================================================
//  02.3 — EXPORT ANALYSIS   (exports_analysis.json)
// ===========================================================================
function ExportsSection() {
  const { data, loading, error, source, lastUpdated } = useApi('/api/defense/exports');
  const [category, setCategory] = useState('All');
  const categories = useCategories(data);
  const top = useTopByDeals(data, { countryKey: 'supplier_name', category });

  return (
    <section className="section defense-exports">
      <div className="container">
        <SectionTag num="02.3" label="Export analysis · Suppliers" path="/ api / defense / exports" />
        <div className="panel-head">
          <h2>
            Who <em>sells</em> — top suppliers to the world.
          </h2>
          <DataBadge source={source} lastUpdated={lastUpdated} error={error} loading={loading} />
        </div>

        <div className="filter-row">
          <span className="label">Weapon</span>
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

        <div className="chart-frame">
          <StatePane
            loading={loading}
            error={error}
            empty={!loading && !error && top.length === 0}
          >
            <ResponsiveContainer width="100%" height={520}>
              <BarChart
                data={top}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 16, bottom: 8 }}
              >
                {chartGrid}
                <XAxis type="number" stroke={C.ink4} tick={axisTickStyle} />
                <YAxis
                  type="category"
                  dataKey="country"
                  width={170}
                  stroke={C.ink4}
                  tick={axisTickStyle}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  formatter={(v) => [fmtNumber(v), 'Deals']}
                />
                <Bar dataKey="deals" fill={C.good} name="Deals" />
              </BarChart>
            </ResponsiveContainer>
          </StatePane>
        </div>
      </div>
    </section>
  );
}

// ===========================================================================
//  02.4 — PARTNERSHIPS   (partnerships.json)
// ===========================================================================
function PartnershipsSection() {
  const { data, loading, error, source, lastUpdated } = useApi('/api/defense/partnerships');

  const top = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    return [...data]
      .filter((r) => isNum(r.partnership_strength))
      .sort(
        (a, b) =>
          toNum(b.partnership_strength) - toNum(a.partnership_strength),
      )
      .slice(0, 20);
  }, [data]);

  return (
    <section className="section defense-partnerships">
      <div className="container">
        <SectionTag num="02.4" label="Partnerships · Defense corridors" path="/ api / defense / partnerships" />
        <div className="panel-head">
          <h2>
            Defense <em>corridors</em> — who arms whom.
          </h2>
          <DataBadge source={source} lastUpdated={lastUpdated} error={error} loading={loading} />
        </div>

        <div className="chart-frame">
          <StatePane
            loading={loading}
            error={error}
            empty={!loading && !error && top.length === 0}
          >
            <div className="mini-table partnerships-table">
              <table>
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th>Recipient</th>
                    <th>Deals</th>
                    <th>Years</th>
                    <th>Strength</th>
                    <th>Top category</th>
                    <th>Period</th>
                  </tr>
                </thead>
                <tbody>
                  {top.map((r, i) => (
                    <tr key={`${r.supplier_country_name}-${r.recipient_country_name}-${i}`}>
                      <td>{r.supplier_country_name ?? '—'}</td>
                      <td>{r.recipient_country_name ?? '—'}</td>
                      <td className="num">{fmtNumber(r.total_deals)}</td>
                      <td className="num">{fmtNumber(r.years_active)}</td>
                      <td className="num">{fmtNumber(r.partnership_strength)}</td>
                      <td>{r.top_weapon_category ?? '—'}</td>
                      <td className="num">
                        {r.first_trade_year && r.last_trade_year
                          ? `${r.first_trade_year}–${r.last_trade_year}`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </StatePane>
        </div>
      </div>
    </section>
  );
}

// ===========================================================================
//  02.5 — CAUSE & CONSEQUENCE   (conflict_events.json + spending_tradeoffs.json)
// ===========================================================================
function CauseConsequenceSection() {
  const conflict = useApi('/api/defense/conflict');
  const spending = useApi('/api/defense/spending');

  // Country chips: top 8 by total events summed across years.
  const countries = useMemo(() => {
    if (!Array.isArray(conflict.data) || conflict.data.length === 0) return [];
    const acc = new Map();
    for (const r of conflict.data) {
      const c = r.country_name;
      if (!c) continue;
      acc.set(c, (acc.get(c) ?? 0) + (toNum(r.total_events) ?? 0));
    }
    return Array.from(acc.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([country]) => country);
  }, [conflict.data]);

  const [picked, setPicked] = useState(null);
  const effective = picked ?? countries[0] ?? null;

  const conflictSeries = useMemo(() => {
    if (!Array.isArray(conflict.data) || !effective) return [];
    return conflict.data
      .filter((r) => r.country_name === effective)
      .map((r) => ({
        year: r.year,
        events: toNum(r.total_events) ?? 0,
        fatalities: toNum(r.total_fatalities) ?? 0,
      }))
      .sort((a, b) => a.year - b.year);
  }, [conflict.data, effective]);

  const spendingSeries = useMemo(() => {
    if (!Array.isArray(spending.data) || !effective) return [];
    return spending.data
      .filter((r) => r.country_name === effective)
      .map((r) => ({
        year: r.year,
        milex: toNum(r.milex_share_gdp_pct),
        education: toNum(r.education_pct_gdp),
        healthcare: toNum(r.healthcare_pct_gdp),
      }))
      .sort((a, b) => a.year - b.year);
  }, [spending.data, effective]);

  // Latest non-null value for each spending series → small KPI row.
  const latest = useMemo(() => {
    if (!spendingSeries.length) return null;
    const lastWith = (key) => {
      for (let i = spendingSeries.length - 1; i >= 0; i -= 1) {
        if (spendingSeries[i][key] != null) return spendingSeries[i];
      }
      return null;
    };
    return {
      milex: lastWith('milex'),
      edu: lastWith('education'),
      hc: lastWith('healthcare'),
    };
  }, [spendingSeries]);

  const loading = conflict.loading || spending.loading;
  const error = conflict.error || spending.error;
  const source = conflict.source || spending.source;
  const lastUpdated = conflict.lastUpdated || spending.lastUpdated;

  return (
    <section className="section defense-feedback">
      <div className="container">
        <SectionTag num="02.5" label="Cause & consequence" path="/ api / defense / conflict + spending" />
        <div className="panel-head">
          <h2>
            Where <em>conflict</em> meets spending — the feedback loop.
          </h2>
          <DataBadge source={source} lastUpdated={lastUpdated} error={error} loading={loading} />
        </div>

        {countries.length > 0 && (
          <div className="filter-row">
            <span className="label">Country</span>
            {countries.map((c) => (
              <button
                key={c}
                className={`chip ${effective === c ? 'on' : ''}`}
                onClick={() => setPicked(c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="feedback-grid">
          <div className="chart-frame">
            <div className="chart-head">
              <span className="ck">Conflict events</span>
              <span className="cs">{effective || '—'}</span>
            </div>
            <StatePane
              loading={loading}
              error={error}
              empty={!loading && !error && conflictSeries.length === 0}
            >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={conflictSeries}
                  margin={{ top: 12, right: 24, left: 8, bottom: 8 }}
                >
                  {chartGrid}
                  <XAxis dataKey="year" stroke={C.ink4} tick={axisTickStyle} />
                  <YAxis stroke={C.ink4} tick={axisTickStyle} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                  <Legend wrapperStyle={{ fontFamily: axisTickStyle.fontFamily, fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="events"
                    stroke={C.bad}
                    strokeWidth={1.5}
                    dot={false}
                    name="Events"
                  />
                  <Line
                    type="monotone"
                    dataKey="fatalities"
                    stroke={C.warn}
                    strokeWidth={1.2}
                    dot={false}
                    name="Fatalities"
                  />
                </LineChart>
              </ResponsiveContainer>
            </StatePane>
          </div>

          <div className="chart-frame">
            <div className="chart-head">
              <span className="ck">Spending tradeoffs</span>
              <span className="cs">{effective || '—'}</span>
            </div>
            <StatePane
              loading={loading}
              error={error}
              empty={!loading && !error && spendingSeries.length === 0}
            >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={spendingSeries}
                  margin={{ top: 12, right: 24, left: 8, bottom: 8 }}
                >
                  {chartGrid}
                  <XAxis dataKey="year" stroke={C.ink4} tick={axisTickStyle} />
                  <YAxis stroke={C.ink4} tick={axisTickStyle} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                  <Legend wrapperStyle={{ fontFamily: axisTickStyle.fontFamily, fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="milex"
                    stroke={C.accent}
                    strokeWidth={1.6}
                    dot={false}
                    name="Mil. % GDP"
                  />
                  <Line
                    type="monotone"
                    dataKey="education"
                    stroke={C.good}
                    strokeWidth={1.2}
                    dot={false}
                    name="Edu. % GDP"
                  />
                  <Line
                    type="monotone"
                    dataKey="healthcare"
                    stroke="#7BA7C9"
                    strokeWidth={1.2}
                    dot={false}
                    name="Health % GDP"
                  />
                </LineChart>
              </ResponsiveContainer>
            </StatePane>
            {latest && (
              <div className="latest-kpis">
                <div>
                  <span className="k">military</span>
                  <span className="v accent">{fmtPct(latest.milex?.milex)}</span>
                  <span className="y">{latest.milex?.year ?? '—'}</span>
                </div>
                <div>
                  <span className="k">education</span>
                  <span className="v good">{fmtPct(latest.edu?.education)}</span>
                  <span className="y">{latest.edu?.year ?? '—'}</span>
                </div>
                <div>
                  <span className="k">healthcare</span>
                  <span className="v">{fmtPct(latest.hc?.healthcare)}</span>
                  <span className="y">{latest.hc?.year ?? '—'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ===========================================================================
//  02.6 — TOP 100 COMPANIES   (top100_companies.json)
// ===========================================================================
const COMPANY_COLS = [
  ['rank', 'Rank', 'num'],
  ['company_name', 'Company', 'text'],
  ['country_name', 'Country', 'text'],
  ['region', 'Region', 'text'],
  ['arms_revenue', 'Arms revenue', 'usd'],
  ['total_revenue', 'Total revenue', 'usd'],
  ['arms_revenue_pct', 'Arms share', 'pct'],
];

function CompaniesSection() {
  const { data, loading, error, source, lastUpdated } = useApi('/api/defense/companies');
  const [region, setRegion] = useState('All');
  const [sortKey, setSortKey] = useState('rank');
  const [sortDir, setSortDir] = useState('asc');

  const regions = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return ['All'];
    const s = new Set();
    for (const r of data) if (r.region) s.add(r.region);
    return ['All', ...Array.from(s).sort()];
  }, [data]);

  const rows = useMemo(() => {
    if (!Array.isArray(data)) return [];
    const filtered =
      region === 'All' ? data : data.filter((r) => r.region === region);
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [data, region, sortKey, sortDir]);

  const onHeader = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortKey(key);
    // Numeric/percent columns default to descending; text columns ascending.
    setSortDir(key === 'rank' || key === 'company_name' || key === 'country_name' || key === 'region' ? 'asc' : 'desc');
  };

  const renderCell = (r, k, type) => {
    const v = r[k];
    if (type === 'usd') return fmtBillions(v);
    if (type === 'pct') return isNum(v) ? `${fmtNumber(v)}%` : '—';
    if (type === 'num') return fmtNumber(v);
    return v ?? '—';
  };

  return (
    <section className="section defense-companies">
      <div className="container">
        <SectionTag num="02.6" label="Top 100 · Industrial base" path="/ api / defense / companies" />
        <div className="panel-head">
          <h2>
            The defense industrial base — <em>top 100</em> by arms revenue.
          </h2>
          <DataBadge source={source} lastUpdated={lastUpdated} error={error} loading={loading} />
        </div>

        <div className="filter-row">
          <span className="label">Region</span>
          {regions.map((r) => (
            <button
              key={r}
              className={`chip ${region === r ? 'on' : ''}`}
              onClick={() => setRegion(r)}
            >
              {r}
            </button>
          ))}
          <span className="hint">click headers to sort</span>
        </div>

        <div className="chart-frame">
          <StatePane
            loading={loading}
            error={error}
            empty={!loading && !error && rows.length === 0}
          >
            <div className="mini-table companies-table">
              <table>
                <thead>
                  <tr>
                    {COMPANY_COLS.map(([k, label]) => (
                      <th
                        key={k}
                        onClick={() => onHeader(k)}
                        className={`sortable ${sortKey === k ? `sorted ${sortDir}` : ''}`}
                      >
                        {label}
                        {sortKey === k && (
                          <span className="caret">{sortDir === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={`${r.rank}-${r.company_name}`}
                      className={
                        toNum(r.arms_revenue_pct) != null && toNum(r.arms_revenue_pct) > 80
                          ? 'pure-arms'
                          : ''
                      }
                    >
                      {COMPANY_COLS.map(([k, , type]) => (
                        <td
                          key={k}
                          className={
                            type === 'usd' || type === 'pct' || type === 'num' ? 'num' : ''
                          }
                        >
                          {renderCell(r, k, type)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </StatePane>
        </div>
      </div>
    </section>
  );
}

// ===========================================================================
//  Page
// ===========================================================================
export default function DefenseIntelligence() {
  return (
    <>
      <SEO
        title="Defense Intelligence"
        description="Global defense trade analytics — SIPRI arms transfers, ACLED conflict events, spending tradeoffs, and top 100 defense companies. Medallion lakehouse architecture with 23 tables."
        path="/projects/defense-intelligence"
      />
      <OverviewSection />
      <ImportsSection />
      <ExportsSection />
      <PartnershipsSection />
      <CauseConsequenceSection />
      <CompaniesSection />
    </>
  );
}
