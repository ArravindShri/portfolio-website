import SectionTag from '../components/SectionTag.jsx';

export default function InvestmentPortfolio() {
  return (
    <section className="section placeholder">
      <div className="container">
        <SectionTag num="02.3" label="Project" path="/ projects / investment-portfolio" />
        <h1>
          Investment <em>Portfolio</em>
        </h1>
        <p className="lede">
          Macro signals from World Bank and IMF, joined to a personal portfolio on Twelve Data.
          Daily refresh, drift alerts, Looker Studio share. Detail page wiring in progress.
        </p>
      </div>
    </section>
  );
}
