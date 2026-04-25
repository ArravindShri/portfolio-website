import SectionTag from '../SectionTag.jsx';
import { timeline, certifications } from '../../data/about.js';

export default function About() {
  return (
    <section className="about section" id="about" data-screen-label="About">
      <div className="container">
        <SectionTag num="01" label="About" path="/ home / about.md" />

        <div className="about-head">
          <h2>
            Aero engineer, turned <em>customer listener,</em>
            <br />
            turned data analyst — by choice.
          </h2>
          <div className="body">
            <p>
              I took the scenic route into data. An engineering degree taught me to model systems;
              four years at <span className="k">ZOHO</span> taught me to listen to the humans using
              them. Now I&rsquo;m combining both: I build pipelines that don&rsquo;t just answer{' '}
              <em>what&nbsp;happened</em>, but let a product team ask <em>why</em>, and then
              actually do something about it.
            </p>
            <p>
              The through-line across every chapter: curiosity about the gap between the dashboard
              and the decision.
            </p>
          </div>
        </div>

        <div className="timeline">
          <div className="timeline-axis"></div>
          <div className="timeline-row">
            {timeline.map((s, i) => (
              <div key={i} className={`tl-stop ${s.active ? 'active' : ''}`}>
                <div className="period">{s.period}</div>
                <div className="where">{s.where}</div>
                <div className="role-line">{s.role}</div>
                <div className="detail">{s.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="about-meta">
          <div className="label">Certifications</div>
          <div className="certs">
            {certifications.map((c, i) => (
              <span key={i} className="cert">
                <span className="sq"></span>
                <span>{c.name}</span>
                <span className="prov">· {c.prov}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
