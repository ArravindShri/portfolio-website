import SectionTag from '../components/SectionTag.jsx';

export default function DefenseIntelligence() {
  return (
    <section className="section placeholder">
      <div className="container">
        <SectionTag num="02.2" label="Project" path="/ projects / defense-intelligence" />
        <h1>
          Defense <em>Intelligence</em>
        </h1>
        <p className="lede">
          ACLED conflict events crossed with SIPRI arms transfers. A medallion lakehouse, dbt
          models, and a Tableau story that tracks how transfers and incidents move together. Detail
          page wiring in progress.
        </p>
      </div>
    </section>
  );
}
