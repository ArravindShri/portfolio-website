import { Link } from 'react-router-dom';
import SEO from '../components/SEO.jsx';

/* Case study — Fabric → BigQuery migration. Long-form, honest, technical. */

const METRICS = [
  { k: 'Annual cost', before: '~₹12,000', after: '₹0', tone: 'good', note: 'BigQuery free tier' },
  { k: 'Crisis query', before: '60 min', after: '< 1 s', tone: 'accent', note: 'F4 timeout → serverless' },
  { k: 'Daily export', before: 'multi-min', after: '23 s', tone: '', note: 'ODBC removed' },
  { k: 'Projects migrated', single: '3', note: '+ live FastAPI backend' },
  { k: 'Backend LOC', single: '−188', note: '996 added · 1,184 deleted' },
  { k: 'Time to complete', single: '5 days', note: 'against a trial deadline' },
  { k: 'Silent bugs caught', single: '2', note: 'both by verifying output' },
  { k: 'Tables migrated', single: '35', note: 'all row-count verified' },
];

const Metric = ({ m }) => (
  <div className="cs-metric">
    <div className="k">{m.k}</div>
    {m.single ? (
      <div className="single">{m.single}</div>
    ) : (
      <div className="pair">
        <span className="before">{m.before}</span>
        <span style={{ color: 'var(--ink-4)' }}>→</span>
        <span className={'after ' + (m.tone || '')}>{m.after}</span>
      </div>
    )}
    <div className="note">{m.note}</div>
  </div>
);

