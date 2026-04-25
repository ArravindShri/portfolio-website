import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { navItems } from '../config/theme.js';

export default function Topbar() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = String(time.getUTCHours()).padStart(2, '0');
  const mm = String(time.getUTCMinutes()).padStart(2, '0');
  const ss = String(time.getUTCSeconds()).padStart(2, '0');

  return (
    <header className="topbar">
      <div className="container">
        <div className="topbar-row">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true"></div>
            <div>
              <div className="brand-name">SHRI.ARRAVINDHAR</div>
            </div>
            <div className="brand-sub">/ PORTFOLIO · v2.6</div>
          </div>
          <nav className="nav">
            {navItems.map((it) => (
              <NavLink
                key={it.n}
                to={it.href}
                end={it.href === '/'}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                <span className="idx">{it.n}</span>
                <span>{it.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="top-meta">
            <span>
              <span
                className="dot-live"
                style={{ display: 'inline-block', marginRight: 6, verticalAlign: 'middle' }}
              />
              FABRIC · LIVE
            </span>
            <span>
              {hh}:{mm}:{ss} UTC
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
