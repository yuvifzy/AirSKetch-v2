import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MapCanvas from './components/MapCanvas';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ControlPanel from './components/ControlPanel';
import LandingPage from './components/LandingPage';
import { useAirSketchStore } from './store/useAirSketchStore';
import { warmupModel } from './lib/aiModel';

function SimulatorApp() {
  const { mode, simulation, tickSimulation } = useAirSketchStore();

  useEffect(() => {
    // Warm up the TensorFlow.js model on mount so first inference is fast
    warmupModel().catch(console.warn);
  }, []);

  useEffect(() => {
    if (mode !== 'SIMULATE' || !simulation.isPlaying) {
      return;
    }

    let animationFrameId = 0;
    let lastFrame = performance.now();

    const step = (timestamp: number) => {
      const delta = (timestamp - lastFrame) / 1000;
      lastFrame = timestamp;
      tickSimulation(delta);
      animationFrameId = window.requestAnimationFrame(step);
    };

    animationFrameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [mode, simulation.isPlaying, tickSimulation]);

  return (
    <div className="relative w-screen h-screen overflow-hidden font-brutal text-black select-none bg-brutal-bg">
      <MapCanvas />

      {/* HUD UI Layer */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {/* Child elements must have pointer-events-auto if they are interactive */}
        <div className="pointer-events-auto w-full h-full">
          <TopBar />
          <Sidebar />
          <ControlPanel />
        </div>
      </div>

      {/* Vignette removed for brutalist design */}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<SimulatorApp />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}
