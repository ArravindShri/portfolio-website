// Per-project SVG visuals — bars, arcs, scatter — no generic illustrations.

export function EnergyVisual() {
  const data = [
    { c: 'USA', v: 0.88, type: 'P' },
    { c: 'RUS', v: 1.35, type: 'P' },
    { c: 'KSA', v: 1.72, type: 'P' },
    { c: 'CHN', v: 0.72, type: 'C' },
    { c: 'IND', v: 0.48, type: 'C' },
    { c: 'JPN', v: 0.12, type: 'C' },
    { c: 'DEU', v: 0.34, type: 'C' },
    { c: 'BRA', v: 0.94, type: 'P' },
  ];
  const max = 1.8;
  const H = 180;
  const BH = 110;
  const TOP = 40;
  const W = 520;
  const bw = W / data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      {[0, 0.5, 1, 1.5].map((g) => (
        <line
          key={g}
          x1="0"
          x2={W}
          y1={TOP + BH - (g / max) * BH}
          y2={TOP + BH - (g / max) * BH}
          stroke="rgba(255,255,255,0.05)"
          strokeDasharray="2 3"
        />
      ))}
      <line
        x1="0"
        x2={W}
        y1={TOP + BH - (1 / max) * BH}
        y2={TOP + BH - (1 / max) * BH}
        stroke="rgba(218,119,86,0.35)"
        strokeDasharray="3 3"
      />
      <text
        x="6"
        y={TOP + BH - (1 / max) * BH - 4}
        fontFamily="JetBrains Mono"
        fontSize="8"
        fill="#DA7756"
      >
        Self-sufficient (= 1.0)
      </text>

      {data.map((d, i) => {
        const h = (d.v / max) * BH;
        const x = i * bw + 8;
        const y = TOP + BH - h;
        const color = d.type === 'P' ? '#DA7756' : '#5A5348';
        return (
          <g key={d.c}>
            <rect
              x={x}
              y={y}
              width={bw - 16}
              height={h}
              fill={color}
              opacity={d.type === 'P' ? 0.9 : 0.55}
            />
            <text
              x={x + (bw - 16) / 2}
              y={TOP + BH + 14}
              textAnchor="middle"
              fontFamily="JetBrains Mono"
              fontSize="9"
              fill="rgba(201,193,179,0.7)"
            >
              {d.c}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function DefenseVisual() {
  const nodes = [
    { id: 'USA', x: 90, y: 45, r: 7, role: 'X' },
    { id: 'RUS', x: 250, y: 30, r: 6, role: 'X' },
    { id: 'FRA', x: 400, y: 50, r: 5, role: 'X' },
    { id: 'IND', x: 80, y: 140, r: 6, role: 'M' },
    { id: 'KSA', x: 200, y: 155, r: 5, role: 'M' },
    { id: 'CHN', x: 320, y: 145, r: 5, role: 'M' },
    { id: 'EGY', x: 430, y: 150, r: 4, role: 'M' },
  ];
  const edges = [
    ['USA', 'IND'],
    ['USA', 'KSA'],
    ['USA', 'EGY'],
    ['RUS', 'IND'],
    ['RUS', 'CHN'],
    ['FRA', 'IND'],
    ['FRA', 'EGY'],
  ];
  const N = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const W = 520;
  const H = 180;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="fl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#DA7756" stopOpacity="0.6" />
          <stop offset="1" stopColor="#DA7756" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <line x1="0" x2={W} y1="45" y2="45" stroke="rgba(255,255,255,0.05)" />
      <line x1="0" x2={W} y1="150" y2="150" stroke="rgba(255,255,255,0.05)" />
      <text x="8" y="20" fontFamily="JetBrains Mono" fontSize="8" fill="rgba(138,130,118,0.8)">
        EXPORTERS
      </text>
      <text x="8" y="175" fontFamily="JetBrains Mono" fontSize="8" fill="rgba(138,130,118,0.8)">
        IMPORTERS
      </text>

      {edges.map(([a, b], i) => {
        const A = N[a];
        const B = N[b];
        const mx = (A.x + B.x) / 2;
        const my = (A.y + B.y) / 2 + 10;
        return (
          <path
            key={i}
            d={`M ${A.x} ${A.y} Q ${mx} ${my} ${B.x} ${B.y}`}
            fill="none"
            stroke="url(#fl)"
            strokeWidth="1.2"
          />
        );
      })}

      {nodes.map((n) => (
        <g key={n.id}>
          <circle
            cx={n.x}
            cy={n.y}
            r={n.r}
            fill={n.role === 'X' ? '#DA7756' : '#5A5348'}
            opacity={n.role === 'X' ? 1 : 0.7}
          />
          <text
            x={n.x}
            y={n.y + (n.role === 'X' ? -12 : 20)}
            textAnchor="middle"
            fontFamily="JetBrains Mono"
            fontSize="9"
            fill="#C9C1B3"
          >
            {n.id}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function InvestmentVisual() {
  const points = [
    { t: 'XOM', r: 22, v: 18, cat: 'oil' },
    { t: 'CVX', r: 18, v: 16, cat: 'oil' },
    { t: 'BP', r: 11, v: 22, cat: 'oil' },
    { t: 'URA', r: 42, v: 28, cat: 'nuc' },
    { t: 'CCJ', r: 38, v: 31, cat: 'nuc' },
    { t: 'MP', r: -8, v: 35, cat: 'rare' },
    { t: 'LYC', r: 14, v: 38, cat: 'rare' },
    { t: 'TM', r: 9, v: 14, cat: 'auto' },
    { t: 'F', r: -4, v: 25, cat: 'auto' },
    { t: 'GM', r: 12, v: 20, cat: 'auto' },
  ];
  const W = 520;
  const H = 180;
  const PAD = 24;
  const xMax = 40;
  const xMin = 10;
  const yMax = 50;
  const yMin = -15;
  const cx = (v) => PAD + ((v - xMin) / (xMax - xMin)) * (W - PAD * 2);
  const cy = (r) => H - PAD - ((r - yMin) / (yMax - yMin)) * (H - PAD * 2);
  const colors = { oil: '#DA7756', nuc: '#D9A441', rare: '#9DB17C', auto: '#8A8276' };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <line x1={PAD} x2={W - PAD} y1={cy(0)} y2={cy(0)} stroke="rgba(255,255,255,0.1)" />
      {[0, 10, 20, 30, 40].map((x) => (
        <line
          key={x}
          x1={cx(x)}
          x2={cx(x)}
          y1={PAD}
          y2={H - PAD}
          stroke="rgba(255,255,255,0.04)"
          strokeDasharray="2 3"
        />
      ))}
      <text x={PAD} y={16} fontFamily="JetBrains Mono" fontSize="8" fill="rgba(138,130,118,0.8)">
        RETURN ↑
      </text>
      <text
        x={W - 60}
        y={H - 8}
        fontFamily="JetBrains Mono"
        fontSize="8"
        fill="rgba(138,130,118,0.8)"
      >
        VOLATILITY →
      </text>

      {points.map((p) => (
        <g key={p.t}>
          <circle cx={cx(p.v)} cy={cy(p.r)} r="6" fill={colors[p.cat]} opacity="0.8" />
          <circle cx={cx(p.v)} cy={cy(p.r)} r="3" fill={colors[p.cat]} />
        </g>
      ))}
    </svg>
  );
}

export const visualMap = {
  energy: EnergyVisual,
  defense: DefenseVisual,
  investment: InvestmentVisual,
};
