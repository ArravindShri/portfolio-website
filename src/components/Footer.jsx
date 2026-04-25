import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer" data-screen-label="Footer">
      <div className="container">
        <div className="foot-grid">
          <div className="foot-brand">
            <h3>
              Let&apos;s build something that <em>changes a decision.</em>
            </h3>
            <p>Open to Data / BI Analyst roles. Remote-friendly. Based in Chennai, IN.</p>
          </div>
          <div className="foot-col">
            <div className="k">Sitemap</div>
            <ul>
              <li>
                <Link to="/">
                  <span className="idx">01</span> Home
                </Link>
              </li>
              <li>
                <Link to="/projects">
                  <span className="idx">02</span> Projects
                </Link>
              </li>
              <li>
                <Link to="/journey">
                  <span className="idx">03</span> Journey
                </Link>
              </li>
              <li>
                <Link to="/contact">
                  <span className="idx">04</span> Contact
                </Link>
              </li>
            </ul>
          </div>
          <div className="foot-col">
            <div className="k">Elsewhere</div>
            <ul>
              <li>
                <a
                  href="https://www.linkedin.com/in/shri-arravindhar-a340a23b1/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ↗ LinkedIn
                </a>
              </li>
              <li>
                <a href="https://github.com/ArravindShri" target="_blank" rel="noopener noreferrer">
                  ↗ GitHub
                </a>
              </li>
            </ul>
          </div>
          <div className="foot-col">
            <div className="k">Contact</div>
            <ul>
              <li>
                <a href="mailto:shri@arravindportfolio.tech">→ shri@arravindportfolio.tech</a>
              </li>
              <li>
                <a href="#">→ Resume (PDF)</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="foot-status">
          <div className="row">
            <span>© 2026 SHRI ARRAVINDHAR</span>
            <span className="accent">◆ CLAUDE DESIGN</span>
          </div>
          <div className="row">
            <span className="good">● ALL PIPELINES OK</span>
            <span>LAST DEPLOY · 02:14 UTC · apr 25</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
