// Projects index data: 3 hero (live) + 4 mocks.
// `to` on hero projects routes to the deep-dive pages already wired in App.jsx.

export const heroProjects = [
  {
    id: '01',
    domain: 'Energy · Geopolitics · Investment',
    title: 'Energy Security Intelligence',
    desc: 'Why does an Indian investor care about the price of Brent crude? A cloud-native pipeline that ties global energy production, pricing, and equities to crisis events — so you can see who wins, who pays, and by how much.',
    tech: [
      'Microsoft Fabric',
      'dbt',
      'GitHub Actions',
      'Power BI',
      'Python',
      'EIA',
      'Twelve Data',
      'World Bank',
    ],
    stat1: { k: 'Live APIs', v: '3' },
    stat2: { k: 'Countries × Tickers', v: '8 × 22' },
    visualLabel: 'Self-sufficiency · 8 countries',
    visualStat: 'Producers ◆ Consumers',
    visual: 'energy',
    stackNote: '3 APIs · 19 tables · 6 pages',
    to: '/projects/energy-security',
    migrated: false,
  },
  {
    id: '02',
    domain: 'Defense · Geopolitics',
    title: 'Global Defense & Conflict Intelligence',
    desc: 'Rafale jets, trade flows, and the math behind "strategic partnership." Five data sources stitched into a single view — who sells, who buys, and what happens to conflict intensity when the money moves.',
    tech: ['SQL Server', 'Python', 'Tableau', 'ACLED', 'SIPRI ×3', 'World Bank'],
    stat1: { k: 'Data sources', v: '5' },
    stat2: { k: 'Tables × metrics', v: '23 × 8' },
    visualLabel: 'Arms trade · flow map',
    visualStat: '3 exporters → 4 importers',
    visual: 'defense',
    stackNote: '5 sources · 23 tables · trade flows',
    to: '/projects/defense-intelligence',
    migrated: false,
  },
  {
    id: '03',
    domain: 'Finance · Cross-Market',
    title: 'Global Investment Portfolio Analytics',
    desc: "The rupee doesn't just sit there — it writes returns. Currency-adjusted performance for a 12-stock cross-market portfolio, originally on SQL Server, migrated to Fabric in 4.5 hours to prove the cloud stack.",
    tech: ['Microsoft Fabric', 'dbt', 'GitHub Actions', 'Power BI', 'Twelve Data'],
    stat1: { k: 'Stocks × Currencies', v: '12 × 5' },
    stat2: { k: 'Tables', v: '15' },
    visualLabel: 'Return vs volatility · 12 tickers',
    visualStat: '4 categories · Sharpe-weighted',
    visual: 'investment',
    stackNote: 'Migrated · SQL Server → Fabric',
    to: '/projects/investment-portfolio',
    migrated: true,
  },
];

export const mockProjects = [
  {
    num: '01',
    title: 'NYC Taxi Fleet Analytics',
    desc: 'Trip patterns, surge pricing, and driver utilization across 1.5M yellow-cab trips.',
    tools: 'SQL · Power BI',
    href: 'https://github.com/ArravindShri/Portfolio-Mp2-',
  },
  {
    num: '02',
    title: 'E-Learning Platform Analytics',
    desc: 'Course funnel, completion cohorts, and instructor ROI for an online learning platform.',
    tools: 'SQL · Tableau',
    href: 'https://github.com/ArravindShri/Portfolio-Mp3',
  },
  {
    num: '03',
    title: 'Lead Conversion Analysis',
    desc: 'B2B pipeline hygiene — stage drop-off, rep performance, source attribution.',
    tools: 'SQL · Looker Studio',
    href: 'https://github.com/ArravindShri/Portfolio-Mp3',
  },
  {
    num: '04',
    title: 'Sales Performance Dashboard',
    desc: 'Territory rollups, quota attainment, and weekly forecast variance.',
    tools: 'Power BI · DAX',
    href: 'https://github.com/ArravindShri/Portfolio-Mp5',
  },
];

export const domains = ['All', 'Energy', 'Defense', 'Finance', 'Cloud'];
