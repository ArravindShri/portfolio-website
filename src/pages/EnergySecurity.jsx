import SectionTag from '../components/SectionTag.jsx';

export default function EnergySecurity() {
  return (
    <section className="section placeholder">
      <div className="container">
        <SectionTag num="02.1" label="Project" path="/ projects / energy-security" />
        <h1>
          Energy <em>Security</em>
        </h1>
        <p className="lede">
          EIA + Twelve Data feeds, normalized into a Fabric warehouse, surfaced through a Power BI
          model that watches Brent, Henry Hub, coal benchmarks, and uranium spot. Detail page wiring
          in progress.
        </p>
      </div>
    </section>
  );
}
