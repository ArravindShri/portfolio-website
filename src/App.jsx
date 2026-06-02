import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Projects from './pages/Projects.jsx';
import EnergySecurity from './pages/EnergySecurity.jsx';
import DefenseIntelligence from './pages/DefenseIntelligence.jsx';
import InvestmentPortfolio from './pages/InvestmentPortfolio.jsx';
import Writing from './pages/Writing.jsx';
import Journey from './pages/Journey.jsx';
import Contact from './pages/Contact.jsx';
import CaseStudyFabricBigQuery from './pages/CaseStudyFabricBigQuery.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/energy-security" element={<EnergySecurity />} />
        <Route path="/projects/defense-intelligence" element={<DefenseIntelligence />} />
        <Route path="/projects/investment-portfolio" element={<InvestmentPortfolio />} />
        <Route path="/writing" element={<Writing />} />
        <Route path="/writing/fabric-bigquery" element={<CaseStudyFabricBigQuery />} />
        <Route path="/journey" element={<Journey />} />
        <Route path="/contact" element={<Contact />} />
      </Route>
    </Routes>
  );
}