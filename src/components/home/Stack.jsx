import { useCallback, useEffect, useRef, useState } from 'react';
import SectionTag from '../SectionTag.jsx';
import { stackLayers, stackEdges } from '../../data/stack.js';

export default function Stack() {
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const [lines, setLines] = useState([]);

  const recompute = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const wrapBox = wrap.getBoundingClientRect();
    const next = [];
    stackEdges.forEach(([a, b]) => {
      const ea = wrap.querySelector(`[data-node="${a}"]`);
      const eb = wrap.querySelector(`[data-node="${b}"]`);
      if (!ea || !eb) return;
      const ra = ea.getBoundingClientRect();
      const rb = eb.getBoundingClientRect();
      const x1 = ra.right - wrapBox.left;
      const y1 = ra.top + ra.height / 2 - wrapBox.top;
      const x2 = rb.left - wrapBox.left;
      const y2 = rb.top + rb.height / 2 - wrapBox.top;
      const mx = (x1 + x2) / 2;
      const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
      next.push(d);
    });
    setLines(next);
  }, []);

  useEffect(() => {
    recompute();
    const ro = new ResizeObserver(recompute);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener('resize', recompute);
    const t = setTimeout(recompute, 300);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', recompute);
      clearTimeout(t);
    };
  }, [recompute]);

  return (
    <section className="stack section" id="stack" data-screen-label="Tech Stack">
      <div className="container">
        <SectionTag num="02" label="Tech stack" path="/ home / architecture.dag" />

        <div className="stack-head">
          <h2>
            The stack, as an <em>architecture</em> — not a list.
          </h2>
          <div className="lede">
            Every tool below earned its place on one of the three live pipelines. Hover any node to
            trace how raw API bytes become a decision —{' '}
            <em>sources on the left, dashboards on the right.</em>
          </div>
        </div>

        <div className="arch">
          <div className="arch-chrome">
            <span className="title">◆ pipeline.dag</span>
            <span className="breadcrumb">
              <span>sources</span>
              <span>→</span>
              <span>ingest</span>
              <span>→</span>
              <span>storage</span>
              <span>→</span>
              <span>transform</span>
              <span>→</span>
              <span className="on">viz</span>
            </span>
          </div>

          <div className="arch-body" ref={wrapRef}>
            <svg
              ref={svgRef}
              className="connector-canvas"
              width="100%"
              height="100%"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="edgeGrad" x1="0" x2="1">
                  <stop offset="0" stopColor="#5A5348" stopOpacity="0.2" />
                  <stop offset="1" stopColor="#DA7756" stopOpacity="0.55" />
                </linearGradient>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#DA7756" opacity="0.7" />
                </marker>
              </defs>
              {lines.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke="url(#edgeGrad)"
                  strokeWidth="1.1"
                  strokeDasharray="3 3"
                  markerEnd="url(#arrow)"
                />
              ))}
            </svg>

            <div className="arch-grid">
              {stackLayers.map((layer, idx) => (
                <div key={layer.label} className="arch-col">
                  <div className="col-label">
                    <span>{layer.label}</span>
                    <span className="idx">L{idx + 1}</span>
                  </div>
                  {layer.items.map((it) => (
                    <div
                      key={it.id}
                      data-node={it.id}
                      className={`node ${it.live ? 'live' : ''}`}
                    >
                      <div>
                        <div className="name">
                          {it.live && (
                            <span
                              className="dot"
                              style={{ marginRight: 8, display: 'inline-block' }}
                            />
                          )}
                          {it.name}
                        </div>
                        <div className="type">{it.type}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="arch-foot">
            <span>
              Last run: <span className="ok">OK · 02:14 UTC</span> · duration 4m 18s · rows +18,204
            </span>
            <span>cron: 0 2 * * * · via gh-actions</span>
          </div>
        </div>

        <div className="stack-extras">
          <div className="col">
            <div className="k">Languages</div>
            <div className="vals">
              <span>SQL</span>
              <span>Python</span>
              <span>DAX</span>
              <span>M</span>
            </div>
          </div>
          <div className="col">
            <div className="k">Databases</div>
            <div className="vals">
              <span>Fabric Warehouse</span>
              <span>SQL Server</span>
              <span>Lakehouse</span>
            </div>
          </div>
          <div className="col">
            <div className="k">Patterns</div>
            <div className="vals">
              <span>Medallion</span>
              <span>CI/CD</span>
              <span>Service Principal Auth</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
