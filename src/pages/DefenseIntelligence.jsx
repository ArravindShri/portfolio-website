/* Defense Intelligence — deep-dive page (rebuilt from claude.ai/design package).
 *
 * Architecture: 1 hero + 6 sections (§02.1 Trade, §02.2 Budgets, §02.3 Conflict,
 * §02.4 Partners, §02.5 Country, §02.6 Companies) + DefenseFooter.
 * Charts are bespoke SVG primitives (Panel/BarChart/LineChart) ported from
 * the design package. Live data flows from /static/defense/*.json via useApi.
 */

import { useEffect, useMemo, useState } from 'react';
import { Panel, BarChart, LineChart, CHART_COLORS } from '../components/defense/Chart.jsx';
import { WorldMap } from '../components/defense/WorldMap.jsx';
import { MapTooltip } from '../components/defense/MapTooltip.jsx';
import {
  G_Crosshair, G_Tank, G_Radar, G_Globe, G_Frigate, G_Satellite,
} from '../components/defense/Glyphs.jsx';
import HowItWorks from '../components/HowItWorks.jsx';
import useApi from '../lib/useApi.js';
import SEO from '../components/SEO.jsx';

/* ─── Helpers ─── */
const toNum = (v) => {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};
const isNum = (v) => toNum(v) !== null;
const fmtNum = (n) => {
  const x = toNum(n);
  if (x == null) return '—';
  const a = Math.abs(x);
  if (a >= 1_000_000) return (x / 1_000_000).toFixed(2) + 'M';
  if (a >= 1_000) return (x / 1_000).toFixed(1) + 'K';
  return x.toLocaleString();
};

/* ISO 3166-1 numeric codes — countries we have data for or that anchor flows. */
const ISO_NUM = {
  'United States': '840', 'USA': '840', 'Russia': '643', 'France': '250', 'Germany': '276',
  'China': '156', 'United Kingdom': '826', 'UK': '826', 'Italy': '380', 'Israel': '376',
  'South Korea': '410', 'Spain': '724', 'Sweden': '752', 'Netherlands': '528',
  'Turkey': '792', 'Ukraine': '804', 'Australia': '036', 'Canada': '124',
  'Norway': '578', 'Switzerland': '756', 'Belgium': '056', 'Czechia': '203',
  'Czech Republic': '203', 'Poland': '616', 'Brazil': '076', 'Japan': '392', 'India': '356',
  'Saudi Arabia': '682', 'Pakistan': '586', 'Egypt': '818', 'Thailand': '764',
  'Indonesia': '360', 'United Arab Emirates': '784', 'UAE': '784', 'Qatar': '634',
  'Kuwait': '414', 'Iraq': '368', 'Iran': '364', 'Algeria': '012',
  'Morocco': '504', 'South Africa': '710', 'Nigeria': '566', 'Kenya': '404',
  'Ethiopia': '231', 'Vietnam': '704', 'Philippines': '608', 'Malaysia': '458',
  'Singapore': '702', 'Taiwan': '158', 'Bangladesh': '050', 'Sri Lanka': '144',
  'Mexico': '484', 'Argentina': '032', 'Colombia': '170', 'Chile': '152',
  'Peru': '604', 'Venezuela': '862', 'Greece': '300', 'Romania': '642',
  'Hungary': '348', 'Finland': '246', 'Denmark': '208', 'Portugal': '620',
  'Austria': '040', 'Ireland': '372', 'Bulgaria': '100', 'Croatia': '191',
  'Serbia': '688', 'Slovakia': '703', 'Belarus': '112', 'Kazakhstan': '398',
  'Uzbekistan': '860', 'Azerbaijan': '031', 'Armenia': '051', 'Georgia': '268',
  'Jordan': '400', 'Lebanon': '422', 'Syria': '760', 'Yemen': '887',
  'Oman': '512', 'Bahrain': '048', 'Afghanistan': '004', 'Myanmar': '104',
  'Cambodia': '116', 'Laos': '418', 'Mongolia': '496', 'North Korea': '408',
  'New Zealand': '554',
};
// Build NAME_BY_ID keeping the FIRST canonical name per ISO code so aliases
// like 'USA', 'UK', 'UAE' don't overwrite the canonical 'United States',
// 'United Kingdom', 'United Arab Emirates' (which is what the data uses).
const NAME_BY_ID = (() => {
  const m = {};
  for (const [name, id] of Object.entries(ISO_NUM)) {
    if (!(id in m)) m[id] = name;
  }
  return m;
})();

const REGION_COLORS = {
  'Europe': '#DA7756',
  'Middle East': '#D9A441',
  'Africa': '#9DB17C',
  'Asia': '#8A8276',
  'Americas': '#C45C4A',
  'Oceania': '#5A5348',
};

/* ─── Inline status indicators ─── */
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
  if (loading) return <div className="pane-state loading"><div className="dots"><span /><span /><span /></div><div className="msg">Loading…</div></div>;
  if (error) return <div className="pane-state err"><div className="msg">Error</div><code className="err-detail">{error.message}</code></div>;
  if (empty) return <div className="pane-state empty"><div className="msg">No rows returned</div></div>;
  return children;
}

/* ────────────────────────────────────────────────────────────────────────
 * DEFENSE HERO (preserves GitHub CTA + freshness banner + HowItWorks)
 * ──────────────────────────────────────────────────────────────────────── */
