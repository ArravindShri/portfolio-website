import SectionTag from '../components/SectionTag.jsx';

export default function Contact() {
  return (
    <section className="section placeholder">
      <div className="container">
        <SectionTag num="04" label="Contact" path="/ contact / channels" />
        <h1>
          Open to roles. <em>Let&apos;s talk.</em>
        </h1>
        <p className="lede">
          Fastest signal:{' '}
          <a style={{ color: 'var(--accent)' }} href="mailto:shri@arravindportfolio.tech">
            shri@arravindportfolio.tech
          </a>
          . Or LinkedIn / GitHub via the footer. Form &amp; calendar embed wiring in progress.
        </p>
      </div>
    </section>
  );
}
