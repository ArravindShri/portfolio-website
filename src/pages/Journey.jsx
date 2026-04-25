import SectionTag from '../components/SectionTag.jsx';

export default function Journey() {
  return (
    <section className="section placeholder">
      <div className="container">
        <SectionTag num="03" label="Journey" path="/ journey / log" />
        <h1>
          Aero → CS → <em>Data.</em>
        </h1>
        <p className="lede">
          The long version of the timeline: certifications, mock projects, the 23/40 → 35/40 → 38/40
          ladder, and the daily log of what shipped. Page wiring in progress.
        </p>
      </div>
    </section>
  );
}
