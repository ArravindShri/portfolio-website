import { Link } from 'react-router-dom';
import SEO from '../components/SEO.jsx';

// ---------------------------------------------------------------------------
// Three chapters of the long-form journey. Content is the source of truth;
// each chapter has a metadata column (year, label, role, stack) and a
// narrative body with a pull-quote and a one-line lesson.
// ---------------------------------------------------------------------------
const CHAPTERS = [
  {
    yr: '2020 — 2023',
    ch: 'Ch. 01 · Detour',
    place: 'Aerospace → Analytics',
    role: 'A pivot, not a rebrand',
    stack: ['Resilience', 'SQL', 'Python', 'Power BI', 'A long-term plan'],
    title: (
      <>
        Why aerospace became analytics — and why <em>it isn’t over</em>.
      </>
    ),
    body: [
      <>
        Aeronautical engineering wasn’t a major. It was the plan. I wanted to be an{' '}
        <em>aircraft maintenance officer</em> — flight lines, turnarounds, the
        unglamorous discipline of keeping airframes airworthy. Four years of
        propulsion, aerodynamics, and structures were the runway.
      </>,
      'Then 2020 happened. COVID grounded the industry I was preparing to enter. Hiring froze. Programs paused. Closer to home, there were losses in the family that reordered what "next year" could even mean. The runway shortened. I had to grab the handle that was actually in reach.',
      'Analytics was that handle — and it turned out to be a far better one than I expected. The aerospace habits transferred cleanly: trust the residuals, respect the boundary conditions, never confuse a pretty chart with a true one. SQL replaced MATLAB. Dashboards replaced wind-tunnel plots. The discipline underneath stayed the same.',
      <>
        But the long arc hasn’t changed. The plan now is to go <em>deeper</em>{' '}
        into data — pipelines, semantic models, decision systems — and then bring
        all of it back to where I started: <em>modern aerodefense</em>. Sensor
        fusion, sustainment analytics, fleet readiness, autonomous systems
        telemetry. Aerospace re-entered through the door labeled “data” instead
        of the one labeled “hangar.”
      </>,
    ],
    pull: {
      q: 'You don’t abandon a first love. You take a longer route back, with sharper tools.',
      attrib: '— working principle',
    },
    lesson: 'The pivot wasn’t a retreat. It was the most efficient path back to the same destination.',
  },
  {
    yr: '2024 — 2025',
    ch: 'Ch. 02 · Scale',
    place: 'First real stack',
    role: 'SQL Server → Tableau → Fabric',
    stack: ['SQL Server', 'Tableau', 'Python', 'dbt', 'Microsoft Fabric'],
    title: (
      <>
        From running <em>one query at a time</em>, to running a pipeline.
      </>
    ),
    body: [
      'After Zoho I wanted to go deeper into the data stack — not just consume what someone else modeled, but own the pipeline end-to-end. I started with the defense & conflict project on SQL Server and Tableau because I knew those tools and wanted to prove I could ship something non-trivial with them.',
      'The investment research platform came next, and that’s where I learned what medallion architecture actually feels like to build — bronze staging, silver models, gold marts, and the disciplined boundary between them. Eventually I migrated the whole thing to Fabric and watched refresh times drop from 24 hours to 30 minutes.',
    ],
    pull: {
      q: 'You don’t understand the data stack until the pipeline breaks at 3am and it’s your job to fix it.',
      attrib: '— something I tell myself',
    },
    lesson: 'Owning the pipeline — not just the chart — is what actually makes someone an analytics engineer.',
  },
  {
    yr: '2025 — now',
    ch: 'Ch. 03 · Now',
    place: 'Analytics engineer',
    role: 'Building at the Fabric · dbt · Power BI seam',
    stack: ['Microsoft Fabric', 'dbt', 'Power BI', 'Python', 'DAX', 'Delta'],
    title: (
      <>
        What I <em>build</em> today, and why.
      </>
    ),
    body: [
      'Three public projects — energy, defense, investment — plus a dozen private ones. They all share a shape: external data, medallion warehouse, parameterized reporting, crisis/event-aware overlays. The shape isn’t an accident. It’s what I think good analytics engineering looks like in 2025.',
      'The aerospace habit of trusting residuals has never left. Every dashboard I ship has a "this is where the model is wrong" slide somewhere in it. That’s the one I care about most.',
    ],
    pull: {
      q: 'Good analytics isn’t about having the answer. It’s about being honest about what the data can’t tell you.',
      attrib: '— working thesis',
    },
    lesson: 'I’m not done. I’m just visible now.',
  },
];

export default function Journey() {
  return (
    <>
      <SEO
        title="Journey"
        description="From Aeronautical Engineering to Data Analytics — career timeline, skill progression, certifications, and the transition from ZOHO customer success to data engineering."
        path="/journey"
      />
      <section className="jr-hero">
        <div className="container">
          <div className="jr-eyebrow">◆ JOURNEY · long form</div>
          <h1>
            Six years, two disciplines, one <em>habit</em>.
          </h1>
          <p className="lede">
            Aerospace taught me to trust residuals. Zoho taught me reduction. The
            data stack taught me pipelines. The habit in the middle —
            skepticism about my own work — is the thing I’m actually selling.
          </p>
          <div className="jr-meta">
            <div className="cell">
              <div className="k">Started</div>
              <div className="v">2019</div>
              <div className="sub">aerospace B.E.</div>
            </div>
            <div className="cell">
              <div className="k">Pivoted</div>
              <div className="v">2023</div>
              <div className="sub">Zoho · analyst</div>
            </div>
            <div className="cell">
              <div className="k">Shipped</div>
              <div className="v">8+ projects</div>
              <div className="sub">3 public, 5 private</div>
            </div>
            <div className="cell">
              <div className="k">Current</div>
              <div className="v">Analytics engineer</div>
              <div className="sub">Fabric · dbt · PBI</div>
            </div>
          </div>
        </div>
      </section>

      {CHAPTERS.map((c, i) => (
        <section key={i} className="chapter">
          <div className="container">
            <div className="chapter-grid">
              <aside className="chapter-meta">
                <div className="yr">{c.yr}</div>
                <div className="ch">{c.ch}</div>
                <div className="place">{c.place}</div>
                <div className="role">{c.role}</div>
                <div className="stack-list">
                  {c.stack.map((s) => (
                    <div key={s}>
                      <span>◆</span>
                      {s}
                    </div>
                  ))}
                </div>
              </aside>
              <div className="chapter-body">
                <h2>{c.title}</h2>
                {c.body.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
                <blockquote className="pull">
                  “{c.pull.q}”
                  <span className="attrib">{c.pull.attrib}</span>
                </blockquote>
                <div className="lesson">
                  <span className="tag">Lesson</span>
                  <div className="txt">{c.lesson}</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      <section className="jr-close">
        <div className="container">
          <div className="jr-eyebrow">◆ next chapter</div>
          <h2>
            The work is <em>public</em>. The conversation is up to you.
          </h2>
          <p className="jr-close-lede">
            Three deep-dives live. Four earlier mocks in the archive. If any of
            it resonates — the aerospace rigor, the pipeline craft, the
            crisis-aware analytics — I’d like to hear what you’re working on.
          </p>
          <div className="ctas">
            <Link className="btn" to="/projects">
              ← see projects
            </Link>
            <Link className="btn primary" to="/contact">
              start a conversation →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
