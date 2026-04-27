import { useEffect, useState } from 'react';

/**
 * Bloomberg-style explainer that sits below each project hero.
 * Lets visitors see this is real, daily-refreshed data — not a mockup.
 *
 * Reads /static/data_meta.json for the last export timestamp unless
 * `lastUpdated` is supplied as a prop.
 */
export default function HowItWorks({
  projectName,
  refreshSchedule,
  dataSources = [],
  pipeline,
  dashboardUrl,
  dashboardLabel,
  detailedPipeline,
  lastUpdated: lastUpdatedProp,
}) {
  const [meta, setMeta] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    if (lastUpdatedProp) return undefined;
    let cancelled = false;
    fetch('/static/data_meta.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j) setMeta(j);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [lastUpdatedProp]);

  const lastIso = lastUpdatedProp || meta?.last_export || null;
  const lastFmt = (() => {
    if (!lastIso) return '—';
    try {
      return new Date(lastIso).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
    } catch {
      return '—';
    }
  })();

  const sourcesText = dataSources.length ? dataSources.join(', ') : 'multiple sources';
  const detail = detailedPipeline || pipeline;

  // Cadence dot/label adapts to the schedule string so the "DAILY" tag
  // doesn't lie on quarterly datasets like Defense.
  const isDaily = (refreshSchedule || '').toLowerCase().includes('daily');
  const cadenceDot = isDaily ? '●' : '◆';
  const cadenceLabel = isDaily ? 'DAILY' : 'QUARTERLY';

  return (
    <section className="section how-it-works">
      <div className="container">
        <div className="hw-header">◆ HOW THIS WORKS · {projectName}</div>

        <p className="hw-explain">
          This is not a mockup. Every chart and table below is rendered from real data —
          sourced from <strong>{sourcesText}</strong>, transformed through a medallion
          lakehouse, and refreshed <strong>{refreshSchedule}</strong>. The data you see was
          last exported on <strong>{lastFmt}</strong>.
        </p>

        <div className="hw-pipeline" aria-label="Data pipeline">
          <span className="hw-step">Data sources</span>
          <span className="hw-arrow">→</span>
          <span className="hw-step">Transform</span>
          <span className="hw-arrow">→</span>
          <span className="hw-step">Gold tables</span>
          <span className="hw-arrow">→</span>
          <span className="hw-step active">This page</span>
        </div>

        <div className="hw-indicators">
          <span>
            <span className="dot-live">{cadenceDot}</span> {cadenceLabel} — Refreshes:{' '}
            {refreshSchedule}.
          </span>
          <span>
            <span className="dot-cache">○</span> CACHE — Your browser cached this data. The
            timestamp shows when it was loaded. Refresh the page to check for newer data.
          </span>
        </div>

        <div className="hw-cta">
          <a
            className="hw-cta-btn"
            href={dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {dashboardLabel} ↗
          </a>
          <div className="hw-cta-sub">
            Full interactive dashboard with filters, drill-downs, and cross-filtering.
          </div>
        </div>

        <button
          type="button"
          className="hw-toggle"
          onClick={() => setShowDetail((v) => !v)}
          aria-expanded={showDetail}
        >
          {showDetail ? '▾ Hide architecture' : '▸ See the architecture'}
        </button>
        {showDetail && <div className="hw-detail">{detail}</div>}
      </div>
    </section>
  );
}
