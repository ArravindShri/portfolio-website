import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import HowItWorks from '../components/HowItWorks.jsx';
import SectionTag from '../components/SectionTag.jsx';
import SEO from '../components/SEO.jsx';
import useApi from '../lib/useApi.js';

// ---------------------------------------------------------------------------
// Theme tokens (mirrors src/styles/tokens.css).
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
  cool: '#7AA7C9',
};

// Coerce JSON numerics (which may arrive as strings from Decimal columns).
const toNum = (v) => {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === 'boolean') return v ? 1 : 0;
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
const fmtCompact = (v) => {
  const n = toNum(v);
  if (n == null) return '—';
  return Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(n);
};
const fmtRefreshDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Chart styling shared across sections.
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
const chartGrid = <CartesianGrid stroke={C.rule} strokeDasharray="2 4" vertical={false} />;

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
          The Railway backend is up but the Fabric warehouse couldn’t be reached.
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

// ===========================================================================
//  01.1 — Portfolio overview   (gold_stock_performance)
// ===========================================================================
function OverviewSection() {
  const { data, loading, error, source, lastUpdated } = useApi('/api/portfolio/stocks');

  const { ranked, kpis } = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return { ranked: [], kpis: null };
    const rows = data
      .map((r) => ({ ...r, _yoy: toNum(r.yoy_return_pct) }))
      .sort((a, b) => (b._yoy ?? -Infinity) - (a._yoy ?? -Infinity));
    const numeric = rows.filter((r) => r._yoy != null);
    const avg = numeric.length
      ? numeric.reduce((s, r) => s + r._yoy, 0) / numeric.length
      : null;
    const best = numeric[0] || null;
    const worst = numeric[numeric.length - 1] || null;
    return {
      ranked: rows,
      kpis: { count: rows.length, avg, best, worst },
    };
  }, [data]);

  const isEmpty = !loading && !error && ranked.length === 0;

  return (
    <section className="section portfolio-hero">
      <div className="container">
        <SectionTag num="01.1" label="Portfolio · Overview" path="/ projects / investment-portfolio" />
        <div className="hero-row">
          <div className="hero-copy">
            <h1>
              Investment <em>Portfolio</em>
            </h1>
            <p className="lede">
              <em>12 stocks</em> across Nuclear, Rare Earth, Oil & Automotive — tracked
              via Twelve Data, currency-adjusted for an Indian investor, warehoused in
              Fabric.
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
                P1 warehouse · gold_stock_performance · {kpis ? `${kpis.count} rows` : '—'}
              </span>
            </div>
            <div className="freshness-banner live" role="status">
              <span className="dot" aria-hidden />
              <span className="lbl">Fabric · Live</span>
              <span className="sep">—</span>
              <span className="ts">Data as of {fmtRefreshDate(lastUpdated) ?? '—'}</span>
            </div>
            <div className="repo-cta">
              <a
                href="https://github.com/ArravindShri/-Global-Investment-Portfolio-Analytics"
                target="_blank"
                rel="noopener noreferrer"
                className="repo-link"
              >
                <span className="repo-icon">↗</span>
                <span className="repo-text">
                  <span className="repo-label">GitHub · Source</span>
                  <span className="repo-desc">
                    SQL Server → Fabric migration, dbt models, Gold layer
                    stored procedures, daily refresh pipeline
                  </span>
                </span>
              </a>
            </div>
          </div>
          <div className="hero-kpis">
            <div className="kpi">
              <div className="k">Stocks</div>
              <div className="v">{kpis ? fmtNumber(kpis.count) : '—'}</div>
            </div>
            <div className="kpi">
              <div className="k">Avg YoY</div>
              <div className={`v ${kpis?.avg >= 0 ? 'up' : 'dn'}`}>
                {kpis?.avg != null ? fmtPct(kpis.avg) : '—'}
              </div>
            </div>
            <div className="kpi">
              <div className="k">Best</div>
              <div className="v small">
                {kpis?.best ? (
                  <>
                    <span className="tk">{kpis.best.ticker}</span>
                    <span className="up"> {fmtPct(kpis.best._yoy)}</span>
                  </>
                ) : (
                  '—'
                )}
              </div>
            </div>
            <div className="kpi">
              <div className="k">Worst</div>
              <div className="v small">
                {kpis?.worst ? (
                  <>
                    <span className="tk">{kpis.worst.ticker}</span>
                    <span className="dn"> {fmtPct(kpis.worst._yoy)}</span>
                  </>
                ) : (
                  '—'
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="panel-head" style={{ marginTop: 36 }}>
          <h2>
            All twelve <em>side by side</em> — sorted by year-over-year return.
          </h2>
        </div>

        <div className="chart-frame">
          <StatePane loading={loading} error={error} empty={isEmpty}>
            <ResponsiveContainer width="100%" height={Math.max(320, ranked.length * 28 + 40)}>
              <BarChart
                data={ranked}
                layout="vertical"
                margin={{ top: 10, right: 24, left: 8, bottom: 8 }}
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
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  formatter={(value) => [fmtPct(value), 'YoY return']}
                  labelFormatter={(label, payload) => {
                    const p = payload?.[0]?.payload;
                    return p ? `${label} · ${p.company_name || ''}` : label;
                  }}
                />
                <Bar dataKey="_yoy" name="YoY %">
                  {ranked.map((r, i) => (
                    <Cell key={i} fill={(r._yoy ?? 0) >= 0 ? C.good : C.bad} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </StatePane>
        </div>

        {ranked.length > 0 && (
          <div className="chart-frame" style={{ marginTop: 14 }}>
            <div className="mini-table">
              <table>
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Company</th>
                    <th>Category</th>
                    <th className="num">Price</th>
                    <th className="num">YoY %</th>
                    <th className="num">52W High</th>
                    <th className="num">52W Low</th>
                    <th className="num">Vol</th>
                    <th className="num">Sharpe</th>
                    <th className="num">P/E</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((r) => {
                    const yoy = r._yoy;
                    return (
                      <tr key={r.ticker}>
                        <td className="tk">{r.ticker}</td>
                        <td>{r.company_name || '—'}</td>
                        <td className="muted">{r.category || '—'}</td>
                        <td className="num">
                          {isNum(r.current_price) ? fmtNumber(r.current_price) : '—'}
                          {r.currency && (
                            <span className="cur"> {r.currency}</span>
                          )}
                        </td>
                        <td className={`num ${yoy >= 0 ? 'up' : 'dn'}`}>{fmtPct(yoy)}</td>
                        <td className="num">{fmtNumber(r.week_52_high)}</td>
                        <td className="num">{fmtNumber(r.week_52_low)}</td>
                        <td className="num">{fmtPct(r.volatility)}</td>
                        <td className="num">{fmtNumber(r.sharpe_ratio)}</td>
                        <td className="num">{fmtNumber(r.pe_ratio)}</td>
                      </tr>
                    );
                  })}
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
//  01.2 — Currency adjusted returns   (gold_currency_adjusted_returns)
// ===========================================================================
function CurrencySection() {
  const { data, loading, error, source, lastUpdated } = useApi('/api/portfolio/currency-returns');

  const { rows, kpis } = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return { rows: [], kpis: null };
    const r = data.map((d) => ({
      ticker: d.ticker,
      company: d.company_name,
      currency: d.original_currency,
      local: toNum(d.return_local_pct),
      inr: toNum(d.return_inr_pct),
      impact: toNum(d.currency_impact_pct),
    }));
    const sorted = [...r].sort((a, b) => (b.inr ?? -Infinity) - (a.inr ?? -Infinity));
    const impacts = r.map((x) => x.impact).filter((x) => x != null);
    const avgImpact = impacts.length ? impacts.reduce((s, v) => s + v, 0) / impacts.length : null;
    const helped = impacts.filter((x) => x > 0).length;
    const hurt = impacts.filter((x) => x < 0).length;
    return { rows: sorted, kpis: { avgImpact, helped, hurt, total: r.length } };
  }, [data]);

  const isEmpty = !loading && !error && rows.length === 0;

  return (
    <section className="section portfolio-currency">
      <div className="container">
        <SectionTag num="01.2" label="Currency · INR adjusted" path="/ api / portfolio / currency-returns" />
        <div className="panel-head">
          <h2>
            What you <em>actually</em> earned — after the rupee moved.
          </h2>
          <DataBadge source={source} lastUpdated={lastUpdated} error={error} loading={loading} />
        </div>
        <p className="sub-lede">
          Local returns vs INR returns. Positive currency impact = rupee weakness added alpha.
        </p>

        <div className="chart-frame">
          <StatePane loading={loading} error={error} empty={isEmpty}>
            <ResponsiveContainer width="100%" height={Math.max(360, rows.length * 30 + 60)}>
              <BarChart
                data={rows}
                layout="vertical"
                margin={{ top: 10, right: 28, left: 8, bottom: 8 }}
                barCategoryGap="22%"
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
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  formatter={(value, name) => [fmtPct(value), name]}
                  labelFormatter={(label, payload) => {
                    const p = payload?.[0]?.payload;
                    return p ? `${label} · ${p.currency || ''}` : label;
                  }}
                />
                <Legend wrapperStyle={{ fontFamily: axisTickStyle.fontFamily, fontSize: 11 }} />
                <Bar dataKey="local" name="Local return" fill={C.ink3} />
                <Bar dataKey="inr" name="INR return" fill={C.accent} />
              </BarChart>
            </ResponsiveContainer>
          </StatePane>
        </div>

        {kpis && (
          <div className="currency-kpis">
            <div className="ckpi">
              <div className="k">Avg currency impact</div>
              <div className={`v ${(kpis.avgImpact ?? 0) >= 0 ? 'up' : 'dn'}`}>
                {kpis.avgImpact != null ? fmtPct(kpis.avgImpact) : '—'}
              </div>
            </div>
            <div className="ckpi">
              <div className="k">Forex helped</div>
              <div className="v up">{kpis.helped} / {kpis.total}</div>
            </div>
            <div className="ckpi">
              <div className="k">Forex hurt</div>
              <div className="v dn">{kpis.hurt} / {kpis.total}</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ===========================================================================
//  01.3 — Category performance   (gold_category_performance)
// ===========================================================================
function CategorySection() {
  const { data, loading, error, source, lastUpdated } = useApi('/api/portfolio/categories');

  const cards = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    return data
      .map((r) => ({
        category: r.category,
        avgRet: toNum(r.average_yoy_return_pct),
        avgVol: toNum(r.avg_volatility),
        best: r.best_stock,
        worst: r.worst_stock,
        avgPe: toNum(r.avg_pe_ratio),
        marketCap: toNum(r.total_market_cap),
        avgYield: toNum(r.avg_dividend_yield),
      }))
      .sort((a, b) => (b.avgRet ?? -Infinity) - (a.avgRet ?? -Infinity));
  }, [data]);

  const chartRows = useMemo(
    () => cards.map((c) => ({ category: c.category, value: c.avgRet })),
    [cards],
  );

  const isEmpty = !loading && !error && cards.length === 0;

  return (
    <section className="section portfolio-categories">
      <div className="container">
        <SectionTag num="01.3" label="Categories · Thesis" path="/ api / portfolio / categories" />
        <div className="panel-head">
          <h2>
            By thesis — where the <em>alpha</em> lives.
          </h2>
          <DataBadge source={source} lastUpdated={lastUpdated} error={error} loading={loading} />
        </div>

        <StatePane loading={loading} error={error} empty={isEmpty}>
          <div className="category-cards">
            {cards.map((c) => {
              const dir = (c.avgRet ?? 0) >= 0 ? 'up' : 'dn';
              return (
                <div key={c.category} className="card cat-card">
                  <div className="card-head">{c.category}</div>
                  <div className={`big-num ${dir}`}>{fmtPct(c.avgRet)}</div>
                  <div className="card-grid">
                    <div className="stat">
                      <span className="lbl">Avg vol</span>
                      <span className="val">{fmtPct(c.avgVol)}</span>
                    </div>
                    <div className="stat">
                      <span className="lbl">Avg P/E</span>
                      <span className="val">{fmtNumber(c.avgPe)}</span>
                    </div>
                    <div className="stat">
                      <span className="lbl">Best</span>
                      <span className="val tk">{c.best || '—'}</span>
                    </div>
                    <div className="stat">
                      <span className="lbl">Worst</span>
                      <span className="val tk">{c.worst || '—'}</span>
                    </div>
                    <div className="stat span-2">
                      <span className="lbl">Total mkt cap</span>
                      <span className="val">{fmtCompact(c.marketCap)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="chart-frame" style={{ marginTop: 18 }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartRows} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
                {chartGrid}
                <XAxis dataKey="category" stroke={C.ink4} tick={axisTickStyle} />
                <YAxis stroke={C.ink4} tick={axisTickStyle} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  formatter={(value) => [fmtPct(value), 'Avg YoY']}
                />
                <Bar dataKey="value" name="Avg YoY %">
                  {chartRows.map((r, i) => (
                    <Cell key={i} fill={(r.value ?? 0) >= 0 ? C.good : C.bad} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </StatePane>
      </div>
    </section>
  );
}

// ===========================================================================
//  01.4 — Region performance   (gold_region_performance)
// ===========================================================================
function RegionSection() {
  const { data, loading, error, source, lastUpdated } = useApi('/api/portfolio/regions');

  const cards = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    return data
      .map((r) => ({
        region: r.region,
        avgRet: toNum(r.avg_yoy_return_pct),
        avgVol: toNum(r.avg_volatility),
        avgSharpe: toNum(r.avg_sharpe_ratio),
        stockCount: toNum(r.stock_count),
        bestCategory: r.best_category,
        forex: toNum(r.avg_currency_impact_pct),
      }))
      .sort((a, b) => (b.avgRet ?? -Infinity) - (a.avgRet ?? -Infinity));
  }, [data]);

  const chartRows = useMemo(
    () => cards.map((c) => ({ region: c.region, value: c.avgRet })),
    [cards],
  );

  const isEmpty = !loading && !error && cards.length === 0;

  return (
    <section className="section portfolio-regions">
      <div className="container">
        <SectionTag num="01.4" label="Regions · Geography" path="/ api / portfolio / regions" />
        <div className="panel-head">
          <h2>
            By geography — regional bets and <em>forex drag</em>.
          </h2>
          <DataBadge source={source} lastUpdated={lastUpdated} error={error} loading={loading} />
        </div>

        <StatePane loading={loading} error={error} empty={isEmpty}>
          <div className="region-cards">
            {cards.map((c) => {
              const dir = (c.avgRet ?? 0) >= 0 ? 'up' : 'dn';
              const fxDir = (c.forex ?? 0) >= 0 ? 'up' : 'dn';
              return (
                <div key={c.region} className="card region-card">
                  <div className="card-head">{c.region}</div>
                  <div className={`big-num ${dir}`}>{fmtPct(c.avgRet)}</div>
                  <div className="card-grid">
                    <div className="stat">
                      <span className="lbl">Stocks</span>
                      <span className="val">{c.stockCount ?? '—'}</span>
                    </div>
                    <div className="stat">
                      <span className="lbl">Avg vol</span>
                      <span className="val">{fmtPct(c.avgVol)}</span>
                    </div>
                    <div className="stat">
                      <span className="lbl">Avg sharpe</span>
                      <span className="val">{fmtNumber(c.avgSharpe)}</span>
                    </div>
                    <div className="stat">
                      <span className="lbl">Best cat.</span>
                      <span className="val">{c.bestCategory || '—'}</span>
                    </div>
                    <div className="stat span-2 forex">
                      <span className="lbl">Forex impact</span>
                      <span className={`val ${fxDir}`}>{fmtPct(c.forex)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="chart-frame" style={{ marginTop: 18 }}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartRows} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
                {chartGrid}
                <XAxis dataKey="region" stroke={C.ink4} tick={axisTickStyle} />
                <YAxis stroke={C.ink4} tick={axisTickStyle} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  formatter={(value) => [fmtPct(value), 'Avg YoY']}
                />
                <Bar dataKey="value" name="Avg YoY %">
                  {chartRows.map((r, i) => (
                    <Cell key={i} fill={(r.value ?? 0) >= 0 ? C.good : C.bad} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </StatePane>
      </div>
    </section>
  );
}

// ===========================================================================
//  01.5 — Dividend analysis   (gold_dividend_analysis)
// ===========================================================================
function DividendSection() {
  const { data, loading, error, source, lastUpdated } = useApi('/api/portfolio/dividends');
  const [filter, setFilter] = useState('all'); // 'all' | 'payers'

  const { rows, payerRows } = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return { rows: [], payerRows: [] };
    const all = data.map((r) => ({
      ticker: r.ticker,
      company: r.company_name,
      category: r.category,
      region: r.region,
      price: toNum(r.stock_price),
      annual: toNum(r.annual_dividend),
      yield_: toNum(r.dividend_yield_pct),
      payout: toNum(r.payout_ratio),
      inr: toNum(r.dividend_in_inr),
      pays: toNum(r.pays_dividend) === 1,
    }));
    const payers = all
      .filter((r) => r.pays && r.yield_ != null)
      .sort((a, b) => (b.yield_ ?? 0) - (a.yield_ ?? 0));
    return { rows: all, payerRows: payers };
  }, [data]);

  const tableRows = filter === 'payers' ? rows.filter((r) => r.pays) : rows;
  const isEmpty = !loading && !error && rows.length === 0;

  return (
    <section className="section portfolio-dividends">
      <div className="container">
        <SectionTag num="01.5" label="Dividends · Income" path="/ api / portfolio / dividends" />
        <div className="panel-head">
          <h2>
            Income layer — yield, payout, and <em>INR conversion</em>.
          </h2>
          <DataBadge source={source} lastUpdated={lastUpdated} error={error} loading={loading} />
        </div>

        <div className="filter-row">
          <span className="label">Show</span>
          <button
            className={`chip ${filter === 'all' ? 'on' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`chip ${filter === 'payers' ? 'on' : ''}`}
            onClick={() => setFilter('payers')}
          >
            Payers only
          </button>
          <span className="hint">
            {payerRows.length} of {rows.length} pay dividends
          </span>
        </div>

        <div className="chart-frame">
          <StatePane loading={loading} error={error} empty={isEmpty || payerRows.length === 0}>
            <ResponsiveContainer width="100%" height={Math.max(260, payerRows.length * 30 + 40)}>
              <BarChart
                data={payerRows}
                layout="vertical"
                margin={{ top: 10, right: 24, left: 8, bottom: 8 }}
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
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  formatter={(value) => [fmtPct(value), 'Yield']}
                  labelFormatter={(label, payload) => {
                    const p = payload?.[0]?.payload;
                    return p ? `${label} · ${p.company || ''}` : label;
                  }}
                />
                <Bar dataKey="yield_" name="Dividend yield %" fill={C.accent} />
              </BarChart>
            </ResponsiveContainer>
          </StatePane>
        </div>

        {tableRows.length > 0 && (
          <div className="chart-frame" style={{ marginTop: 14 }}>
            <div className="mini-table dividend-table">
              <table>
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Company</th>
                    <th className="num">Price</th>
                    <th className="num">Annual Div</th>
                    <th className="num">Yield %</th>
                    <th className="num">Payout</th>
                    <th className="num">Div in INR</th>
                    <th>Pays</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((r) => (
                    <tr key={r.ticker} className={r.pays ? 'payer' : 'non-payer'}>
                      <td className="tk">{r.ticker}</td>
                      <td>{r.company || '—'}</td>
                      <td className="num">{fmtNumber(r.price)}</td>
                      <td className="num">{fmtNumber(r.annual)}</td>
                      <td className="num">{fmtPct(r.yield_)}</td>
                      <td className="num">{fmtPct(r.payout)}</td>
                      <td className="num inr">
                        {r.inr != null ? `₹ ${fmtNumber(r.inr)}` : '—'}
                      </td>
                      <td className={r.pays ? 'good' : 'muted'}>{r.pays ? '✓' : '—'}</td>
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
//  01.6 — Correlation matrix   (gold_correlation_matrix)
// ===========================================================================
function corrColor(v, isDiag) {
  if (isDiag) return 'rgba(218, 119, 86, 0.78)';
  if (v == null) return 'transparent';
  if (v >= 0.7) return 'rgba(218, 119, 86, 0.55)';
  if (v >= 0.3) return 'rgba(218, 119, 86, 0.22)';
  if (v >= -0.3) return 'rgba(138, 130, 118, 0.13)';
  return 'rgba(122, 167, 201, 0.4)';
}
function corrTextColor(v, isDiag) {
  if (isDiag) return '#0F0E0C';
  if (v == null) return '#5A5348';
  if (v >= 0.7) return '#F2EDE4';
  return '#C9C1B3';
}

function CorrelationSection() {
  const { data, loading, error, source, lastUpdated } = useApi('/api/portfolio/correlation');

  const { tickers, lookup } = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return { tickers: [], lookup: new Map() };
    const set = new Set();
    const map = new Map();
    for (const r of data) {
      const a = r.stock_1;
      const b = r.stock_2;
      const c = toNum(r.correlation_coefficient);
      if (!a || !b || c == null) continue;
      set.add(a);
      set.add(b);
      map.set(`${a}::${b}`, c);
      map.set(`${b}::${a}`, c);
    }
    return { tickers: Array.from(set).sort(), lookup: map };
  }, [data]);

  const isEmpty = !loading && !error && tickers.length === 0;

  return (
    <section className="section portfolio-correlation">
      <div className="container">
        <SectionTag num="01.6" label="Correlation · Diversification" path="/ api / portfolio / correlation" />
        <div className="panel-head">
          <h2>
            How they move together — the <em>diversification</em> grid.
          </h2>
          <DataBadge source={source} lastUpdated={lastUpdated} error={error} loading={loading} />
        </div>

        <div className="corr-legend">
          <span className="lbl">Correlation</span>
          <span className="swatch" style={{ background: 'rgba(122, 167, 201, 0.4)' }} />
          <span className="rng">&lt; −0.3</span>
          <span className="swatch" style={{ background: 'rgba(138, 130, 118, 0.13)' }} />
          <span className="rng">−0.3 ↔ 0.3</span>
          <span className="swatch" style={{ background: 'rgba(218, 119, 86, 0.22)' }} />
          <span className="rng">≥ 0.3</span>
          <span className="swatch" style={{ background: 'rgba(218, 119, 86, 0.55)' }} />
          <span className="rng">≥ 0.7</span>
        </div>

        <div className="chart-frame">
          <StatePane loading={loading} error={error} empty={isEmpty}>
            <div className="corr-wrap">
              <table className="correlation-grid">
                <thead>
                  <tr>
                    <th className="corner" />
                    {tickers.map((t) => (
                      <th key={t} className="rot">
                        <div className="rot-inner">{t}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickers.map((rowT, i) => (
                    <tr key={rowT}>
                      <th className="row-h">{rowT}</th>
                      {tickers.map((colT, j) => {
                        const isDiag = i === j;
                        const v = isDiag ? 1 : lookup.get(`${rowT}::${colT}`) ?? null;
                        const display = v == null ? '—' : v.toFixed(2);
                        return (
                          <td
                            key={colT}
                            style={{
                              background: corrColor(v, isDiag),
                              color: corrTextColor(v, isDiag),
                            }}
                            title={`${rowT} · ${colT} = ${display}`}
                          >
                            {display}
                          </td>
                        );
                      })}
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
export default function InvestmentPortfolio() {
  return (
    <>
      <SEO
        title="Investment Portfolio Analytics"
        description="12-stock portfolio across Nuclear, Rare Earth, Oil, and Automotive sectors. Currency-adjusted returns for an Indian investor, correlation heatmap, dividend analysis. Fabric warehouse with daily refresh."
        path="/projects/investment-portfolio"
      />
      <OverviewSection />
      <HowItWorks
        projectName="Investment Portfolio"
        refreshSchedule="Daily at 3:15 AM IST"
        dataSources={['Twelve Data API', 'yfinance', 'World Bank']}
        pipeline="Fabric Notebooks → dbt → Gold Tables → JSON Export → Vercel CDN"
        dashboardUrl="https://app.fabric.microsoft.com/reportEmbed?reportId=641cb62b-f44c-4fb5-8236-40efca0f216b&autoAuth=true&ctid=fef10f0c-5dcc-4598-97ed-663c2bce42a5"
        dashboardLabel="Power BI Dashboard"
        detailedPipeline="Twelve Data + yfinance → Fabric Notebooks (Bronze, 2:35 AM IST) → dbt (Silver/Gold, 3:00 AM IST) → GitHub Actions export (3:15 AM IST) → Static JSON on Vercel CDN → This page"
      />
      <CurrencySection />
      <CategorySection />
      <RegionSection />
      <DividendSection />
      <CorrelationSection />
    </>
  );
}
