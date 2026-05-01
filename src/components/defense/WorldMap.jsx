/* Interactive world map — terracotta-on-near-black, equirectangular.
   Renders WORLD_PATHS (auto-generated 1000×500 SVG paths) and accepts a
   `valueFn(id) => number | null` to drive sequential or diverging fills.
   Ported from claude.ai/design Defense Intelligence package. */

import { WORLD_PATHS } from './world-paths.js';

export const WorldMap = ({
  valueFn,
  domain,
  scheme = 'sequential',
  selectedId,
  onSelect,
  onHover,
  height = 460,
  highlightIds = [],
}) => {
  const paths = WORLD_PATHS || {};
  const ids = Object.keys(paths);

  const fillFor = (id) => {
    const v = valueFn ? valueFn(id) : null;
    if (v == null || v === 0) return 'var(--bg-1)';
    if (scheme === 'diverging') {
      const [min, mid, max] = domain;
      if (v > mid) {
        const t = Math.min(1, (v - mid) / Math.max(1e-9, max - mid));
        return `rgba(157, 177, 124, ${0.18 + t * 0.75})`;
      }
      const t = Math.min(1, (mid - v) / Math.max(1e-9, mid - min));
      return `rgba(218, 119, 86, ${0.18 + t * 0.75})`;
    }
    const [min, max] = domain;
    const t = Math.min(1, Math.max(0, (v - min) / Math.max(1e-9, max - min)));
    return `rgba(218, 119, 86, ${0.12 + t * 0.78})`;
  };

  return (
    <div className="worldmap" style={{ height }}>
      <svg
        viewBox="0 30 1000 390"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="wm-grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none"
                  stroke="rgba(218,119,86,0.05)" strokeWidth="0.5"/>
          </pattern>
          {/* Clip the visible viewport so any path that wraps the
              antimeridian (Russia / polar polygons) can't leak a horizontal
              strip across the top/bottom edges. */}
          <clipPath id="wm-viewport">
            <rect x="0" y="30" width="1000" height="390"/>
          </clipPath>
        </defs>
        <rect x="0" y="30" width="1000" height="390" fill="url(#wm-grid)"/>
        <line x1="0" y1="250" x2="1000" y2="250"
              stroke="rgba(218,119,86,0.10)" strokeDasharray="4 6"/>
        <line x1="500" y1="30" x2="500" y2="420"
              stroke="rgba(218,119,86,0.10)" strokeDasharray="4 6"/>

        <g clipPath="url(#wm-viewport)">
        {ids.map((id) => {
          const p = paths[id];
          if (!p?.d) return null;
          const isSelected = id === selectedId;
          const isHigh = highlightIds.includes(id);
          return (
            <path
              key={id}
              d={p.d}
              fill={fillFor(id)}
              stroke={isSelected ? '#F2EDE4' : isHigh ? '#DA7756' : 'rgba(58,52,46,0.7)'}
              strokeWidth={isSelected ? 1.2 : isHigh ? 0.9 : 0.4}
              style={{ cursor: 'pointer', transition: 'fill 0.15s' }}
              onMouseEnter={(e) => onHover && onHover(id, e)}
              onMouseMove={(e) => onHover && onHover(id, e)}
              onMouseLeave={() => onHover && onHover(null)}
              onClick={() => onSelect && onSelect(id)}
            />
          );
        })}
        </g>
      </svg>
    </div>
  );
};
