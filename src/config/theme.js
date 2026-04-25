// Single source of truth for the terminal aesthetic — terracotta + near-black.
// Mirrors src/styles/tokens.css and tailwind.config.js so JS-side code
// (charts, canvases) can read tokens without parsing CSS.

export const colors = {
  bg: '#0F0E0C',
  bg1: '#141310',
  bg2: '#1A1816',
  bg3: '#221F1C',
  rule: '#2A2622',
  rule2: '#3A342E',
  ink: '#F2EDE4',
  ink2: '#C9C1B3',
  ink3: '#8A8276',
  ink4: '#5A5348',
  accent: '#DA7756',
  accentDim: '#8A4A34',
  accentGlow: 'rgba(218, 119, 86, 0.18)',
  good: '#9DB17C',
  bad: '#C45C4A',
  warn: '#D9A441',
};

export const fonts = {
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  sans: 'Inter, ui-sans-serif, system-ui, sans-serif',
  serif: '"Instrument Serif", ui-serif, Georgia, serif',
};

export const navItems = [
  { n: '01', label: 'Home', key: 'home', href: '/' },
  { n: '02', label: 'Projects', key: 'projects', href: '/projects' },
  { n: '03', label: 'Journey', key: 'journey', href: '/journey' },
  { n: '04', label: 'Contact', key: 'contact', href: '/contact' },
];
