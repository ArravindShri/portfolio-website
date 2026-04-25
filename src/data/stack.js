// Architecture diagram data: SOURCES → INGEST → STORAGE → TRANSFORM → VIZ

export const stackLayers = [
  {
    label: 'SOURCES',
    items: [
      { id: 'eia', name: 'EIA API', type: 'Energy', live: true },
      { id: 'twd', name: 'Twelve Data', type: 'Markets', live: true },
      { id: 'wb', name: 'World Bank', type: 'Macro' },
      { id: 'acled', name: 'ACLED', type: 'Conflict' },
      { id: 'sipri', name: 'SIPRI × 3', type: 'Arms' },
      { id: 'imf', name: 'IMF', type: 'Macro' },
    ],
  },
  {
    label: 'INGEST',
    items: [
      { id: 'gha', name: 'GitHub Actions', type: 'Scheduler', live: true },
      { id: 'py', name: 'Python · pyodbc', type: 'Loader' },
      { id: 'sp', name: 'Service Principal', type: 'AuthN' },
    ],
  },
  {
    label: 'STORAGE',
    items: [
      { id: 'fab.lh', name: 'Fabric Lakehouse', type: 'Bronze', live: true },
      { id: 'fab.wh', name: 'Fabric Warehouse', type: 'Silver · Gold', live: true },
      { id: 'sql', name: 'SQL Server (legacy)', type: 'Migrated' },
    ],
  },
  {
    label: 'TRANSFORM',
    items: [
      { id: 'dbt', name: 'dbt', type: 'Medallion' },
      { id: 'sql.t', name: 'SQL · DAX', type: 'Models' },
      { id: 'git', name: 'Git / GitHub', type: 'Version' },
    ],
  },
  {
    label: 'VIZ · DECIDE',
    items: [
      { id: 'pbi', name: 'Power BI', type: 'Dashboards', live: true },
      { id: 'tab', name: 'Tableau', type: 'Story' },
      { id: 'look', name: 'Looker Studio', type: 'Share' },
      { id: 'site', name: 'This portfolio', type: 'React + API', live: true },
    ],
  },
];

export const stackEdges = [
  ['eia', 'gha'],
  ['twd', 'gha'],
  ['wb', 'py'],
  ['acled', 'py'],
  ['sipri', 'py'],
  ['imf', 'py'],
  ['gha', 'fab.lh'],
  ['py', 'fab.wh'],
  ['sp', 'fab.wh'],
  ['fab.lh', 'dbt'],
  ['fab.wh', 'dbt'],
  ['sql', 'sql.t'],
  ['dbt', 'pbi'],
  ['dbt', 'site'],
  ['sql.t', 'tab'],
  ['git', 'look'],
  ['git', 'site'],
];
