import React from 'react';
import { RainyCanvas } from './components/RainyCanvas';

const App: React.FC = () => {
  return (
    <div className="relative w-screen h-screen bg-neutral-900 flex items-center justify-center overflow-hidden">
      
      {/* Main Canvas Container */}
      <div className="absolute inset-0 w-full h-full z-10">
        <RainyCanvas />
      </div>

      {/* UI Overlay */}
      <div className="absolute top-6 left-6 z-20 pointer-events-none opacity-50 mix-blend-difference text-white">
        <h1 className="text-xl font-serif tracking-widest">马孔多在下雨</h1>
        <p className="text-xs font-light opacity-70 mt-1">Macondo Rain · 百年孤独</p>
      </div>

      <div className="absolute bottom-6 right-6 z-20 pointer-events-none text-white/20 text-xs font-mono">
        p5.js + GLSL
      </div>
    </div>
  );
};

export default App;