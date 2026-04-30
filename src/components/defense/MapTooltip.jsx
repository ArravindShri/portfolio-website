/* Floating tooltip (cursor-anchored, edge-aware, rich).
   Used inside `.map-block` containers — positioning is relative to nearest
   positioned ancestor.
   Ported from claude.ai/design Defense Intelligence package. */

import { useLayoutEffect, useRef, useState } from 'react';

export const MapTooltip = ({ data, x, y }) => {
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: x + 14, top: y + 14 });

  useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const parent = el.parentElement;
    if (!parent) return;
    const pr = parent.getBoundingClientRect();
    const tw = el.offsetWidth;
    const th = el.offsetHeight;
    let left = x + 14;
    let top = y + 14;
    if (left + tw + 8 > pr.width) left = x - tw - 14;
    if (left < 8) left = 8;
    if (top + th + 8 > pr.height) top = Math.max(8, y - th - 14);
    setPos({ left, top });
  }, [x, y, data]);

  if (!data) return null;
  return (
    <div ref={ref} className="map-tooltip" style={{ left: pos.left, top: pos.top }}>
      <div className="t-name">{data.name}</div>
      {data.lines && data.lines.length > 0 && data.lines.map((l, i) => (
        <div key={i} className="t-row">
          <span className="k">{l.k}</span>
          <span className={'v' + (l.tone ? ' ' + l.tone : '')}>{l.v}</span>
        </div>
      ))}
      {data.sections && data.sections.map((s, i) => (
        <div key={i} className="t-section">
          <div className="t-section-tag">{s.tag}</div>
          {!s.items || s.items.length === 0 ? (
            <div className="t-empty">{s.empty || '—'}</div>
          ) : (
            <div className="t-list">
              {s.items.map((it, j) => (
                <div key={j} className="t-list-row">
                  {it.rk && <span className="rk">{it.rk}</span>}
                  <span className="nm">{it.nm}</span>
                  {it.v != null && <span className="v">{it.v}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
