/* Defense iconography — minimal weapon / surveillance / cartography glyphs.
   Single-color SVGs that inherit currentColor.
   Ported from claude.ai/design Defense Intelligence package. */

const _g = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  style: { display: 'block', flex: '0 0 auto' },
};

export const G_Crosshair = () => (
  <svg {..._g}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4" />
    <path d="M12 1v5M12 18v5M1 12h5M18 12h5" />
    <circle cx="12" cy="12" r="0.8" fill="currentColor" />
  </svg>
);

export const G_Jet = () => (
  <svg {..._g} strokeLinejoin="round">
    <path d="M12 2l1.6 9.4 7.4 3v1.6l-7.4-1.2L13 20l2 1v1.4l-3-0.8-3 0.8V21l2-1 0.4-5.2-7.4 1.2v-1.6l7.4-3z" />
  </svg>
);

export const G_Tank = () => (
  <svg {..._g} strokeLinejoin="round">
    <rect x="2" y="13" width="20" height="5" rx="0.5" />
    <rect x="6" y="9" width="11" height="4" rx="0.5" />
    <path d="M17 11h5" />
    <circle cx="6" cy="20" r="1.4" fill="currentColor" />
    <circle cx="11" cy="20" r="1.4" fill="currentColor" />
    <circle cx="16" cy="20" r="1.4" fill="currentColor" />
  </svg>
);

export const G_Frigate = () => (
  <svg {..._g} strokeLinejoin="round">
    <path d="M2 16h20l-2 4H4z" />
    <path d="M5 16V10h14v6" />
    <path d="M12 10V3" />
    <path d="M9 6h6l-2 2h-2z" fill="currentColor" />
    <path d="M14 13h2" />
  </svg>
);

export const G_Satellite = () => (
  <svg {..._g} strokeLinejoin="round">
    <rect x="9" y="9" width="6" height="6" rx="0.5" transform="rotate(45 12 12)" />
    <path d="M5 5l4 4M19 19l-4-4" />
    <path d="M3 7l3-3M21 17l-3 3M7 21a4 4 0 0 1-4-4M21 7a4 4 0 0 0-4-4" />
    <circle cx="12" cy="12" r="0.8" fill="currentColor" />
  </svg>
);

export const G_Globe = () => (
  <svg {..._g}>
    <circle cx="12" cy="12" r="9" />
    <ellipse cx="12" cy="12" rx="9" ry="4" />
    <path d="M12 3c-3 4-3 14 0 18M12 3c3 4 3 14 0 18" />
  </svg>
);

export const G_Radar = () => (
  <svg {..._g}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5.5" />
    <circle cx="12" cy="12" r="2" />
    <path d="M12 12L21 6" strokeWidth="1.6" />
    <circle cx="12" cy="12" r="0.8" fill="currentColor" />
  </svg>
);

export const G_Missile = () => (
  <svg {..._g} strokeLinejoin="round">
    <path d="M3 14l4-1 9-9c2-2 4-2 5-1s1 3-1 5l-9 9-1 4-3-1-4-3z" />
    <path d="M7 13l4 4" />
    <circle cx="16" cy="8" r="1" fill="currentColor" />
  </svg>
);
