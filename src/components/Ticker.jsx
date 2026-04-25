const items = [
  { sym: 'BRENT', val: '82.14', chg: '+1.8%', dir: 'up' },
  { sym: 'HENRY.HUB', val: '2.91', chg: '-0.6%', dir: 'dn' },
  { sym: 'XOM', val: '118.42', chg: '+2.1%', dir: 'up' },
  { sym: 'URA', val: '31.08', chg: '+3.4%', dir: 'up' },
  { sym: 'MP', val: '19.76', chg: '-1.2%', dir: 'dn' },
  { sym: 'USD/INR', val: '83.42', chg: '+0.3%', dir: 'up' },
  { sym: 'EUR/INR', val: '89.11', chg: '-0.1%', dir: 'dn' },
  { sym: 'ACLED.EVT', val: '14,208', chg: '+182', dir: 'up' },
  { sym: 'SIPRI.TIV', val: '6.2B', chg: '+4.4%', dir: 'up' },
  { sym: 'COAL.AU', val: '137.50', chg: '-2.0%', dir: 'dn' },
  { sym: 'NIFTY.50', val: '22,108', chg: '+0.8%', dir: 'up' },
  { sym: 'GBP/INR', val: '104.20', chg: '+0.2%', dir: 'up' },
];

export default function Ticker() {
  const track = [...items, ...items];

  return (
    <div className="ticker" role="marquee" aria-label="Live market and data feed">
      <div className="ticker-label">◆ LIVE&nbsp;FEED</div>
      <div className="ticker-track">
        {track.map((it, i) => (
          <div className="ticker-item" key={i}>
            <span className="sym">{it.sym}</span>
            <span>{it.val}</span>
            <span className={`chg ${it.dir}`}>{it.chg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
