import Hero from '../components/home/Hero.jsx';
import About from '../components/home/About.jsx';
import Stack from '../components/home/Stack.jsx';

export default function Home() {
  return (
    <>
      <Hero bgVariant="chart" />
      <About />
      <Stack />
    </>
  );
}
