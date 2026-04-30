/* Shared chart primitives — tiny, hand-rolled SVG charts tuned to the
   terminal/financial-data aesthetic. All charts share terracotta accent,
   muted tick/grid lines, JetBrains Mono for labels.
   Ported from claude.ai/design Defense Intelligence package. */

const ACCENT = '#DA7756';
const ACCENT_DIM = '#8A4A34';
const GOOD = '#9DB17C';
const BAD = '#C45C4A';
const WARN = '#D9A441';
const INK = '#F2EDE4';
const INK2 = '#C9C1B3';
const INK3 = '#8A8276';
const INK4 = '#5A5348';

export const CHART_COLORS = { ACCENT, ACCENT_DIM, GOOD, BAD, WARN, INK, INK2, INK3, INK4 };

export const Panel = ({ title, meta, live, foot, children, style }) => (
  <div className="dd-panel" style={style}>
    <div className="dd-panel-head">
      <span className="title">◆ {title}</span>
      <span className="meta">
        {meta && <span>{meta}</span>}
        {live && <span className="live">LIVE</span>}
      </span>
    </div>
    <div className="dd-panel-body">{children}</div>
    {foot && <div className="dd-panel-foot">{foot}</div>}
  </div>
);

/* ─── Bar chart ─────────────────────────────── */
export const BarChart = ({ data, h = 220, vmin = 0, vmax, refLine, showValues = true, horizontal = false }) => {
  const W = 520;
  const PAD = { l: 40, r: 20, t: 16, b: 32 };
  if (!Array.isArray(data) || data.length === 0) {
    return <div className="chart-wrap"><svg viewBox={`0 0 ${W} ${h}`} /></div>;
  }
  const max = vmax ?? Math.max(...data.map(d => d.v)) * 1.15;
  const min = vmin;
  if (horizontal) {
    const rowH = (h - PAD.t - PAD.b) / data.length;
    return (
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${W} ${h}`}>
          {[0, 0.25, 0.5, 0.75, 1].map(g => {
            const x = PAD.l + g * (W - PAD.l - PAD.r);
            return (
              <g key={g}>
                <line x1={x} x2={x} y1={PAD.t} y2={h - PAD.b}
                      stroke="rgba(255,255,255,0.04)" strokeDasharray="2 3"/>
                <text x={x} y={h - PAD.b + 14} textAnchor="middle"
                      fontFamily="JetBrains Mono" fontSize="9" fill={INK3}>
                  {(min + g * (max - min)).toFixed(0)}
                </text>
              </g>
            );
          })}
          {data.map((d, i) => {
            const y = PAD.t + i * rowH + 3;
            const bh = rowH - 6;
            const bw = ((d.v - min) / (max - min)) * (W - PAD.l - PAD.r);
            const color = d.color || ACCENT;
            return (
              <g key={d.label + i}>
                <text x={PAD.l - 6} y={y + bh / 2 + 3}
                      textAnchor="end"
                      fontFamily="JetBrains Mono" fontSize="10" fill={INK2}>
                  {d.label}
                </text>
                <rect x={PAD.l} y={y} width={Math.max(0, bw)} height={bh} fill={color} opacity="0.88"/>
                {showValues && (
                  <text x={PAD.l + Math.max(0, bw) + 6} y={y + bh / 2 + 3}
                        fontFamily="JetBrains Mono" fontSize="9.5" fill={INK}>
                    {d.v.toFixed(d.v % 1 === 0 ? 0 : 2)}{d.unit || ''}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  const bw = (W - PAD.l - PAD.r) / data.length;
  const scaleY = (v) => PAD.t + (1 - (v - min) / (max - min)) * (h - PAD.t - PAD.b);

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${h}`}>
        {[0, 0.25, 0.5, 0.75, 1].map(g => {
          const y = scaleY(min + g * (max - min));
          return (
            <g key={g}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y}
                    stroke="rgba(255,255,255,0.04)" strokeDasharray="2 3"/>
              <text x={PAD.l - 6} y={y + 3} textAnchor="end"
                    fontFamily="JetBrains Mono" fontSize="9" fill={INK3}>
                {(min + g * (max - min)).toFixed(1)}
              </text>
            </g>
          );
        })}
        {refLine != null && (
          <g>
            <line x1={PAD.l} x2={W - PAD.r}
                  y1={scaleY(refLine)} y2={scaleY(refLine)}
                  stroke={ACCENT} strokeDasharray="3 3" opacity="0.55"/>
            <text x={W - PAD.r} y={scaleY(refLine) - 4} textAnchor="end"
                  fontFamily="JetBrains Mono" fontSize="9" fill={ACCENT}>
              ref = {refLine}
            </text>
          </g>
        )}
        {data.map((d, i) => {
          const x = PAD.l + i * bw + 6;
          const w = bw - 12;
          const zero = scaleY(0);
          const y = d.v >= 0 ? scaleY(d.v) : zero;
          const bh = Math.abs(scaleY(d.v) - zero);
          const color = d.color || ACCENT;
          return (
            <g key={d.label + i}>
              <rect x={x} y={y} width={w} height={bh} fill={color} opacity="0.9"/>
              <text x={x + w / 2} y={h - PAD.b + 14} textAnchor="middle"
                    fontFamily="JetBrains Mono" fontSize="9.5" fill={INK2}>
                {d.label}
              </text>
              {showValues && (
                <text x={x + w / 2} y={y - 4} textAnchor="middle"
                      fontFamily="JetBrains Mono" fontSize="9" fill={INK3}>
                  {d.v > 0 ? '+' : ''}{d.v.toFixed(d.v % 1 === 0 ? 0 : 1)}{d.unit || ''}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* ─── Line chart (supports multi-series, crisis bands, annotations) ─── */
export const LineChart = ({ series, xLabels, h = 240, yMin, yMax, bands = [], annotations = [] }) => {
  const W = 520;
  const PAD = { l: 44, r: 20, t: 16, b: 32 };
  if (!Array.isArray(series) || series.length === 0 || !series[0].data?.length) {
    return <div className="chart-wrap"><svg viewBox={`0 0 ${W} ${h}`} /></div>;
  }
  const all = series.flatMap(s => s.data);
  const min = yMin ?? Math.min(...all);
  const max = yMax ?? Math.max(...all) * 1.05;
  const n = series[0].data.length;
  const scaleX = (i) => PAD.l + (i / Math.max(1, n - 1)) * (W - PAD.l - PAD.r);
  const scaleY = (v) => PAD.t + (1 - (v - min) / (max - min || 1)) * (h - PAD.t - PAD.b);

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${h}`}>
        {[0, 0.25, 0.5, 0.75, 1].map(g => {
          const y = scaleY(min + g * (max - min));
          return (
            <g key={g}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y}
                    stroke="rgba(255,255,255,0.04)" strokeDasharray="2 3"/>
              <text x={PAD.l - 6} y={y + 3} textAnchor="end"
                    fontFamily="JetBrains Mono" fontSize="9" fill={INK3}>
                {(min + g * (max - min)).toFixed(max > 100 ? 0 : 1)}
              </text>
            </g>
          );
        })}
        {bands.map((b, i) => (
          <g key={i}>
            <rect x={scaleX(b.from)}
                  y={PAD.t}
                  width={scaleX(b.to) - scaleX(b.from)}
                  height={h - PAD.t - PAD.b}
                  fill={ACCENT} opacity="0.06"/>
            <line x1={scaleX(b.from)} x2={scaleX(b.from)}
                  y1={PAD.t} y2={h - PAD.b}
                  stroke={ACCENT} opacity="0.35" strokeDasharray="2 3"/>
            <text x={scaleX(b.from) + 4} y={PAD.t + 10}
                  fontFamily="JetBrains Mono" fontSize="8.5" fill={ACCENT}>
              {b.label}
            </text>
          </g>
        ))}
        {series.map((s) => {
          const d = s.data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(v)}`).join(' ');
          const area = d + ` L ${scaleX(n - 1)} ${scaleY(min)} L ${scaleX(0)} ${scaleY(min)} Z`;
          return (
            <g key={s.name}>
              {s.fill && <path d={area} fill={s.color || ACCENT} opacity="0.08"/>}
              <path d={d} fill="none" stroke={s.color || ACCENT} strokeWidth="1.5" opacity="0.9"/>
              {s.dot !== false && (
                <circle cx={scaleX(n - 1)} cy={scaleY(s.data[n - 1])} r="3" fill={s.color || ACCENT}/>
              )}
            </g>
          );
        })}
        {annotations.map((a, i) => (
          <g key={i}>
            <circle cx={scaleX(a.i)} cy={scaleY(a.v)} r="4"
                    fill="none" stroke={ACCENT} strokeWidth="1.2"/>
            <text x={scaleX(a.i) + 8} y={scaleY(a.v) - 6}
                  fontFamily="JetBrains Mono" fontSize="9" fill={ACCENT}>
              {a.label}
            </text>
          </g>
        ))}
        {xLabels && xLabels.map((l, i) => {
          const step = Math.ceil(xLabels.length / 8);
          if (i % step !== 0 && i !== xLabels.length - 1) return null;
          return (
            <text key={i} x={scaleX(i)} y={h - PAD.b + 14} textAnchor="middle"
                  fontFamily="JetBrains Mono" fontSize="9" fill={INK3}>
              {l}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

/* ─── Scatter with bubble size ────────────────── */
export const ScatterChart = ({ data, h = 280, xAxis, yAxis }) => {
  const W = 520;
  const PAD = { l: 44, r: 20, t: 16, b: 34 };
  if (!Array.isArray(data) || data.length === 0) {
    return <div className="chart-wrap"><svg viewBox={`0 0 ${W} ${h}`} /></div>;
  }
  const xs = data.map(d => d.x), ys = data.map(d => d.y);
  const xMin = Math.min(...xs) * 0.9, xMax = Math.max(...xs) * 1.1;
  const yMin = Math.min(...ys, 0), yMax = Math.max(...ys) * 1.1;
  const scaleX = (v) => PAD.l + ((v - xMin) / (xMax - xMin || 1)) * (W - PAD.l - PAD.r);
  const scaleY = (v) => PAD.t + (1 - (v - yMin) / (yMax - yMin || 1)) * (h - PAD.t - PAD.b);
  const rs = data.map(d => d.r ?? 1);
  const rMax = Math.max(...rs), rMin = Math.min(...rs);
  const radius = (r) => 3 + ((r - rMin) / (rMax - rMin + 1e-9)) * 8;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${h}`}>
        {[0, 0.25, 0.5, 0.75, 1].map(g => {
          const y = scaleY(yMin + g * (yMax - yMin));
          const x = scaleX(xMin + g * (xMax - xMin));
          return (
            <g key={g}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y}
                    stroke="rgba(255,255,255,0.04)" strokeDasharray="2 3"/>
              <line x1={x} x2={x} y1={PAD.t} y2={h - PAD.b}
                    stroke="rgba(255,255,255,0.03)" strokeDasharray="2 3"/>
              <text x={PAD.l - 6} y={y + 3} textAnchor="end"
                    fontFamily="JetBrains Mono" fontSize="9" fill={INK3}>
                {(yMin + g * (yMax - yMin)).toFixed(0)}
              </text>
              <text x={x} y={h - PAD.b + 14} textAnchor="middle"
                    fontFamily="JetBrains Mono" fontSize="9" fill={INK3}>
                {(xMin + g * (xMax - xMin)).toFixed(0)}
              </text>
            </g>
          );
        })}
        <line x1={PAD.l} x2={W - PAD.r} y1={scaleY(0)} y2={scaleY(0)}
              stroke="rgba(255,255,255,0.12)"/>
        {xAxis && (
          <text x={W - PAD.r} y={h - 4} textAnchor="end"
                fontFamily="JetBrains Mono" fontSize="9" fill={INK4}>
            {xAxis} →
          </text>
        )}
        {yAxis && (
          <text x={PAD.l} y={12} textAnchor="start"
                fontFamily="JetBrains Mono" fontSize="9" fill={INK4}>
            ↑ {yAxis}
          </text>
        )}
        {data.map((d, i) => {
          const color = d.color || ACCENT;
          return (
            <g key={d.label + i}>
              <circle cx={scaleX(d.x)} cy={scaleY(d.y)} r={radius(d.r ?? 1) + 3}
                      fill={color} opacity="0.22"/>
              <circle cx={scaleX(d.x)} cy={scaleY(d.y)} r={radius(d.r ?? 1)}
                      fill={color} opacity="0.9"/>
              <text x={scaleX(d.x) + radius(d.r ?? 1) + 5}
                    y={scaleY(d.y) + 3}
                    fontFamily="JetBrains Mono" fontSize="9" fill={INK2}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* ─── Range bar (52-wk range) ───────────────── */
export const RangeBars = ({ data, h }) => {
  const rowH = 28;
  const H = h ?? rowH * data.length + 20;
  const W = 520;
  const PAD = { l: 56, r: 60 };
  if (!Array.isArray(data) || data.length === 0) {
    return <div className="chart-wrap"><svg viewBox={`0 0 ${W} ${H}`} /></div>;
  }
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`}>
        {data.map((d, i) => {
          const y = 12 + i * rowH;
          const lx = PAD.l, rx = W - PAD.r;
          const px = lx + ((d.cur - d.lo) / Math.max(1e-9, d.hi - d.lo)) * (rx - lx);
          return (
            <g key={d.sym + i}>
              <text x={PAD.l - 8} y={y + 5} textAnchor="end"
                    fontFamily="JetBrains Mono" fontSize="10" fill={INK}>
                {d.sym}
              </text>
              <line x1={lx} x2={rx} y1={y} y2={y}
                    stroke={INK4} strokeWidth="2" opacity="0.4"/>
              <line x1={lx} x2={lx} y1={y - 4} y2={y + 4}
                    stroke={INK3} strokeWidth="1"/>
              <line x1={rx} x2={rx} y1={y - 4} y2={y + 4}
                    stroke={INK3} strokeWidth="1"/>
              <text x={lx - 2} y={y + 14} textAnchor="end"
                    fontFamily="JetBrains Mono" fontSize="8" fill={INK4}>
                {d.lo}
              </text>
              <text x={rx + 2} y={y + 14}
                    fontFamily="JetBrains Mono" fontSize="8" fill={INK4}>
                {d.hi}
              </text>
              <circle cx={px} cy={y} r="5" fill={ACCENT}/>
              <circle cx={px} cy={y} r="8" fill="none" stroke={ACCENT} opacity="0.4"/>
              <text x={W - 16} y={y + 5} textAnchor="end"
                    fontFamily="JetBrains Mono" fontSize="10" fill={ACCENT}>
                {d.cur}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* ─── Waterfall (max drawdown) ───────────────── */
export const Waterfall = ({ data, h = 240 }) => {
  const W = 520;
  const PAD = { l: 46, r: 20, t: 16, b: 34 };
  if (!Array.isArray(data) || data.length === 0) {
    return <div className="chart-wrap"><svg viewBox={`0 0 ${W} ${h}`} /></div>;
  }
  const bw = (W - PAD.l - PAD.r) / data.length;
  const max = Math.max(...data.map(d => d.v), 0);
  const min = Math.min(...data.map(d => d.v), 0);
  const scaleY = (v) => PAD.t + (1 - (v - min) / (max - min || 1)) * (h - PAD.t - PAD.b);
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${h}`}>
        <line x1={PAD.l} x2={W - PAD.r} y1={scaleY(0)} y2={scaleY(0)}
              stroke="rgba(255,255,255,0.15)"/>
        {[min, 0, max].map((v, i) => (
          <text key={i} x={PAD.l - 6} y={scaleY(v) + 3} textAnchor="end"
                fontFamily="JetBrains Mono" fontSize="9" fill={INK3}>
            {v.toFixed(0)}%
          </text>
        ))}
        {data.map((d, i) => {
          const x = PAD.l + i * bw + 6;
          const w = bw - 12;
          const zero = scaleY(0);
          const y = d.v >= 0 ? scaleY(d.v) : zero;
          const bh = Math.abs(scaleY(d.v) - zero);
          return (
            <g key={d.label + i}>
              <rect x={x} y={y} width={w} height={bh}
                    fill={d.v >= 0 ? GOOD : BAD} opacity="0.85"/>
              <text x={x + w / 2} y={h - PAD.b + 14} textAnchor="middle"
                    fontFamily="JetBrains Mono" fontSize="9" fill={INK2}>
                {d.label}
              </text>
              <text x={x + w / 2} y={(d.v >= 0 ? y - 4 : y + bh + 11)} textAnchor="middle"
                    fontFamily="JetBrains Mono" fontSize="9" fill={INK3}>
                {d.v.toFixed(0)}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
