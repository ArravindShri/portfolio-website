import { useState } from 'react';

const INTENTS = ['hiring', 'collab', 'consulting', 'just-curious'];

// ---------------------------------------------------------------------------
// Terminal-styled contact form. The submit handler is a visual no-op — the
// page is statically hosted on Vercel, so "send" just flashes a queued state.
// Real channels live in the right-hand column.
// ---------------------------------------------------------------------------
function Term() {
  const [intent, setIntent] = useState('hiring');
  const [form, setForm] = useState({ name: '', email: '', org: '', msg: '' });
  const [sent, setSent] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  };

  const composing = form.name || form.email || form.msg ? 'composing' : 'awaiting input';

  return (
    <form className="term" onSubmit={submit}>
      <div className="term-bar">
        <span className="dot live" />
        <span className="dot" />
        <span className="dot" />
        <span className="title">shri@portfolio:~/contact ·· compose.sh</span>
        <span className="right">SECURE · TLS 1.3</span>
      </div>
      <div className="term-body">
        <div className="term-line">
          <span className="term-prompt">$</span>
          <span>
            <span className="term-key">init</span>{' '}
            <span className="term-val">contact-form</span>{' '}
            <span style={{ color: '#6A6357' }}>--mode=async</span>
          </span>
        </div>
        <div className="term-comment">
          # tell me who you are and what you’re working on. I read everything.
        </div>

        <div className="term-line" style={{ marginTop: 18 }}>
          <span className="term-prompt">{'>'}</span>
          <span className="term-key">intent</span>
        </div>
        <div className="term-radio">
          {INTENTS.map((i) => (
            <button
              key={i}
              type="button"
              className={intent === i ? 'on' : ''}
              onClick={() => setIntent(i)}
            >
              --{i}
            </button>
          ))}
        </div>

        <div className="term-line" style={{ marginTop: 22 }}>
          <span className="term-prompt">{'>'}</span>
          <span className="term-key">identity</span>
        </div>
        <div className="term-field term-field-row">
          <input
            className="term-input"
            placeholder="name ··········"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="term-input"
            type="email"
            placeholder="email ·········"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="term-field" style={{ marginTop: 6 }}>
          <input
            className="term-input"
            placeholder="org / team (optional)"
            value={form.org}
            onChange={(e) => setForm({ ...form, org: e.target.value })}
          />
        </div>

        <div className="term-line" style={{ marginTop: 22 }}>
          <span className="term-prompt">{'>'}</span>
          <span className="term-key">payload</span>
        </div>
        <div className="term-field">
          <textarea
            className="term-textarea"
            placeholder={
              'the project, the role, the question — whatever brought you here.\n\n(plain text. no pitch deck required.)'
            }
            value={form.msg}
            onChange={(e) => setForm({ ...form, msg: e.target.value })}
          />
        </div>

        <div className="term-cta">
          <button type="submit">{sent ? '✓ queued' : 'send →'}</button>
          <span className="help">↵ ENTER to send · response within 48h</span>
        </div>
      </div>
      <div className="term-status">
        <span className="dot" />
        <span>READY · {composing} · 0 attachments · plaintext</span>
      </div>
    </form>
  );
}

// Availability heatmap — 3 rows (morning/afternoon/evening) × 7 cols (M–S).
const AVAILABILITY = [
  ['md', 'hi', 'hi', 'hi', 'md', 'lo', 'lo'],
  ['md', 'hi', 'hi', 'hi', 'md', 'lo', 'lo'],
  ['hi', 'hi', 'hi', 'hi', 'hi', 'md', 'lo'],
];
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function Contact() {
  return (
    <>
      <section className="ct-hero">
        <div className="container">
          <div className="ct-eyebrow">◆ CONTACT · open channels</div>
          <h1>
            Let’s <em>start a conversation</em>.
          </h1>
          <p className="lede">
            Thanks for making it this far — that already means a lot. Whether
            you’re hiring, exploring a collaboration, or just curious about
            something on the site, I’d genuinely love to hear from you. The
            form below is the quickest way to reach me; other channels are on
            the right. I aim to reply within 48 hours.
          </p>
        </div>
      </section>

      <section className="ct-section">
        <div className="container">
          <div className="ct-grid">
            <div className="ct-left">
              <Term />
            </div>

            <aside className="ct-right">
              <div className="ch-section">
                <h3>Direct channels</h3>
                <div className="ch-row">
                  <span className="k">Email</span>
                  <span className="v">
                    <a href="mailto:shri@arravindportfolio.tech">
                      shri@arravindportfolio.tech
                    </a>
                  </span>
                  <span className="badge">primary</span>
                </div>
                <div className="ch-row">
                  <span className="k">LinkedIn</span>
                  <span className="v">
                    <a
                      href="https://linkedin.com/in/shri-arravindhar"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      /in/shri-arravindhar
                    </a>
                  </span>
                  <span className="badge">active</span>
                </div>
                <div className="ch-row">
                  <span className="k">GitHub</span>
                  <span className="v">
                    <a
                      href="https://github.com/ArravindShri"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      @ArravindShri
                    </a>
                  </span>
                  <span className="badge">code</span>
                </div>
                <div className="ch-row">
                  <span className="k">Calendly</span>
                  <span className="v">
                    <a href="#">15-min intro · async ok</a>
                  </span>
                  <span className="badge">booking</span>
                </div>
              </div>

              <div className="ch-section">
                <h3>Response window · IST (UTC+5:30)</h3>
                <div className="avail-grid">
                  {DAY_LABELS.map((d, i) => (
                    <div key={`d-${i}`} className="avail-cell day-h">
                      {d}
                    </div>
                  ))}
                  {AVAILABILITY.flat().map((c, i) => (
                    <div key={`c-${i}`} className={`avail-cell ${c}`}>
                      {c}
                    </div>
                  ))}
                </div>
                <div className="avail-legend">
                  <span>
                    <i style={{ background: 'rgba(216,127,69,0.08)' }} />
                    quiet
                  </span>
                  <span>
                    <i style={{ background: 'rgba(216,127,69,0.22)' }} />
                    checking
                  </span>
                  <span>
                    <i style={{ background: 'rgba(216,127,69,0.55)' }} />
                    online
                  </span>
                </div>
                <div className="avail-foot">
                  Rows = morning · afternoon · evening (IST). Most replies land
                  within 48 hours; urgent things tagged in subject line move
                  faster.
                </div>
              </div>

              <div className="ch-section">
                <h3>What I’m currently open to</h3>
                <div className="now-list">
                  <div className="item">
                    <span>◆</span>
                    <div>
                      Full-time analytics-engineering roles · Fabric / dbt /
                      PBI shops
                    </div>
                  </div>
                  <div className="item">
                    <span>◆</span>
                    <div>
                      Short consulting engagements · pipeline audits, semantic
                      models
                    </div>
                  </div>
                  <div className="item">
                    <span>◆</span>
                    <div>Speaking · BI architecture, defense data, energy analytics</div>
                  </div>
                  <div className="item muted">
                    <span>○</span>
                    <div>Cold-pitch SaaS demos · please no</div>
                  </div>
                </div>
              </div>

              <div className="ch-section last">
                <h3>Location</h3>
                <div className="ch-row no-border">
                  <span className="k">Based</span>
                  <span className="v">Chennai, IN</span>
                  <span className="badge">remote-first</span>
                </div>
                <div className="ch-row no-border tight">
                  <span className="k">Travel</span>
                  <span className="v">Open to relocate · APAC / EMEA</span>
                  <span className="badge">flex</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
