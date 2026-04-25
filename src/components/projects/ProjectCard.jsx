import { Link } from 'react-router-dom';
import { visualMap } from './Visuals.jsx';

export default function ProjectCard({ p }) {
  const Visual = visualMap[p.visual];
  return (
    <article className={`card ${p.migrated ? 'migrated' : ''}`} data-screen-label={`Card ${p.id}`}>
      <div className="card-head">
        <span className="id">§ {p.id}</span>
        <span className="domain">{p.domain}</span>
      </div>
      <div className="card-visual">
        <div className="visual-meta">
          {p.visualLabel}
          <span className="big">{p.visualStat}</span>
        </div>
        {Visual && <Visual />}
      </div>
      <div className="card-body">
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <h3 className="card-title" style={{ margin: 0 }}>
              {p.title}
            </h3>
            <span className="live-badge">
              <span className="dot" />
              LIVE
            </span>
          </div>
          <p className="card-desc" style={{ margin: 0 }}>
            {p.desc}
          </p>
        </div>
        <div className="card-tech">
          {p.tech.map((t) => (
            <span key={t} className="t">
              {t}
            </span>
          ))}
        </div>
        <div className="card-stats">
          <div className="card-stat">
            <div className="k">{p.stat1.k}</div>
            <div className="v">{p.stat1.v}</div>
          </div>
          <div className="card-stat">
            <div className="k">{p.stat2.k}</div>
            <div className="v">{p.stat2.v}</div>
          </div>
        </div>
      </div>
      <div className="card-foot">
        <Link className="explore" to={p.to}>
          Explore <span className="arrow">→</span>
        </Link>
        <span className="stack-note">{p.stackNote}</span>
      </div>
    </article>
  );
}
