import { useMemo, useState } from 'react';
import SectionTag from '../components/SectionTag.jsx';
import ProjectCard from '../components/projects/ProjectCard.jsx';
import MockCard from '../components/projects/MockCard.jsx';
import { heroProjects, mockProjects, domains } from '../data/projects.js';

export default function Projects() {
  const [filter, setFilter] = useState('All');

  const filtered = useMemo(() => {
    return heroProjects.filter((p) => {
      if (filter === 'All') return true;
      if (filter === 'Cloud') return p.tech.join(' ').toLowerCase().includes('fabric');
      return p.domain.toLowerCase().includes(filter.toLowerCase());
    });
  }, [filter]);

  return (
    <>
      <section className="projects-hero section" data-screen-label="Projects Hero">
        <div className="container">
          <SectionTag num="00" label="Projects · Index" path="/ projects / all.json" />

          <h1>
            Three pipelines, <em>one thesis:</em> data should change a decision.
          </h1>
          <p className="lede">
            Each card below is a <em>real, running system</em> — not a screenshot. Live APIs,
            scheduled ingests, a Fabric warehouse, and dashboards that refresh while you read this.
            The earlier mock projects sit below; they taught me the tools, these three taught me
            the craft.
          </p>

          <div className="filter-row">
            <span className="label">Filter</span>
            {domains.map((d) => (
              <button
                key={d}
                className={`chip ${filter === d ? 'on' : ''}`}
                onClick={() => setFilter(d)}
              >
                {d}
              </button>
            ))}
            <span className="count">
              showing <span className="n">{filtered.length}</span> / {heroProjects.length}
            </span>
          </div>

          <div className="cards">
            {filtered.map((p) => (
              <ProjectCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      </section>

      <section className="earlier section" data-screen-label="Earlier Work">
        <div className="container">
          <SectionTag num="01" label="Earlier work" path="/ projects / archive.json" />

          <div className="earlier-head">
            <h2>
              Mock projects — <em>where I learned the tools.</em>
            </h2>
            <div className="note">
              Completed Mar 2026 · GitHub only · no deep-dives. Kept here for context on the ramp.
            </div>
          </div>

          <div className="mocks">
            {mockProjects.map((m) => (
              <MockCard key={m.num} m={m} />
            ))}
          </div>
          <div className="mocks-legend">
            <span>4 of 4 complete · pre-real-project baseline</span>
            <span className="accent">◆ where the tools were learned</span>
          </div>
        </div>
      </section>
    </>
  );
}
