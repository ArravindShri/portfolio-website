import { useEffect, useState } from 'react';
import SEO from '../components/SEO.jsx';

const INTENTS = ['hiring', 'collab', 'consulting', 'just-curious'];

// Web3Forms public access key. The endpoint accepts JSON, validates the
// access_key server-side, and forwards the message to the configured inbox.
const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';
const WEB3FORMS_ACCESS_KEY = '69975f17-4d28-4000-bed2-8372b90c531c';

// ---------------------------------------------------------------------------
// Terminal-styled contact form. POSTs to /api/contact (FastAPI on Railway),
// which forwards the message via SMTP. Status lifecycle drives both the
// CTA label and the bottom-row dot/text.
// ---------------------------------------------------------------------------
const STATUS_DOT = {
  ready: 'var(--accent)',
  sending: 'var(--warn)',
  sent: 'var(--good)',
  error: 'var(--bad)',
};

// Client-side cooldown after a successful submission. Stops the form from
// being abused as a spam relay against the Web3Forms public access key.
const COOLDOWN_MS = 60_000;

function Term() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    org: '',
    intent: 'hiring',
    message: '',
  });
  const [status, setStatus] = useState('ready'); // ready | sending | sent | error
  const [errorMsg, setErrorMsg] = useState('');
  const [cooldownUntil, setCooldownUntil] = useState(0);
  // Tick state forces a re-render once a second during the cooldown so the
  // status footer's countdown updates live.
  const [, setTick] = useState(0);

  // While in cooldown, increment `tick` every second. When the cooldown
  // ends, flip status back to 'ready' so the form is usable again.
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return undefined;
    const id = setInterval(() => {
      if (Date.now() >= cooldownUntil) {
        clearInterval(id);
        setStatus('ready');
      } else {
        setTick((t) => t + 1);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const setField = (k) => (e) =>
    setFormData((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    setStatus('sending');
    setErrorMsg('');
    try {
      const res = await fetch(WEB3FORMS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          name: formData.name,
          email: formData.email,
          subject: `Portfolio Contact: ${formData.intent || 'General'} — ${formData.name}`,
          message: formData.message,
          org: formData.org || '(not provided)',
          intent: formData.intent || '(not selected)',
          from_name: 'Portfolio Contact Form',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(
          data.message || data.error || `Failed to send (HTTP ${res.status})`,
        );
      }
      setStatus('sent');
      setCooldownUntil(Date.now() + COOLDOWN_MS);
      setFormData({ name: '', email: '', org: '', intent: 'hiring', message: '' });
    } catch (err) {
      console.error('[contact] submission failed:', err);
      setErrorMsg(err?.message || String(err));
      setStatus('error');
    }
  };

  const cooling = Date.now() < cooldownUntil;
  const cooldownSeconds = cooling
    ? Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000))
    : 0;
  const sending = status === 'sending';

  const statusText = (() => {
    if (status === 'sending') return 'SENDING · transmitting…';
    if (status === 'sent') {
      if (cooling) {
        return `SENT · message delivered · next submission available in ${cooldownSeconds}s`;
      }
      return 'SENT · message delivered · response within 48h';
    }
    if (status === 'error') return `ERROR · ${errorMsg}`;
    const composing =
      formData.name || formData.email || formData.message
        ? 'composing'
        : 'awaiting input';
    return `READY · ${composing} · 0 attachments · plaintext`;
  })();

  const buttonLabel = sending
    ? '… sending'
    : status === 'sent'
    ? '✓ sent'
    : 'send →';

  return (
    <form className="term" onSubmit={handleSubmit}>
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
              className={formData.intent === i ? 'on' : ''}
              onClick={() => setFormData((p) => ({ ...p, intent: i }))}
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
            value={formData.name}
            onChange={setField('name')}
            required
          />
          <input
            className="term-input"
            type="email"
            placeholder="email ·········"
            value={formData.email}
            onChange={setField('email')}
            required
          />
        </div>
        <div className="term-field" style={{ marginTop: 6 }}>
          <input
            className="term-input"
            placeholder="org / team (optional)"
            value={formData.org}
            onChange={setField('org')}
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
            value={formData.message}
            onChange={setField('message')}
            required
          />
        </div>

        <div className="term-cta">
          <button type="submit" disabled={sending || cooling}>
            {buttonLabel}
          </button>
          <span className="help">↵ ENTER to send · response within 48h</span>
        </div>
      </div>
      <div className={`term-status status-${status}`}>
        <span
          className="dot"
          style={{ background: STATUS_DOT[status] }}
        />
        <span>{statusText}</span>
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
      <SEO
        title="Contact"
        description="Get in touch with Shri Arravindhar — open to full-time data/BI roles, consulting engagements, and speaking. Based in Chennai, remote-friendly."
        path="/contact"
      />
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
