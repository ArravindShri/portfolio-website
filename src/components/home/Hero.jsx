import { Link } from 'react-router-dom';
import HeroBg from '../HeroBg.jsx';
import SectionTag from '../SectionTag.jsx';

const ReadoutRow = ({ k, pct, v, good }) => (
  <div className="readout-row">
    <span className="k">{k}</span>
    <span className="bar">
      <span style={{ width: `${pct * 100}%` }} />
    </span>
    <span className={`v ${good ? 'good' : ''}`}>{v}</span>
  </div>
);

const StripCell = ({ k, v, unit, sub, delta }) => (
  <div className="cell">
    <div className="k">{k}</div>
    <div className="v">
      {v}
      {unit && <span className="unit">{unit}</span>}
      {delta && <span className="delta">▲ +12</span>}
    </div>
    <div className="sub">{sub}</div>
  </div>
);

export default function Hero({ bgVariant = 'chart' }) {
  return (
    <section className="hero section" data-screen-label="Hero">
      <HeroBg variant={bgVariant} />
      <div className="container">
        <SectionTag num="00" label="Overview" path="/ home / hero" />

        <div className="hero-grid" style={{ marginTop: 36 }}>
          <div>
            <div className="eyebrow">
              <span className="bar"></span>
              <span>Portfolio · Apr 2026 · Transmitting from Chennai, IN</span>
            </div>

            <h1>
              Making sense of data
              <br />
              beyond <span className="italic">numbers.</span>
            </h1>

            <div className="role">
              <span className="tag">Role</span>
              <span>Product / Customer Success Analyst</span>
              <span style={{ color: 'var(--ink-4)' }}>→</span>
              <span style={{ color: 'var(--ink-3)' }}>Data / BI Analyst</span>
            </div>

            <p className="hook">
              I build <em>live data pipelines</em> and interactive dashboards that turn raw APIs
              into real decisions. This portfolio is powered by the same Fabric warehouse and dbt
              pipelines I ship to production — not screenshots, not mockups.
            </p>

            <div className="cta-row">
              <Link to="/projects" className="btn primary">
                Explore projects <span className="arrow">→</span>
              </Link>
              <a href="#stack" className="btn ghost">
                <span style={{ color: 'var(--accent)' }}>$</span> cat ./stack.yaml
              </a>
              <Link to="/contact" className="btn ghost">
                Get in touch
              </Link>
            </div>
          </div>

          <aside className="readout" aria-label="Live portfolio readout">
            <div className="readout-head">
              <span className="title">◆ PORTFOLIO.STATE</span>
              <span className="meta">
                <span style={{ color: 'var(--good)' }}>●</span>
                <span>REFRESHED 6m ago</span>
              </span>
            </div>
            <div className="readout-body">
              <ReadoutRow k="PIPELINES" pct={0.92} v="11/12" />
              <ReadoutRow k="LIVE APIs" pct={0.75} v="6" />
              <ReadoutRow k="TABLES" pct={0.86} v="57" />
              <ReadoutRow k="DASHBOARDS" pct={0.66} v="14 pg" />
              <ReadoutRow k="COUNTRIES" pct={0.4} v="8" />
              <ReadoutRow k="TICKERS" pct={1.0} v="22" good />
            </div>
            <div className="readout-foot">
              <span>src: FABRIC.WAREHOUSE</span>
              <span>uptime 99.4%</span>
            </div>
          </aside>
        </div>
      </div>

      <div className="container" style={{ marginTop: 56 }}>
        <div className="strip">
          <StripCell k="Live projects" v="3" sub="Energy · Defense · Investment" />
          <StripCell
            k="Data sources wired"
            v="9"
            sub="EIA · TwelveData · ACLED · SIPRI · WB · IMF…"
          />
          <StripCell k="Lines of SQL shipped" v="4,812" sub="bronze → silver → gold" />
        </div>
      </div>
    </section>
  );
}
