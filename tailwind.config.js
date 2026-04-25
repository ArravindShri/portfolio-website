/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0F0E0C',
        'bg-1': '#141310',
        'bg-2': '#1A1816',
        'bg-3': '#221F1C',
        rule: '#2A2622',
        'rule-2': '#3A342E',
        ink: '#F2EDE4',
        'ink-2': '#C9C1B3',
        'ink-3': '#8A8276',
        'ink-4': '#5A5348',
        accent: '#DA7756',
        'accent-dim': '#8A4A34',
        good: '#9DB17C',
        bad: '#C45C4A',
        warn: '#D9A441',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
