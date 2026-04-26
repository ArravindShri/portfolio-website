import Hero from '../components/home/Hero.jsx';
import About from '../components/home/About.jsx';
import Stack from '../components/home/Stack.jsx';
import SEO from '../components/SEO.jsx';

export default function Home() {
  return (
    <>
      <SEO
        title="Home"
        description="Data & BI portfolio by Shri Arravindhar. Three real-world projects: Energy Security Intelligence, Global Defense Analytics, and Investment Portfolio — built with Fabric, dbt, Python, React, and Power BI."
        path="/"
      />
      <Hero bgVariant="chart" />
      <About />
      <Stack />
    </>
  );
}