export default function CaseStudyFabricBigQuery() {
  return (
    <>
      <SEO
        title="Fabric → BigQuery: ₹12,000/year → ₹0 in 5 days"
        description="How three production data projects and a live FastAPI backend were migrated from Microsoft Fabric to Google BigQuery in five days, cutting annual cost to zero — and the two silent-failure bugs caught along the way."
        path="/writing/fabric-bigquery"
        type="article"
      />

      {/* ───── Hero ───── */}
      <section className="cs-hero" data-screen-label="Case Study Hero">
        <div className="container">
          <nav className="cs-crumbs">
            <Link to="/">◆ HOME</Link>
            <span className="sep">/</span>
            <Link to="/writing">WRITING</Link>
            <span className="sep">/</span>
            <span className="here">FABRIC → BIGQUERY</span>
          </nav>

          <div className="cs-eyebrow">
            <span className="bar"></span>
            <span>Case study · Platform migration · May 2026</span>
          </div>

          <div className="cs-cost">
            <span className="from">
              ₹12,000<span style={{ fontSize: '0.5em' }}>/yr</span>
            </span>
            <span className="arrow">→</span>
            <span className="to">₹0</span>
          </div>

          <h1>
            Migrated three production data projects and a live FastAPI backend off Microsoft Fabric
            in a weekend &mdash; <em>before the trial expired</em>.
          </h1>

          <div className="cs-sub">
            <span>Five days.</span>
            <span className="dot">·</span>
            <span>Three projects.</span>
            <span className="dot">·</span>
            <span>Two bugs caught.</span>
            <span className="dot">·</span>
            <span>One trial deadline.</span>
            <span className="dot">·</span>
            <span style={{ color: 'var(--accent)' }}>Zero ongoing cost.</span>
          </div>

          <a className="cs-cta" href="#deepdive">
            Read the technical detail ↓
          </a>
        </div>
      </section>

      {/* ───── Metric row ───── */}
      <div className="container">
        <div className="cs-metrics">
          {METRICS.map((m, i) => (
            <Metric key={i} m={m} />
          ))}
        </div>
      </div>

      {/* ───── What changed ───── */}
      <section className="cs-section">
        <div className="container">
          <div className="cs-head">
            <div className="tag">
              § 01 / Before · After<span className="big">The stack</span>
            </div>
            <div className="cs-body">
              <h2>
                The migration made the codebase <em>smaller</em>.
              </h2>
              <p>
                The whole system moved from a Fabric-centric stack &mdash; two warehouses, Service
                Principal auth, an ODBC driver baked into the backend image &mdash; to a single
                serverless BigQuery project. The backend&rsquo;s <code>database.py</code> kept its
                public interface identical, so routers and helpers needed{' '}
                <span className="k">zero</span> changes. Only the connection internals were swapped.
                Net result on the backend: <span className="k">+996 / −1,184</span> lines.
              </p>

              <div className="cs-stack">
                <div className="col before">
                  <div className="ctag">◆ Before · Microsoft Fabric</div>
                  <div className="layer">
                    <span className="dot"></span>2× Fabric Warehouse
                  </div>
                  <div className="layer">
                    <span className="dot"></span>Service Principal · MSAL auth
                  </div>
                  <div className="layer removed">
                    <span className="dot"></span>msodbcsql18 driver<span className="badge">removed</span>
                  </div>
                  <div className="layer">
                    <span className="dot"></span>Power BI Pro + Fabric Pro
                  </div>
                  <div className="layer removed">
                    <span className="dot"></span>"load crisis from disk" hack
                    <span className="badge">removed</span>
                  </div>
                  <div className="layer">
                    <span className="dot"></span>dbt (T-SQL) · GitHub Actions
                  </div>
                </div>
                <div className="mid">→</div>
                <div className="col after">
                  <div className="ctag">◆ After · Google BigQuery</div>
                  <div className="layer">
                    <span className="dot"></span>1× GCP project · 6 datasets
                  </div>
                  <div className="layer">
                    <span className="dot"></span>Service-account key · ADC
                  </div>
                  <div className="layer">
                    <span className="dot"></span>HTTPS client<span className="badge add">no driver</span>
                  </div>
                  <div className="layer">
                    <span className="dot"></span>BigQuery free tier
                  </div>
                  <div className="layer">
                    <span className="dot"></span>crisis query runs live
                    <span className="badge add">sub-1s</span>
                  </div>
                  <div className="layer">
                    <span className="dot"></span>dbt (Standard SQL) · GitHub Actions
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Why ───── */}
      <section className="cs-section shade">
        <div className="container">
          <div className="cs-head">
            <div className="tag">
              § 02 / The problem<span className="big">Why</span>
            </div>
            <div className="cs-body">
              <h2>
                Fabric worked. <em>Until it didn&rsquo;t.</em>
              </h2>
              <p>Three specific, documented failures &mdash; not generic complaints:</p>
              <h3>CU throttling · error 24801</h3>
              <p>
                The F4 trial capacity hit 125% utilization, triggering Background Rejection.
                Pipelines stuck. And failed queries <span className="k">still consumed CUs</span>, so
                the failures compounded.
              </p>
              <h3>DDL collisions · error 3961</h3>
              <p>
                Concurrent reads and writes caused snapshot-isolation conflicts &mdash; forcing
                1-hour buffer schedules between pipeline stages just to stop the system stepping on
                itself.
              </p>
              <h3>60-minute query timeouts</h3>
              <p>
                The <code>gold_crisis_analysis</code> query consistently timed out. The workaround
                was to pre-materialize the view to JSON, commit it to the repo, and load it from disk
                in the export script. <em>The fact that the workaround existed was the giveaway that
                the platform wasn&rsquo;t fit.</em>
              </p>
              <p>
                Then the deadline: the F4 trial was expiring in ~10 days. Paid F4 is{' '}
                <span className="k">$1,050/month</span> &mdash; no smaller tier exists, and capacity
                can only be upgraded, never downsized. The decision was easy. BigQuery&rsquo;s free
                tier: 1 TB/month of queries, 10 GB storage, serverless, no CU throttling, no DDL
                collisions. Estimated usage sat well inside free.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Deep-dive divider ───── */}
      <section className="cs-divider" id="deepdive">
        <div className="container">
          <div className="dtag">◆ The deep dive begins here</div>
          <h2>
            For the engineers: the <em>decisions</em>, the bugs, the judgment calls.
          </h2>
          <p>
            The cost discipline above implies the rest. What follows is the substance &mdash; the
            architecture, the two silent-failure bugs, and the ETL I had to rebuild from a 34-line
            stub.
          </p>
        </div>
      </section>

      {/* ───── Crisis query ───── */}
      <section className="cs-section">
        <div className="container">
          <div className="cs-head">
            <div className="tag">
              § 03 / The crisis query<span className="big">60min → 1s</span>
            </div>
            <div className="cs-body">
              <h2>The single most dramatic number.</h2>
              <p>
                <code>gold_crisis_analysis</code> joins crisis events against stock prices in ±30-day
                windows &mdash; a cross-join with date filtering and self-joins. On Fabric F4 it timed
                out at 60 minutes, every time. The script&rsquo;s own comments read:{' '}
                <em>
                  &ldquo;the server-side scan consistently exceeds 15 min on Fabric F4 trial
                  regardless of query plan.&rdquo;
                </em>
              </p>

              <div className="cs-crisis">
                <div className="cs-crisis-head">
                  <span className="t">◆ gold_crisis_analysis · runtime</span>
                  <span className="m">75 rows returned</span>
                </div>
                <div className="cs-crisis-body">
                  <div className="cs-bar-row">
                    <div className="lbl">
                      Fabric F4<span className="sub">cross-join + self-joins</span>
                    </div>
                    <div className="cs-bar-track">
                      <div className="cs-bar-fill fabric">60 min &mdash; timeout</div>
                    </div>
                  </div>
                  <div className="cs-bar-row">
                    <div className="lbl">
                      BigQuery<span className="sub">serverless · parallel</span>
                    </div>
                    <div className="cs-bar-track">
                      <div className="cs-bar-fill bq"></div>
                      <span className="out">&lt; 1 second</span>
                    </div>
                  </div>
                </div>
                <div className="cs-crisis-note">
                  <span className="accent">Not 3,600× because the engineering is brilliant</span>{' '}
                  &mdash; it&rsquo;s because BigQuery&rsquo;s serverless model and parallelism fit the
                  query shape, and Fabric&rsquo;s F4 capacity didn&rsquo;t. The practical impact is
                  real: a piece of the system that <em>couldn&rsquo;t run</em> now refreshes live in
                  the daily export, and the load-from-disk hack is deleted.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Two bugs ───── */}
      <section className="cs-section shade">
        <div className="container">
          <div className="cs-head">
            <div className="tag">
              § 04 / Two bugs<span className="big">Verify output</span>
            </div>
            <div className="cs-body">
              <p className="lead">
                &ldquo;It ran&rdquo; is not &ldquo;it works.&rdquo; Both of these were silent &mdash;
                no exceptions, no logs, no test failures. Both surfaced only because I checked actual
                output against a baseline.
              </p>

              <div className="cs-bug">
                <div className="bhead">
                  <span className="bnum">Bug 01</span>
                  <span className="btitle">Cross-project dataset collision</span>
                </div>
                <p>
                  Both the Investment Portfolio and Energy dbt projects had tables named{' '}
                  <code>silver_stock_prices</code>, <code>silver_calendar</code>,{' '}
                  <code>silver_forex_rates</code> &mdash; and both routed to the{' '}
                  <span className="k">same</span> shared <code>silver</code> dataset. Whichever ran
                  last silently overwrote the other.
                </p>
                <p>
                  What made it insidious: Portfolio&rsquo;s <code>gold_portfolio.*</code> tables were
                  already materialized, so its dashboard kept showing correct cached data while its
                  silver had been clobbered by Energy. A perpetual mutual-corruption loop, invisible
                  until someone queried both at once.
                </p>
                <p>
                  The fix isolated Portfolio into its own namespace (<code>bronze_portfolio</code> /{' '}
                  <code>silver_portfolio</code> / <code>gold_portfolio</code>). But what&rsquo;s
                  notable isn&rsquo;t the fix &mdash; <em>it&rsquo;s how I noticed.</em> The dbt runs
                  passed. Row counts matched. Nothing complained. I noticed because the table names
                  looked architecturally wrong: two projects shouldn&rsquo;t write the same name to
                  the same place. That came from reasoning about the architecture, not from any log.
                </p>
                <div className="cs-code">
                  <div className="cs-code-head">
                    <span>dbt_project.yml</span>
                    <span className="lang">yaml</span>
                  </div>
                  <pre>
                    {`models:
  portfolio:
    `}
                    <span className="cm"># was: +schema: silver  (shared — collision)</span>
                    {`
    bronze: { +schema: bronze_portfolio }
    silver: { +schema: silver_portfolio }
    gold:   { +schema: gold_portfolio }`}
                  </pre>
                </div>
              </div>

              <div className="cs-bug">
                <div className="bhead">
                  <span className="bnum">Bug 02</span>
                  <span className="btitle">Decimal → string JSON serialization</span>
                </div>
                <p>
                  Before pushing the converted export script live, I diff-checked one regenerated
                  JSON file against its previous version. Field names matched &mdash; but the new
                  values were <em>quoted strings</em> (<code>"48.39..."</code>) where the old were
                  bare numbers (<code>51.36</code>).
                </p>
                <p>
                  BigQuery returns NUMERIC columns as Python <code>Decimal</code>. The export was
                  doing <code>json.dump(rows, default=str)</code>, which stringified every Decimal.
                  The frontend&rsquo;s <code>typeof v === 'number'</code> checks would have silently
                  dropped every numeric value &mdash; blank dashboards, no error.
                </p>
                <div className="cs-code">
                  <div className="cs-code-head">
                    <span>export_to_json.py</span>
                    <span className="lang">python</span>
                  </div>
                  <pre>
                    {``}
                    <span className="cm"># applied before json.dump — Decimal/date safe</span>
                    {`
`}
                    <span className="kw">def</span>
                    {` `}
                    <span className="fn">sanitize_value</span>
                    {`(v):
    `}
                    <span className="kw">if</span>
                    {` isinstance(v, Decimal):  `}
                    <span className="kw">return</span>
                    {` `}
                    <span className="fn">float</span>
                    {`(v)
    `}
                    <span className="kw">if</span>
                    {` isinstance(v, (date, datetime)): `}
                    <span className="kw">return</span>
                    {` v.isoformat()
    `}
                    <span className="kw">return</span>
                    {` v`}
                  </pre>
                </div>
                <p>
                  The backend&rsquo;s converted <code>database.py</code> already had this sanitization
                  &mdash; only the standalone export script was missing it. Easy to miss; impossible
                  to miss if you diff the output.
                </p>
              </div>

              <div className="cs-pull">
                The discipline that matters is verifying output against a baseline. The migrations
                themselves are the easy part.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── EIA rebuild ───── */}
      <section className="cs-section">
        <div className="container">
          <div className="cs-head">
            <div className="tag">
              § 05 / EIA ETL<span className="big">Rebuilt</span>
            </div>
            <div className="cs-body">
              <h2>
                Reconstructed from a stub, reconciled to the <em>exact</em> row count.
              </h2>
              <p>
                The Energy project&rsquo;s EIA bronze ingestion existed in the old repo as a{' '}
                <span className="k">34-line stub</span> &mdash; auth and config, but no fetch loop and
                no write logic. The data was in Fabric because someone (past me?) had run a working
                version manually once and never committed it.
              </p>
              <p>
                I reconstructed the pipeline against EIA&rsquo;s v2 international API and reconciled it
                against the Fabric backup:
              </p>
              <div className="cs-code">
                <div className="cs-code-head">
                  <span>reconciliation</span>
                  <span className="lang">log</span>
                </div>
                <pre>
                  {`first live run ............ 13,678 rows
backup baseline ........... 25,122 rows   `}
                  <span className="cm"># off by 11,444</span>
                  {`
  cause a: ~9 units per datapoint (kWh, BTU…) → silver joins canonical unit
  cause b: start year was 2000, baseline used 1973
fix start=1973, re-run .... `}
                  <span className="st">25,122 rows</span>
                  {`   `}
                  <span className="cm"># exact match</span>
                  {`
silver rebuild ............ `}
                  <span className="st">10,872 rows</span>
                  {`   `}
                  <span className="cm"># matches baseline</span>
                  {``}
                </pre>
              </div>
              <p>
                That second number is the point. Not &ldquo;approximately the same&rdquo; &mdash;{' '}
                <em>exactly</em> the baseline. The reconciliation, not the rebuild, was the work that
                mattered.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───── What's open ───── */}
      <section className="cs-section shade">
        <div className="container">
          <div className="cs-head">
            <div className="tag">
              § 06 / Honest reflection<span className="big">Still open</span>
            </div>
            <div className="cs-body">
              <h2>What&rsquo;s open, what I&rsquo;d do differently.</h2>
              <p>
                <span className="k">Power BI public embeds were trial-backed.</span> Microsoft
                restricted free-tier embed creation around Feb 2026, so when the trial lapses the
                embeds die. The React/Recharts pages already render the same data, so the deferred
                decision is: swap for free-tier embeds if they work, use static snapshots, or drop the
                CTAs entirely.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Stack ───── */}
      <section className="cs-section">
        <div className="container">
          <div className="cs-head">
            <div className="tag">
              § 07 / Stack<span className="big">Tooling</span>
            </div>
            <div className="cs-body" style={{ maxWidth: 'none' }}>
              <div className="cs-techgrid">
                <div className="col">
                  <div className="k">
                    <span className="ix">01</span> Data platform
                  </div>
                  <div className="vals">
                    <span className="pill">
                      BigQuery <em>free tier</em>
                    </span>
                    <span className="pill">dbt · Standard SQL</span>
                    <span className="pill">Medallion · bronze/silver/gold</span>
                  </div>
                </div>
                <div className="col">
                  <div className="k">
                    <span className="ix">02</span> Backend &amp; automation
                  </div>
                  <div className="vals">
                    <span className="pill">Python · FastAPI</span>
                    <span className="pill">
                      google-cloud-bigquery <em>3.25</em>
                    </span>
                    <span className="pill">GitHub Actions · daily</span>
                  </div>
                </div>
                <div className="col">
                  <div className="k">
                    <span className="ix">03</span> Serving
                  </div>
                  <div className="vals">
                    <span className="pill">Vercel · static-first</span>
                    <span className="pill">Railway · API fallback</span>
                    <span className="pill">Power BI · Recharts</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── End strip ───── */}
      <section className="cs-end">
        <div className="container">
          <div className="cs-end-grid">
            <div className="note">
              <div style={{ marginBottom: 6 }}>
                ◆ status /{' '}
                <span className="accent">
                  complete · 3 projects + live backend on BigQuery · daily automation green · ₹0
                </span>
              </div>
              <div>Built and designed with Claude. Source on GitHub.</div>
            </div>
            <div className="links">
              <Link className="lbtn" to="/projects">
                ← all projects
              </Link>
              <a
                className="lbtn"
                href="https://github.com/ArravindShri"
                target="_blank"
                rel="noopener noreferrer"
              >
                ◆ github
              </a>
              <Link className="lbtn primary" to="/contact">
                get in touch →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}