function DefenseHero() {
  const overview = useApi('/api/defense/overview');
  const trade = overview.data ?? [];

  const datasetYear = useMemo(() => {
    if (!Array.isArray(trade) || !trade.length) return null;
    let yMax = null;
    trade.forEach((r) => {
      const y = toNum(r.year);
      if (y != null && (yMax == null || y > yMax)) yMax = y;
    });
    return yMax;
  }, [trade]);

  return (
    <section className="dd-hero defense-hero">
      <span className="crosshair-mark"><span></span></span>
      <div className="container">
        <nav className="dd-crumbs">
          <a href="/">◆ HOME</a>
          <span className="sep">/</span>
          <a href="/projects">PROJECTS</a>
          <span className="sep">/</span>
          <span className="here">DEFENSE & CONFLICT</span>
        </nav>

        <div className="dd-title-row">
          <div className="dd-title">
            <span className="project-id">◆ PRJ-002 · Global Defense &amp; Conflict Intelligence</span>
            <h1>Rafale jets, trade flows, and the <em>math</em> behind "strategic partnership."</h1>
            <p className="story">
              Five data sources stitched into a single warehouse. <em>The hook</em> is partnership
              "strength" — arms flows, joint exercises, treaty depth — turned into a measurable
              index, so you can watch relationships warm and cool over time.
            </p>
          </div>

          <aside className="dd-meta-card">
            <div className="head">
              <span>◆ project_meta</span>
              <span className="live">ACTIVE</span>
            </div>
            <div className="row"><span className="k">stack</span><span className="v">SQL Server · Python · Tableau</span></div>
            <div className="row"><span className="k">data src</span><span className="v">SIPRI · ACLED · WB</span></div>
            <div className="row"><span className="k">panel</span><span className="v">8 countries · 4 regions</span></div>
            <div className="row"><span className="k">tickers</span><span className="v">SIPRI Top 100 firms</span></div>
            <div className="row"><span className="k">time</span><span className="v">2018 — {datasetYear ?? '2024'}</span></div>
            <div className="row"><span className="k">refresh</span><span className="v">quarterly · static export</span></div>
          </aside>
        </div>

        <div className="dd-badges">
          <span className="dd-badge accent">◆ partnership-graph scoring</span>
          <span className="dd-badge">arms trade flow</span>
          <span className="dd-badge">conflict intensity</span>
          <span className="dd-badge">geopolitical risk</span>
          <span className="dd-badge">defense industrial base</span>
        </div>

        <div className="arch-strip">
          <div className="node">
            <div className="k">01 · sources</div>
            <div className="v">Public feeds</div>
            <div className="sub">SIPRI · ACLED · WB</div>
          </div>
          <div className="node">
            <div className="k">02 · ingest</div>
            <div className="v">Python ETL</div>
            <div className="sub">REST · CSV · XML</div>
          </div>
          <div className="node">
            <div className="k">03 · warehouse</div>
            <div className="v">Medallion</div>
            <div className="sub">23 gold tables</div>
          </div>
          <div className="node">
            <div className="k">04 · transform</div>
            <div className="v">Views + SPs</div>
            <div className="sub">partnership scoring</div>
          </div>
          <div className="node">
            <div className="k">05 · serve</div>
            <div className="v">Static JSON</div>
            <div className="sub">Vercel CDN</div>
          </div>
        </div>

        {/* Existing extras preserved */}
        <div className="freshness-banner live" style={{ marginBottom: 12 }}>
          <span className="dot-live">●</span>
          <span className="ts">FABRIC · DAILY — Dataset through {datasetYear ?? '—'}</span>
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
                SIPRI + ACLED pipeline, medallion architecture, 23 tables, Tableau story
              </span>
            </span>
          </a>
        </div>
        <HowItWorks
          projectName="Defense Intelligence"
          refreshSchedule="Quarterly (manual export from SIPRI + ACLED)"
          dataSources={['SIPRI Arms Transfers', 'ACLED Conflict Data']}
          pipeline="SQL Server → Medallion Architecture → 23 Gold Tables → JSON Export"
          dashboardUrl="https://public.tableau.com/views/GlobalDefenceConflictIntelligenceAnalysis/GlobalTradeOverview?:language=en-US&:sid=&:redirect=auth&:display_count=n&:origin=viz_share_link"
          dashboardLabel="Tableau Dashboard"
        />
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * §02.1 — TRADE
 * ──────────────────────────────────────────────────────────────────────── */
function S1Trade() {
  const exports = useApi('/api/defense/exports');
  const imports = useApi('/api/defense/imports');
  const overview = useApi('/api/defense/overview');

  const exportersBars = useMemo(() => {
    if (!Array.isArray(exports.data)) return [];
    const acc = new Map();
    for (const r of exports.data) {
      const k = r.supplier_name; if (!k) continue;
      const v = toNum(r.deal_count) ?? 0;
      acc.set(k, (acc.get(k) || 0) + v);
    }
    return Array.from(acc.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, v], i) => ({
        label, v,
        color: i < 2 ? CHART_COLORS.ACCENT : i < 4 ? CHART_COLORS.WARN : CHART_COLORS.GOOD,
      }));
  }, [exports.data]);

  const importersBars = useMemo(() => {
    if (!Array.isArray(imports.data)) return [];
    const acc = new Map();
    for (const r of imports.data) {
      const k = r.recipient_name; if (!k) continue;
      const v = toNum(r.deal_count) ?? 0;
      acc.set(k, (acc.get(k) || 0) + v);
    }
    return Array.from(acc.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, v], i) => ({
        label, v,
        color: i < 2 ? CHART_COLORS.ACCENT : i < 4 ? CHART_COLORS.WARN : CHART_COLORS.GOOD,
      }));
  }, [imports.data]);

  const flow = useMemo(() => {
    if (!Array.isArray(exports.data)) return null;
    const pairAcc = new Map(), supAcc = new Map(), recAcc = new Map();
    for (const r of exports.data) {
      const s = r.supplier_name, c = r.recipient_name;
      if (!s || !c) continue;
      const v = toNum(r.deal_count) ?? 0;
      pairAcc.set(`${s}::${c}`, (pairAcc.get(`${s}::${c}`) || 0) + v);
      supAcc.set(s, (supAcc.get(s) || 0) + v);
      recAcc.set(c, (recAcc.get(c) || 0) + v);
    }
    const rows = Array.from(supAcc.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map((e) => e[0]);
    const cols = Array.from(recAcc.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map((e) => e[0]);
    const grid = {};
    rows.forEach((s) => {
      grid[s] = {};
      cols.forEach((c) => { grid[s][c] = pairAcc.get(`${s}::${c}`) || 0; });
    });
    return { rows, cols, grid };
  }, [exports.data]);

  const tradeMap = useMemo(() => {
    if (!Array.isArray(overview.data)) return null;
    const byId = {};
    for (const r of overview.data) {
      const name = r.country_name;
      const id = ISO_NUM[name];
      if (!id) continue;
      const exp = toNum(r.total_exports_deals) ?? 0;
      const imp = toNum(r.total_imports_deals) ?? 0;
      byId[id] = { name, exports: exp, imports: imp, balance: exp - imp };
    }
    return byId;
  }, [overview.data]);

  const topPartners = useMemo(() => {
    const out = {};
    if (Array.isArray(exports.data)) {
      const byCountry = {};
      for (const r of exports.data) {
        const c = r.supplier_name; if (!c) continue;
        const k = r.recipient_name; if (!k) continue;
        const v = toNum(r.deal_count) ?? 0;
        if (!byCountry[c]) byCountry[c] = new Map();
        byCountry[c].set(k, (byCountry[c].get(k) || 0) + v);
      }
      for (const c of Object.keys(byCountry)) {
        out[c] = out[c] || {};
        out[c].topExport = Array.from(byCountry[c].entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map((e) => e[0]);
      }
    }
    if (Array.isArray(imports.data)) {
      const byCountry = {};
      for (const r of imports.data) {
        const c = r.recipient_name; if (!c) continue;
        const k = r.supplier_name; if (!k) continue;
        const v = toNum(r.deal_count) ?? 0;
        if (!byCountry[c]) byCountry[c] = new Map();
        byCountry[c].set(k, (byCountry[c].get(k) || 0) + v);
      }
      for (const c of Object.keys(byCountry)) {
        out[c] = out[c] || {};
        out[c].topImport = Array.from(byCountry[c].entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map((e) => e[0]);
      }
    }
    return out;
  }, [exports.data, imports.data]);

  const [hover, setHover] = useState(null);

  const kpi = useMemo(() => {
    if (!tradeMap) return { totalDeals: 0, totalCountries: 0, topExporter: '—', topImporter: '—' };
    const entries = Object.values(tradeMap);
    const totalDeals = entries.reduce((s, e) => s + e.exports + e.imports, 0);
    const topExp = entries.slice().sort((a, b) => b.exports - a.exports)[0];
    const topImp = entries.slice().sort((a, b) => b.imports - a.imports)[0];
    return {
      totalDeals,
      totalCountries: entries.length,
      topExporter: topExp?.name || '—',
      topImporter: topImp?.name || '—',
    };
  }, [tradeMap]);

  let tip = null;
  if (hover && tradeMap) {
    const t = tradeMap[hover.id];
    if (t) {
      const partners = topPartners[t.name] || {};
      tip = {
        name: t.name,
        lines: [
          { k: 'Exports', v: fmtNum(t.exports) + ' deals' },
          { k: 'Imports', v: fmtNum(t.imports) + ' deals' },
          { k: 'Balance', v: (t.balance > 0 ? '+' : '') + fmtNum(t.balance), tone: t.balance >= 0 ? 'pos' : 'neg' },
        ],
        sections: [
          { tag: 'Top export partners', empty: 'n/a — no exports', items: (partners.topExport || []).map((p, i) => ({ rk: String(i + 1).padStart(2, '0'), nm: p })) },
          { tag: 'Top import partners', empty: 'n/a — no imports', items: (partners.topImport || []).map((p, i) => ({ rk: String(i + 1).padStart(2, '0'), nm: p })) },
        ],
      };
    }
  }

  const balances = tradeMap ? Object.values(tradeMap).map((t) => t.balance) : [];
  const minBal = balances.length ? Math.min(...balances) : -1000;
  const maxBal = balances.length ? Math.max(...balances) : 1000;
  const valueFn = (id) => tradeMap?.[id]?.balance ?? null;

  const flowMax = flow ? Math.max(...flow.rows.flatMap((r) => flow.cols.map((c) => flow.grid[r][c]))) : 1;

  return (
    <section className="dd-section tactical" id="s1">
      <div className="container">
        <div className="dd-section-head">
          <div className="num"><span className="section-glyph"><G_Crosshair /></span>§02.1 / Arms Trade<span className="big">01</span></div>
          <div>
            <h2>Who sells weapons, and who <em>buys</em> them.</h2>
            <p className="desc">
              SIPRI deal-count flows aggregated across the panel. The exporter list is concentrated;
              the importer list is where the diplomacy sits.
            </p>
          </div>
        </div>

        <div className="kpi-strip">
          <div className="cell"><div className="lbl">Global deals</div><div className="val">{kpi.totalDeals.toLocaleString()}</div></div>
          <div className="cell"><div className="lbl">Countries tracked</div><div className="val">{kpi.totalCountries}</div></div>
          <div className="cell"><div className="lbl">Top net exporter</div><div className="val accent">{kpi.topExporter}</div></div>
          <div className="cell"><div className="lbl">Top net importer</div><div className="val accent">{kpi.topImporter}</div></div>
        </div>

        <div className="grid-2" style={{ marginBottom: 16 }}>
          <Panel
            title="Top arms exporters" meta="deal count · panel-wide"
            foot={<><span>top 8 by deal count</span><DataBadge source={exports.source} lastUpdated={exports.lastUpdated} loading={exports.loading} error={exports.error} /></>}
          >
            <StatePane loading={exports.loading} error={exports.error} empty={!exportersBars.length}>
              <BarChart data={exportersBars} h={230} horizontal showValues />
            </StatePane>
          </Panel>
          <Panel
            title="Top arms importers" meta="deal count · panel-wide"
            foot={<><span>top 8 by deal count</span><DataBadge source={imports.source} lastUpdated={imports.lastUpdated} loading={imports.loading} error={imports.error} /></>}
          >
            <StatePane loading={imports.loading} error={imports.error} empty={!importersBars.length}>
              <BarChart data={importersBars} h={230} horizontal showValues />
            </StatePane>
          </Panel>
        </div>

        <Panel
          title="Bilateral trade map · all years"
          meta="hover any country · diverging by net deal balance"
          foot={<><span>green = net exporter · terracotta = net importer</span><span className="accent">{kpi.totalCountries} countries</span></>}
        >
          <div className="map-block" style={{ position: 'relative' }}>
            <StatePane loading={overview.loading} error={overview.error} empty={!tradeMap || !Object.keys(tradeMap).length}>
              <WorldMap
                valueFn={valueFn}
                domain={[minBal, 0, maxBal]}
                scheme="diverging"
                onHover={(id, e) => {
                  if (id == null) return setHover(null);
                  const r = e.currentTarget.closest('.worldmap')?.getBoundingClientRect();
                  if (!r) return;
                  setHover({ id, x: e.clientX - r.left, y: e.clientY - r.top });
                }}
                height={480}
              />
              {hover && tip && <MapTooltip data={tip} x={hover.x} y={hover.y} />}
            </StatePane>
          </div>
          <div className="map-legend">
            <span>Net importer</span>
            <span className="ramp">
              {[1, 0.7, 0.4, 0.18, 0.1, 0.18, 0.4, 0.7, 1].map((a, i) => (
                <span key={i} className="stop"
                  style={{ background: i < 4 ? `rgba(218,119,86,${a})` : i === 4 ? 'var(--bg-1)' : `rgba(157,177,124,${a})` }} />
              ))}
            </span>
            <span>Net exporter</span>
            <span style={{ marginLeft: 'auto' }}>source · SIPRI deal counts</span>
          </div>
        </Panel>

        <div style={{ marginTop: 16 }}>
          <Panel
            title="Exporter → importer flow matrix"
            meta="deal count · darker = deeper bilateral channel"
            foot={<><span>top 6 suppliers × top 8 recipients</span></>}
          >
            <StatePane loading={exports.loading} error={exports.error} empty={!flow}>
              {flow && (
                <div style={{ overflowX: 'auto' }}>
                  <table className="flow-matrix">
                    <thead>
                      <tr>
                        <th className="row-label">Supplier ↓ / Recipient →</th>
                        {flow.cols.map((c) => <th key={c}>{c}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {flow.rows.map((r) => (
                        <tr key={r}>
                          <td className="row-label">{r}</td>
                          {flow.cols.map((c) => {
                            const v = flow.grid[r][c];
                            const intensity = v / Math.max(1, flowMax);
                            return (
                              <td key={c} className={`cell ${v === 0 ? 'zero' : ''}`}>
                                {v > 0 && <div className="bg" style={{ opacity: 0.08 + intensity * 0.55 }} />}
                                <span>{v > 0 ? v.toLocaleString() : '·'}</span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </StatePane>
          </Panel>
        </div>

        <div className="callout">
          <div className="tag">So what ↴</div>
          <div className="body">
            The matrix surfaces <em>multi-alignment</em>. Watch which importers take meaningful
            volume from <span className="n">3+</span> different suppliers — that's a diplomacy
            signal, not an accident, and it's the thread §02.4 pulls on.
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * §02.2 — BUDGETS
 * ──────────────────────────────────────────────────────────────────────── */
function S2Budgets() {
  const spending = useApi('/api/defense/spending');

  const { series, labels, gdpBars } = useMemo(() => {
    if (!Array.isArray(spending.data)) return { series: [], labels: [], gdpBars: [] };
    const focus = ['United States', 'China', 'Russia', 'India'];
    const colors = { 'United States': '#DA7756', 'China': '#D9A441', 'Russia': '#C45C4A', 'India': '#9DB17C' };
    const byCountryYear = new Map();
    const yearsSet = new Set();
    for (const r of spending.data) {
      const c = r.country_name; const y = toNum(r.year);
      if (!c || y == null) continue;
      yearsSet.add(y);
      if (!byCountryYear.has(c)) byCountryYear.set(c, new Map());
      byCountryYear.get(c).set(y, toNum(r.milex_current_usd));
    }
    const years = Array.from(yearsSet).sort((a, b) => a - b);
    // milex_current_usd is in $ MILLIONS (SIPRI standard), not raw USD —
    // divide by 1e3 to get billions for display.
    const series = focus
      .filter((c) => {
        const m = byCountryYear.get(c);
        if (!m) return false;
        // Drop countries whose entire series is null (e.g., USA in this file).
        for (const v of m.values()) if (v != null) return true;
        return false;
      })
      .map((c) => ({
        name: c,
        color: colors[c],
        data: years.map((y) => {
          const v = byCountryYear.get(c).get(y);
          return v != null ? v / 1e3 : 0;
        }),
      }));

    // §02.2 right chart: curated 7-country list (USA, India, Canada, Russia,
    // Pakistan, UAE, Saudi Arabia) — sorted by GDP% so the bars are readable.
    const GDP_FILTER = new Set([
      'United States', 'India', 'Canada', 'Russia',
      'Pakistan', 'United Arab Emirates', 'Saudi Arabia',
    ]);
    const latestYear = years[years.length - 1];
    // Some countries publish GDP% on a one-year lag — accept the most recent
    // year that has a non-null value for each country in the curated set.
    const latestGdpByCountry = new Map();
    for (const r of spending.data) {
      if (!GDP_FILTER.has(r.country_name)) continue;
      if (!isNum(r.milex_share_gdp_pct)) continue;
      const y = toNum(r.year);
      const prev = latestGdpByCountry.get(r.country_name);
      if (!prev || y > prev.year) {
        latestGdpByCountry.set(r.country_name, { year: y, v: toNum(r.milex_share_gdp_pct) });
      }
    }
    const gdpRows = Array.from(latestGdpByCountry.entries())
      .map(([label, info]) => ({ label, v: info.v }))
      .sort((a, b) => b.v - a.v)
      .map((r) => ({
        ...r,
        color: r.v >= 5 ? '#C45C4A' : r.v >= 3 ? '#DA7756' : r.v >= 2 ? '#D9A441' : '#9DB17C',
      }));

    return { series, labels: years.map(String), gdpBars: gdpRows };
  }, [spending.data]);

  const yMaxBudget = useMemo(() => {
    const all = series.flatMap((s) => s.data);
    return all.length ? Math.max(...all) * 1.1 : 1000;
  }, [series]);

  return (
    <section className="dd-section tactical" id="s2" style={{ background: 'var(--bg-1)', borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)' }}>
      <div className="container">
        <div className="dd-section-head">
          <div className="num"><span className="section-glyph"><G_Tank /></span>§02.2 / Budgets<span className="big">02</span></div>
          <div>
            <h2>Years of <em>spend</em>, re-rated by war.</h2>
            <p className="desc">Absolute spend tells one story; the % of GDP chart tells you who's stretched and who's cruising.</p>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: 16 }}>
          <Panel
            title="Defense budgets · USD Bn" meta={labels.length ? `${labels[0]} → ${labels[labels.length - 1]}` : ''}
            foot={<><span>USA still the anchor</span><DataBadge source={spending.source} lastUpdated={spending.lastUpdated} loading={spending.loading} error={spending.error} /></>}
          >
            <StatePane loading={spending.loading} error={spending.error} empty={!series.length}>
              <LineChart series={series} xLabels={labels} h={240} yMin={0} yMax={yMaxBudget} />
              <div className="chart-legend">
                {series.map((s) => (
                  <span key={s.name} className="item"><span className="sw" style={{ background: s.color }} />{s.name}</span>
                ))}
              </div>
            </StatePane>
          </Panel>
          <Panel
            title="Defense % of GDP · latest year" meta="stretched vs comfortable"
            foot={<><span>NATO target = 2.0%</span><span className="accent">red ramp = stress</span></>}
          >
            <StatePane loading={spending.loading} error={spending.error} empty={!gdpBars.length}>
              <BarChart data={gdpBars} h={240} horizontal showValues vmax={Math.max(10, ...gdpBars.map((d) => d.v))} refLine={2.0} />
            </StatePane>
          </Panel>
        </div>

        <div className="callout">
          <div className="tag">Analyst note</div>
          <div className="body">
            The dollar line and the % of GDP line tell different stories. A country can spend a
            lot in absolute terms while still being unstretched, and vice versa. <em>The constraint</em>{' '}
            is the % bar — that's where domestic budgets squeeze.
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * §02.3 — CONFLICT
 * ──────────────────────────────────────────────────────────────────────── */
function S3Conflict() {
  const conflict = useApi('/api/defense/conflict');
  const [region, setRegion] = useState('All');

  const { regions, regionSeries, labels, eventCount } = useMemo(() => {
    if (!Array.isArray(conflict.data)) return { regions: [], regionSeries: [], labels: [], eventCount: [] };
    const yearsSet = new Set();
    const byRegYear = new Map();
    const byCountry = new Map();
    let latestYear = null;
    for (const r of conflict.data) {
      const reg = r.region; const y = toNum(r.year);
      if (!reg || y == null) continue;
      yearsSet.add(y);
      if (latestYear == null || y > latestYear) latestYear = y;
      if (!byRegYear.has(reg)) byRegYear.set(reg, new Map());
      byRegYear.get(reg).set(y, (byRegYear.get(reg).get(y) || 0) + (toNum(r.total_fatalities) ?? 0));
      if (toNum(r.total_events) != null) {
        const c = r.country_name;
        if (c) {
          if (!byCountry.has(c)) byCountry.set(c, { region: reg, eventsLatest: 0, year: y });
          if (y === latestYear) {
            byCountry.get(c).eventsLatest = toNum(r.total_events);
            byCountry.get(c).year = y;
          }
        }
      }
    }
    const years = Array.from(yearsSet).sort((a, b) => a - b);
    const regionList = Array.from(byRegYear.keys()).sort();
    const series = regionList.map((reg) => ({
      name: reg,
      color: REGION_COLORS[reg] || '#8A8276',
      data: years.map((y) => byRegYear.get(reg).get(y) || 0),
    }));
    // §02.3 right chart: curated 10-country list (matches §02.5 picker).
    const COUNTRY_FILTER = new Set([
      'United States', 'Canada', 'Australia', 'India', 'Pakistan',
      'United Arab Emirates', 'Saudi Arabia', 'Japan', 'China', 'Russia',
    ]);
    const eventRows = Array.from(byCountry.entries())
      .filter(([country]) => COUNTRY_FILTER.has(country))
      .map(([country, info]) => ({ label: country, v: info.eventsLatest, color: REGION_COLORS[info.region] || '#8A8276' }))
      .filter((r) => r.v > 0)
      .sort((a, b) => b.v - a.v);
    return { regions: regionList, regionSeries: series, labels: years.map(String), eventCount: eventRows };
  }, [conflict.data]);

  const filteredSeries = region === 'All' ? regionSeries : regionSeries.filter((s) => s.name === region);

  return (
    <section className="dd-section tactical" id="s3">
      <div className="container">
        <div className="dd-section-head">
          <div className="num"><span className="section-glyph"><G_Radar /></span>§02.3 / Conflict<span className="big">03</span></div>
          <div>
            <h2>Regions, by yearly <em>intensity</em>.</h2>
            <p className="desc">ACLED-derived total fatalities aggregated to year. Spikes correlate to known onset windows; floors tell you which conflicts never reset.</p>
          </div>
        </div>

        <div className="selector-row">
          <span className="label">Region</span>
          {['All', ...regions].map((r) => (
            <button key={r} className={`chip ${region === r ? 'on' : ''}`} onClick={() => setRegion(r)}>{r}</button>
          ))}
          <span style={{ marginLeft: 'auto', color: '#8A8276' }}>source · ACLED · yearly</span>
        </div>

        <div className="grid-2-1" style={{ marginBottom: 16 }}>
          <Panel
            title="Yearly fatalities by region" meta={labels.length ? `${labels[0]} → ${labels[labels.length - 1]}` : ''}
            foot={<><span>spikes track conflict onsets</span><DataBadge source={conflict.source} lastUpdated={conflict.lastUpdated} loading={conflict.loading} error={conflict.error} /></>}
          >
            <StatePane loading={conflict.loading} error={conflict.error} empty={!filteredSeries.length}>
              <LineChart series={filteredSeries} xLabels={labels} h={260} yMin={0} />
              <div className="chart-legend">
                {filteredSeries.map((s) => (
                  <span key={s.name} className="item"><span className="sw" style={{ background: s.color }} />{s.name}</span>
                ))}
              </div>
            </StatePane>
          </Panel>
          <Panel
            title="Event hotspots · latest year" meta="ACLED total events"
            foot={<><span>top 8 by events</span></>}
          >
            <StatePane loading={conflict.loading} error={conflict.error} empty={!eventCount.length}>
              <BarChart data={eventCount} h={260} horizontal showValues />
            </StatePane>
          </Panel>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * §02.4 — PARTNERSHIPS
 * ──────────────────────────────────────────────────────────────────────── */
function PartnerGraphSVG({ nodes, edges }) {
  const W = 900, H = 380;
  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));
  return (
    <svg viewBox={`0 0 ${W} ${H}`}>
      <g opacity="0.35">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line key={`v${i}`} x1={i * (W / 8)} y1="0" x2={i * (W / 8)} y2={H}
            stroke="rgba(218,119,86,0.07)" strokeDasharray="2 4" />
        ))}
        {[1, 2, 3].map((i) => (
          <line key={`h${i}`} x1="0" y1={i * (H / 4)} x2={W} y2={i * (H / 4)}
            stroke="rgba(218,119,86,0.07)" strokeDasharray="2 4" />
        ))}
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="rgba(218,119,86,0.14)" strokeDasharray="6 6" />
      </g>
      {edges.map((e, i) => {
        const a = nodeById[e.a], b = nodeById[e.b];
        if (!a || !b) return null;
        const color = e.trend === 'up' ? '#9DB17C' : e.trend === 'down' ? '#C45C4A' : '#8A8276';
        return (
          <g key={i} opacity="0.85">
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={color} strokeWidth={e.w} opacity="0.6"
              strokeDasharray={e.trend === 'down' ? '6 4' : 'none'} />
            <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 4}
              textAnchor="middle"
              fontFamily="JetBrains Mono" fontSize="9" fill={color}>
              {e.lbl}
            </text>
          </g>
        );
      })}
      {nodes.map((n) => (
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r={n.r + 8} fill="none" stroke="#DA7756" opacity="0.18" strokeDasharray="2 3" />
          <circle cx={n.x} cy={n.y} r={n.r + 3} fill="none" stroke="#DA7756" opacity="0.32" />
          <rect x={n.x - 26} y={n.y - 11} width="52" height="22" fill="#1F1B17" stroke="#DA7756" strokeWidth="1.5" />
          <text x={n.x} y={n.y + 4.5} textAnchor="middle"
            fontFamily="JetBrains Mono" fontSize="10" fontWeight="600" fill="#F2EDE4"
            letterSpacing="0.04em">
            {n.id}
          </text>
        </g>
      ))}
    </svg>
  );
}

function S4Partners() {
  const partnerships = useApi('/api/defense/partnerships');

  const { nodes, edges, scores } = useMemo(() => {
    if (!Array.isArray(partnerships.data) || !partnerships.data.length) return { nodes: [], edges: [], scores: [] };
    const top = partnerships.data
      .filter((r) => isNum(r.partnership_strength) && r.supplier_country_name && r.recipient_country_name)
      .sort((a, b) => (toNum(b.partnership_strength) || 0) - (toNum(a.partnership_strength) || 0))
      .slice(0, 12);

    const countrySet = new Set();
    top.forEach((r) => { countrySet.add(r.supplier_country_name); countrySet.add(r.recipient_country_name); });
    const countries = Array.from(countrySet).slice(0, 14);

    const supplyTotals = {};
    for (const r of top) {
      supplyTotals[r.supplier_country_name] = (supplyTotals[r.supplier_country_name] || 0) + (toNum(r.total_deals) || 0);
    }
    const sortedCountries = countries.sort((a, b) => (supplyTotals[b] || 0) - (supplyTotals[a] || 0));

    const nodes = sortedCountries.map((c, i) => {
      const isLeft = i % 2 === 0;
      const idx = Math.floor(i / 2);
      const slot = (idx + 0.5) / Math.ceil(sortedCountries.length / 2);
      return {
        id: c.length > 4 ? c.slice(0, 4).toUpperCase() : c.toUpperCase(),
        fullName: c,
        x: isLeft ? 130 : 770,
        y: 50 + slot * 280,
        r: 16,
      };
    });
    const idByName = Object.fromEntries(nodes.map((n) => [n.fullName, n.id]));

    const edges = top.map((r) => {
      const a = idByName[r.supplier_country_name];
      const b = idByName[r.recipient_country_name];
      if (!a || !b) return null;
      const ps = toNum(r.partnership_strength) || 0;
      const w = Math.min(6, 1 + ps / 20);
      const trend = ps > 60 ? 'up' : ps < 30 ? 'down' : 'steady';
      return { a, b, w, trend, lbl: ps.toFixed(0) };
    }).filter(Boolean);

    const scores = top.slice(0, 6).map((r) => ({
      tag: 'BILATERAL',
      pair: `${r.supplier_country_name} → ${r.recipient_country_name}`,
      score: (toNum(r.partnership_strength) || 0).toFixed(0),
    }));

    return { nodes, edges, scores };
  }, [partnerships.data]);

  return (
    <section className="dd-section tactical" id="s4" style={{ background: 'var(--bg-1)', borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)' }}>
      <div className="container">
        <div className="dd-section-head">
          <div className="num"><span className="section-glyph"><G_Globe /></span>§02.4 / Partnerships<span className="big">04</span></div>
          <div>
            <h2>The <em>graph</em> of who's getting closer.</h2>
            <p className="desc">Strength built from bilateral arms-flow volume and longevity (years_active). Edge thickness = current strength.</p>
          </div>
        </div>

        <Panel
          title="Bilateral partnership graph" meta="node = country · edge = bilateral strength"
          foot={<><span>green = strong · grey = steady · red-dashed = weak</span><DataBadge source={partnerships.source} lastUpdated={partnerships.lastUpdated} loading={partnerships.loading} error={partnerships.error} /></>}
        >
          <StatePane loading={partnerships.loading} error={partnerships.error} empty={!nodes.length}>
            <div className="partner-graph"><PartnerGraphSVG nodes={nodes} edges={edges} /></div>
            <div className="partner-legend">
              <span className="it"><span className="sw" style={{ background: '#9DB17C' }} />strong</span>
              <span className="it"><span className="sw" style={{ background: '#8A8276' }} />steady</span>
              <span className="it"><span className="sw" style={{ background: '#C45C4A' }} />weak</span>
            </div>
          </StatePane>
        </Panel>

        <div className="grid-3" style={{ marginTop: 16 }}>
          {scores.map((s, i) => (
            <div key={i} className="score-tile">
              <div>
                <div className="lbl">{s.tag}</div>
                <div className="nm">{s.pair}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="sc">{s.score}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="callout">
          <div className="tag">Model</div>
          <div className="body">
            Score is derived from the live <span className="n">partnership_strength</span> column —
            built upstream from bilateral deal volume and partnership longevity.
            <em>Inputs are observable</em>; the output is a way to argue about diplomacy with data.
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * §02.5 — COUNTRY (parameterized drill)
 * ──────────────────────────────────────────────────────────────────────── */
function S5Country() {
  const overview = useApi('/api/defense/overview');
  const imports = useApi('/api/defense/imports');
  const spending = useApi('/api/defense/spending');

  // Curated 10-country picker list — order matters (display order).
  const COUNTRY_PICKER = useMemo(() => [
    'United States', 'Canada', 'Australia', 'India', 'Pakistan',
    'United Arab Emirates', 'Saudi Arabia', 'Japan', 'China', 'Russia',
  ], []);

  const countries = useMemo(() => {
    if (!Array.isArray(overview.data)) return COUNTRY_PICKER;
    // Keep curated order, but only include countries that actually appear in
    // the overview data so we don't render a dead chip.
    const present = new Set(overview.data.map((r) => r.country_name).filter(Boolean));
    return COUNTRY_PICKER.filter((c) => present.has(c));
  }, [overview.data, COUNTRY_PICKER]);

  const [country, setCountry] = useState('India');
  useEffect(() => {
    if (countries.length && !countries.includes(country)) {
      setCountry(countries[0]);
    }
  }, [countries, country]);

  const detail = useMemo(() => {
    if (!country) return null;
    const supplierAcc = new Map();
    let countryTotalImports = 0;
    if (Array.isArray(imports.data)) {
      for (const r of imports.data) {
        if (r.recipient_name !== country) continue;
        const v = toNum(r.deal_count) ?? 0;
        countryTotalImports += v;
        if (r.supplier_name) supplierAcc.set(r.supplier_name, (supplierAcc.get(r.supplier_name) || 0) + v);
      }
    }
    const supplierMix = Array.from(supplierAcc.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, count], i) => ({
        label,
        v: countryTotalImports > 0 ? +(100 * count / countryTotalImports).toFixed(1) : 0,
        color: i === 0 ? '#DA7756' : i < 3 ? '#D9A441' : '#9DB17C',
      }));

    const budgetByYear = new Map();
    const yearsSet = new Set();
    if (Array.isArray(spending.data)) {
      for (const r of spending.data) {
        if (r.country_name !== country) continue;
        const y = toNum(r.year); const v = toNum(r.milex_current_usd);
        if (y == null || v == null) continue;
        // milex_current_usd is in $ millions — convert to billions.
        budgetByYear.set(y, v / 1e3);
        yearsSet.add(y);
      }
    }
    const years = Array.from(yearsSet).sort((a, b) => a - b);
    const budgetLine = years.length
      ? { name: country, color: '#DA7756', data: years.map((y) => budgetByYear.get(y) || 0), fill: true }
      : null;

    const latestYear = years[years.length - 1];
    const latestBudget = latestYear != null ? budgetByYear.get(latestYear) : null;
    const earliestBudget = years.length ? budgetByYear.get(years[0]) : null;
    const budgetGrowth = (latestBudget && earliestBudget && earliestBudget > 0)
      ? +(100 * (latestBudget - earliestBudget) / earliestBudget).toFixed(0)
      : null;

    const metrics = [
      { k: 'Total imports', sub: 'all years · deal count', v: fmtNum(countryTotalImports) },
      { k: 'Latest budget', sub: latestYear ? `${latestYear} · USD Bn` : '—', v: latestBudget != null ? latestBudget.toFixed(1) + 'B' : '—' },
      { k: 'Budget growth', sub: years.length > 1 ? `${years[0]} → ${latestYear}` : '—', v: budgetGrowth != null ? (budgetGrowth >= 0 ? '+' : '') + budgetGrowth + '%' : '—' },
    ];

    return {
      name: country,
      metrics,
      supplierMix,
      budgetLine,
      years: years.map(String),
      yMaxBudget: budgetLine ? Math.max(...budgetLine.data) * 1.15 : 100,
    };
  }, [country, imports.data, spending.data]);

  return (
    <section className="dd-section tactical" id="s5" style={{ background: 'var(--bg-1)', borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)' }}>
      <div className="container">
        <div className="dd-section-head">
          <div className="num"><span className="section-glyph"><G_Frigate /></span>§02.5 / Country<span className="big">05</span></div>
          <div>
            <h2>One country, every <em>axis</em>.</h2>
            <p className="desc">Pick a country to see imports breakdown, supplier mix, and budget trajectory aligned to one timeline.</p>
          </div>
        </div>

        <div className="selector-row">
          <span className="label">Country</span>
          {countries.map((c) => (
            <button key={c} className={`chip ${country === c ? 'on' : ''}`} onClick={() => setCountry(c)}>{c}</button>
          ))}
        </div>

        {detail && (
          <>
            <div className="grid-3" style={{ marginBottom: 16 }}>
              {detail.metrics.map((m, i) => (
                <div key={i} style={{ border: '1px solid var(--rule)', background: 'var(--bg-2)', padding: '18px 20px' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8A8276', marginBottom: 8 }}>{m.k}</div>
                  <div style={{ fontFamily: 'var(--sans)', fontSize: 34, fontWeight: 500, color: '#F2EDE4', letterSpacing: '-0.02em' }}>{m.v}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: '#8A8276', marginTop: 4 }}>{m.sub}</div>
                </div>
              ))}
            </div>

            <div className="grid-2" style={{ marginBottom: 16 }}>
              <Panel
                title={`${detail.name} · supplier mix`} meta="% of total imports"
                foot={<><span>{detail.supplierMix.length} suppliers</span><DataBadge source={imports.source} lastUpdated={imports.lastUpdated} loading={imports.loading} error={imports.error} /></>}
              >
                <StatePane loading={imports.loading} error={imports.error} empty={!detail.supplierMix.length}>
                  <BarChart data={detail.supplierMix} h={220} horizontal showValues vmax={Math.max(50, ...detail.supplierMix.map((d) => d.v))} />
                </StatePane>
              </Panel>
              <Panel
                title={`${detail.name} · budget trajectory`} meta="USD Bn"
                foot={<><span>SIPRI milex_current_usd</span><DataBadge source={spending.source} lastUpdated={spending.lastUpdated} loading={spending.loading} error={spending.error} /></>}
              >
                <StatePane loading={spending.loading} error={spending.error} empty={!detail.budgetLine}>
                  {detail.budgetLine && <LineChart series={[detail.budgetLine]} xLabels={detail.years} h={220} yMin={0} yMax={detail.yMaxBudget} />}
                </StatePane>
              </Panel>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * §02.6 — COMPANIES
 * ──────────────────────────────────────────────────────────────────────── */
function S6Companies() {
  const companies = useApi('/api/defense/companies');
  const [hover, setHover] = useState(null);
  const [region, setRegion] = useState('All');

  const { byCountry, regions, list, totalRev, maxRev } = useMemo(() => {
    if (!Array.isArray(companies.data)) return { byCountry: {}, regions: ['All'], list: [], totalRev: 0, maxRev: 1 };
    const acc = new Map();
    let totalRev = 0;
    const regionSet = new Set();
    for (const r of companies.data) {
      const c = r.country_name;
      const rev = toNum(r.arms_revenue) ?? 0;
      const pct = toNum(r.arms_revenue_pct);
      totalRev += rev;
      if (r.region) regionSet.add(r.region);
      if (!c) continue;
      if (!acc.has(c)) acc.set(c, { count: 0, totalArmsRev: 0, sumPct: 0, n: 0 });
      const x = acc.get(c);
      x.count += 1;
      x.totalArmsRev += rev;
      if (pct != null) { x.sumPct += pct; x.n += 1; }
    }
    const byCountry = {};
    for (const [c, info] of acc.entries()) {
      byCountry[c] = { ...info, avgPct: info.n ? info.sumPct / info.n : 0 };
    }
    const maxRev = Math.max(1, ...Object.values(byCountry).map((x) => x.totalArmsRev));
    const regions = ['All', ...Array.from(regionSet).sort()];
    const filteredList = (region === 'All' ? companies.data : companies.data.filter((r) => r.region === region))
      .slice()
      .sort((a, b) => (toNum(a.rank) ?? 999) - (toNum(b.rank) ?? 999));
    return { byCountry, regions, list: filteredList, totalRev, maxRev };
  }, [companies.data, region]);

  const valueFn = (id) => {
    const cn = NAME_BY_ID[id];
    return byCountry[cn]?.totalArmsRev ?? null;
  };
  const highlightIds = Object.keys(byCountry)
    .map((n) => ISO_NUM[n])
    .filter(Boolean);

  let tip = null;
  if (hover) {
    const cn = NAME_BY_ID[hover.id];
    const c = byCountry[cn];
    if (c && Array.isArray(companies.data)) {
      const firmList = companies.data
        .filter((r) => r.country_name === cn)
        .slice()
        .sort((a, b) => (toNum(a.rank) ?? 999) - (toNum(b.rank) ?? 999))
        .map((r) => ({
          rk: '#' + String(toNum(r.rank) ?? 0).padStart(2, '0'),
          nm: r.company_name,
          // arms_revenue is in $ millions — display as $ billions.
          v: '$' + ((toNum(r.arms_revenue) ?? 0) / 1000).toFixed(1) + 'B',
        }));
      tip = {
        name: cn,
        lines: [
          { k: 'Firms', v: c.count },
          { k: 'Avg arms %', v: c.avgPct.toFixed(0) + '%' },
          { k: 'Total arms rev', v: '$' + (c.totalArmsRev / 1000).toFixed(1) + 'B' },
        ],
        sections: [{ tag: 'Firms ranked', items: firmList }],
      };
    }
  }

  return (
    <section className="dd-section tactical" id="s6">
      <div className="container">
        <div className="dd-section-head">
          <div className="num"><span className="section-glyph"><G_Satellite /></span>§02.6 / Top 100 Companies<span className="big">06</span></div>
          <div>
            <h2>The <em>SIPRI Top 100</em>, mapped.</h2>
            <p className="desc">Where the world's largest defense primes are headquartered, and what share of revenue they pull from arms.</p>
          </div>
        </div>

        <div className="selector-row">
          <span className="label">Region</span>
          {regions.map((r) => (
            <button key={r} className={`chip ${region === r ? 'on' : ''}`} onClick={() => setRegion(r)}>{r}</button>
          ))}
          <span style={{ marginLeft: 'auto', color: '#8A8276', fontFamily: 'var(--mono)', fontSize: 10.5 }}>
            {list.length} firms · {Object.keys(byCountry).length} countries · ${(totalRev / 1000).toFixed(1)}B total
          </span>
        </div>

        <Panel
          title="Top 100 defense firms · headquartered country"
          meta="darker = more total arms revenue · hover for full detail"
          foot={<><span>SIPRI Top 100 · arms revenue</span><DataBadge source={companies.source} lastUpdated={companies.lastUpdated} loading={companies.loading} error={companies.error} /></>}
        >
          <div className="map-block" style={{ position: 'relative' }}>
            <StatePane loading={companies.loading} error={companies.error} empty={!Object.keys(byCountry).length}>
              <WorldMap
                valueFn={valueFn}
                domain={[0, maxRev]}
                scheme="sequential"
                onHover={(id, e) => {
                  if (id == null) return setHover(null);
                  const r = e.currentTarget.closest('.worldmap')?.getBoundingClientRect();
                  if (!r) return;
                  setHover({ id, x: e.clientX - r.left, y: e.clientY - r.top });
                }}
                highlightIds={highlightIds}
                height={540}
              />
              {hover && tip && <MapTooltip data={tip} x={hover.x} y={hover.y} />}
            </StatePane>
          </div>
        </Panel>

        <div style={{ marginTop: 16 }}>
          <div className="co-list">
            <div className="row head">
              <div>Rank</div>
              <div>Company</div>
              <div className="rev">Arms rev ($B)</div>
              <div className="pct">Arms %</div>
            </div>
            {list.slice(0, 50).map((r, i) => (
              <div key={(r.company_name || '') + i} className="row">
                <div className="rk">#{String(toNum(r.rank) ?? '').padStart(2, '0')}</div>
                <div className="nm">{r.company_name}<span className="sub">{r.country_name}</span></div>
                <div className="rev">{isNum(r.arms_revenue) ? ((toNum(r.arms_revenue) / 1000).toFixed(1)) : '—'}</div>
                <div className="pct">{isNum(r.arms_revenue_pct) ? toNum(r.arms_revenue_pct).toFixed(0) + '%' : '—'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Defense footer
 * ──────────────────────────────────────────────────────────────────────── */
function DefenseFooter() {
  return (
    <section className="dd-end">
      <div className="container">
        <div className="dd-end-grid">
          <div className="refresh-note">
            <div style={{ marginBottom: 6 }}>◆ project_status / <span className="accent">active · quarterly export from SIPRI + ACLED</span></div>
            <div>next: investment research (PRJ-003) — migration case study, SQL Server → Fabric.</div>
          </div>
          <div className="links">
            <a className="link-btn" href="/projects">← all projects</a>
            <a className="link-btn" href="/projects/energy-security">◆ PRJ-001 energy</a>
            <a
              className="link-btn"
              href="https://public.tableau.com/views/GlobalDefenceConflictIntelligenceAnalysis/GlobalTradeOverview"
              target="_blank"
              rel="noopener noreferrer"
            >
              ◆ tableau public
            </a>
            <a className="link-btn primary" href="/contact">book a walkthrough →</a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Default export
 * ──────────────────────────────────────────────────────────────────────── */
export default function DefenseIntelligence() {
  return (
    <>
      <SEO
        title="Defense Intelligence"
        description="Global defense trade, conflict events, military spending, and the SIPRI Top 100 — built on a medallion lakehouse with SIPRI + ACLED data."
        path="/projects/defense-intelligence"
      />
      <DefenseHero />
      <S1Trade />
      <S2Budgets />
      <S3Conflict />
      <S4Partners />
      <S5Country />
      <S6Companies />
      <DefenseFooter />
    </>
  );
}
