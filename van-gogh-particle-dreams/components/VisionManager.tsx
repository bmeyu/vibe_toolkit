import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { GestureType, HandData } from '../types';

interface VisionManagerProps {
  onHandUpdate: (data: HandData) => void;
}

const VisionManager: React.FC<VisionManagerProps> = ({ onHandUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>(0);
  
  // Keep the latest callback in a ref to avoid stale closures in the animation loop
  const onHandUpdateRef = useRef(onHandUpdate);

  useEffect(() => {
    onHandUpdateRef.current = onHandUpdate;
  }, [onHandUpdate]);

  useEffect(() => {
    const initVision = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        
        landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        
        startCamera();
      } catch (error) {
        console.error("Error initializing vision:", error);
        setLoading(false);
      }
    };

    initVision();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  const startCamera = async () => {
    if (!videoRef.current) return;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
        });
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener("loadeddata", predictWebcam);
        setLoading(false);
    } catch (err) {
        console.error("Camera access denied:", err);
        setLoading(false);
    }
  };

  const predictWebcam = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;

    if (!video || !canvas || !landmarker) return;

    if (video.videoWidth > 0 && video.videoHeight > 0) {
       // Perform detection
       const startTimeMs = performance.now();
       const results = landmarker.detectForVideo(video, startTimeMs);

       // Process Results
       let gesture = GestureType.NONE;
       let x = 0.5;
       let y = 0.5;

       if (results.landmarks.length > 0) {
         const landmarks = results.landmarks[0];
         
         // 1. Calculate Hand Center (approximate using Palm indices: 0, 5, 9, 13, 17)
         // Index 0 is wrist, 9 is middle finger mcp. Average gives a decent center.
         let centerX = 0;
         let centerY = 0;
         for (const idx of [0, 5, 9, 13, 17]) {
             centerX += landmarks[idx].x;
             centerY += landmarks[idx].y;
         }
         x = centerX / 5;
         y = centerY / 5;

         // Mirror X because we are mirroring the video for the user
         // MediaPipe coordinates are normalized [0,1]. 0 is left of the image source.
         // If we mirror the video visually, we should also mirror the coordinate for interaction mapping.
         x = 1 - x; 

         // 2. Simple Gesture Detection (Open vs Closed)
         // Calculate average distance of finger tips (4, 8, 12, 16, 20) from Wrist (0)
         const wrist = landmarks[0];
         const tips = [8, 12, 16, 20]; // Skip thumb for simple open/close logic
         
         let avgDist = 0;
         tips.forEach(idx => {
            const dx = landmarks[idx].x - wrist.x;
            const dy = landmarks[idx].y - wrist.y;
            avgDist += Math.sqrt(dx*dx + dy*dy);
         });
         avgDist /= tips.length;

         // Threshold: if tips are close to wrist -> Fist
         if (avgDist < 0.25) { 
            gesture = GestureType.CLOSED_FIST;
         } else {
            gesture = GestureType.OPEN_PALM;
         }
       }

       // Call the latest handler
       if (onHandUpdateRef.current) {
         onHandUpdateRef.current({ gesture, x, y });
       }

       // Optional: Debug drawing
       const ctx = canvas.getContext('2d');
       if (ctx) {
         ctx.clearRect(0, 0, canvas.width, canvas.height);
         canvas.width = video.videoWidth;
         canvas.height = video.videoHeight;
         const drawingUtils = new DrawingUtils(ctx);
         if (results.landmarks) {
            for (const landmarks of results.landmarks) {
              drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS);
              drawingUtils.drawLandmarks(landmarks, { color: gesture === GestureType.CLOSED_FIST ? "#FF0000" : "#FFFFFF", radius: 3 });
            }
         }
       }
    }
    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  return (
    <div className="absolute top-4 right-4 w-48 h-36 bg-black/50 border border-white/20 rounded-lg overflow-hidden z-50 shadow-lg backdrop-blur-sm">
      {loading && <div className="absolute inset-0 flex items-center justify-center text-xs text-white">Loading Vision...</div>}
      {/* Mirror both video and canvas for natural interaction */}
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-50 -scale-x-100 transform" autoPlay playsInline muted />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover -scale-x-100 transform" /> 
      <div className="absolute bottom-1 left-2 text-[10px] text-white/80 font-mono">
        Hand Tracking Active
      </div>
    </div>
  );
};

export default VisionManager;