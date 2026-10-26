import { MotionConfig } from 'motion/react';
import { Footer, GetStarted, Stats } from './site/Closing';
import { ControlsProvider } from './site/controls';
import { Gallery } from './site/Gallery';
import { Hero } from './site/Hero';
import { Nav } from './site/Nav';
import { Sandbox } from './site/Sandbox';
import { ThresholdLab } from './site/ThresholdLab';

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ControlsProvider>
        <Nav />
        <main className="overflow-x-clip">
          <Hero />
          <Gallery />
          <ThresholdLab />
          <Sandbox />
          <Stats />
          <GetStarted />
        </main>
        <Footer />
      </ControlsProvider>
    </MotionConfig>
  );
}
