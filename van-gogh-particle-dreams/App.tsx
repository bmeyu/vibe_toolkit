import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import VisionManager from './components/VisionManager';
import Particles from './components/Scene';
import { loadAndProcessImage } from './utils/imageProcessing';
import { PAINTINGS } from './constants';
import { HandData, GestureType, ParticleData } from './types';

const App: React.FC = () => {
  // State
  const [activePaintingIndex, setActivePaintingIndex] = useState(0);
  const [paintingData, setPaintingData] = useState<ParticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [handData, setHandData] = useState<HandData>({ gesture: GestureType.NONE, x: 0.5, y: 0.5 });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [instruction, setInstruction] = useState("Loading Masterpieces...");

  // Refs for logic
  const prevGestureRef = useRef<GestureType>(GestureType.NONE);
  const loadedCacheRef = useRef<Map<number, ParticleData>>(new Map());

  // 1. Initial Load
  useEffect(() => {
    const init = async () => {
      try {
        setInstruction("Processing Pixels...");
        // Preload the first image immediately
        const data = await loadAndProcessImage(PAINTINGS[0].url);
        loadedCacheRef.current.set(0, data);
        setPaintingData(data);
        setLoading(false);
        setInstruction("Show your hand to interact");
        
        // Lazily preload the rest in background
        PAINTINGS.forEach(async (p, idx) => {
          if (idx === 0) return;
          try {
             const d = await loadAndProcessImage(p.url);
             loadedCacheRef.current.set(idx, d);
          } catch(e) { console.warn("Failed preload", e); }
        });
      } catch (err) {
        setInstruction("Error loading resources.");
        console.error(err);
      }
    };
    init();
  }, []);

  // 2. Gesture Logic Handler
  const handleHandUpdate = useCallback((data: HandData) => {
    setHandData(data);

    const prev = prevGestureRef.current;
    const current = data.gesture;

    // Detect Transition: Edge Trigger (Open -> Closed)
    // Means user grabbed the "cloud" and wants to form a new painting
    if (prev === GestureType.OPEN_PALM && current === GestureType.CLOSED_FIST) {
      triggerNewPainting();
    }
    
    // Update Instruction Text
    if (current === GestureType.NONE) {
        setInstruction("Raise your hand");
    } else if (current === GestureType.OPEN_PALM) {
        setInstruction("Move hand to swirl particles");
    } else if (current === GestureType.CLOSED_FIST) {
        setInstruction("Fist detected: Transforming...");
    }

    prevGestureRef.current = current;
  }, [activePaintingIndex]); // Add dependencies if needed, but triggerNewPainting uses functional update

  const triggerNewPainting = () => {
    setIsTransitioning(true);
    
    // Pick random new index
    let newIndex = Math.floor(Math.random() * PAINTINGS.length);
    if (newIndex === activePaintingIndex) {
        newIndex = (newIndex + 1) % PAINTINGS.length;
    }
    
    setActivePaintingIndex(newIndex); // State update for UI

    // Get Data
    const cached = loadedCacheRef.current.get(newIndex);
    if (cached) {
      setPaintingData(cached);
      // Short delay to allow physics to register the "spring back" force
      setTimeout(() => setIsTransitioning(false), 500); 
    } else {
      // Fallback if not loaded yet (rare given bg loading)
      loadAndProcessImage(PAINTINGS[newIndex].url).then(d => {
        loadedCacheRef.current.set(newIndex, d);
        setPaintingData(d);
        setTimeout(() => setIsTransitioning(false), 500);
      });
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans select-none">
      
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 25], fov: 45 }}>
          <color attach="background" args={['#000000']} />
          <ambientLight intensity={0.5} />
          {/* Particles Component handles the logic */}
          <Particles 
            currentPaintingData={paintingData} 
            handData={handData} 
            isTransitioning={isTransitioning} 
          />
          <OrbitControls enableZoom={false} enablePan={false} dampingFactor={0.05} />
        </Canvas>
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-8">
        
        {/* Header */}
        <div className="flex flex-col items-start space-y-2">
            <h1 className="text-4xl md:text-6xl font-['Lato'] font-light text-white drop-shadow-lg">
                viberx360.com
            </h1>
            <div className="flex items-center space-x-2">
                 <div className="h-px w-12 bg-white/20"></div>
                 <p className="text-gray-400 text-sm font-['Lato'] tracking-widest">
                    智简 AI 简历构建器 - 为每个机会量身定制
                 </p>
            </div>
        </div>

        {/* Current Painting Info */}
        <div className="absolute top-1/2 left-8 transform -translate-y-1/2 opacity-30 hover:opacity-100 transition-opacity duration-500 hidden md:block pointer-events-auto">
            <div className="border-l-2 border-white/20 pl-4">
                <p className="text-xs text-white/50 uppercase tracking-widest mb-1">Current Masterpiece</p>
                <h2 className="text-2xl font-bold text-white font-['Cinzel'] max-w-[200px] leading-tight">
                    {PAINTINGS[activePaintingIndex].title}
                </h2>
            </div>
        </div>

        {/* Footer / Instructions */}
        <div className="flex flex-col items-center justify-center w-full">
            <div className={`px-6 py-3 rounded-full backdrop-blur-md border border-white/10 transition-all duration-300 ${
                handData.gesture === GestureType.CLOSED_FIST
                ? 'bg-white/20 shadow-[0_0_30px_rgba(255,255,255,0.3)]'
                : 'bg-white/5'
            }`}>
                <p className="text-white text-sm md:text-base font-['Lato'] tracking-wide">
                    {loading ? "Initializing..." : instruction}
                </p>
            </div>
            
            <div className="mt-4 flex space-x-8 text-[10px] text-white/40 uppercase tracking-widest">
                <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                    <span>Open Hand: Swirl</span>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                    <span>Close Fist: Transform</span>
                </div>
            </div>
        </div>

      </div>

      {/* Vision Manager (The Webcam) */}
      <VisionManager onHandUpdate={handleHandUpdate} />
      
    </div>
  );
};

export default App;