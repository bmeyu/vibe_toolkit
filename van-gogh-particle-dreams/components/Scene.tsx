import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticleData, HandData, GestureType } from '../types';
import { PARTICLE_SIZE } from '../constants';

interface SceneProps {
  currentPaintingData: ParticleData | null;
  handData: HandData;
  isTransitioning: boolean;
}

const Particles: React.FC<SceneProps> = ({ currentPaintingData, handData, isTransitioning }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const { viewport } = useThree();
  
  // Physics State
  const particlesState = useRef<{
    positions: Float32Array;
    velocities: Float32Array;
    targetPositions: Float32Array;
    targetColors: Float32Array;
    currentColors: Float32Array;
  }>({
    positions: new Float32Array(0),
    velocities: new Float32Array(0),
    targetPositions: new Float32Array(0),
    targetColors: new Float32Array(0),
    currentColors: new Float32Array(0),
  });

  // Initialize buffers when painting data changes
  useEffect(() => {
    if (!currentPaintingData || !pointsRef.current) return;

    const newCount = currentPaintingData.positions.length / 3;
    const geometry = pointsRef.current.geometry;

    // Check if we need to resize buffers
    const currentCount = particlesState.current.positions.length / 3;
    const needsRealloc = currentCount !== newCount;

    if (needsRealloc) {
      const oldPositions = particlesState.current.positions;
      const oldVelocities = particlesState.current.velocities;
      const oldColors = particlesState.current.currentColors;

      // Allocate new buffers
      const newPositions = new Float32Array(currentPaintingData.positions.length);
      const newVelocities = new Float32Array(newCount * 3);
      const newCurrentColors = new Float32Array(currentPaintingData.colors.length);

      // Copy existing state to new buffers to prevent visual teleportation
      for (let i = 0; i < newCount * 3; i++) {
        if (i < oldPositions.length) {
          newPositions[i] = oldPositions[i];
          newVelocities[i] = oldVelocities[i];
          newCurrentColors[i] = oldColors[i];
        } else {
          // Initialize new particles
          newPositions[i] = (Math.random() - 0.5) * 10; 
          newVelocities[i] = 0;
          newCurrentColors[i] = currentPaintingData.colors[i]; 
        }
      }

      particlesState.current.positions = newPositions;
      particlesState.current.velocities = newVelocities;
      particlesState.current.currentColors = newCurrentColors;
      
      // Update Geometry Attributes
      if (geometry) {
        geometry.setAttribute('position', new THREE.BufferAttribute(particlesState.current.positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(particlesState.current.currentColors, 3));
      }
    }

    // Always update targets to the NEW painting data
    particlesState.current.targetPositions = currentPaintingData.positions;
    particlesState.current.targetColors = currentPaintingData.colors;

  }, [currentPaintingData]);

  useFrame((state) => {
    if (!pointsRef.current || !currentPaintingData) return;

    const { positions, velocities, targetPositions, targetColors, currentColors } = particlesState.current;
    
    // Safety check: ensure arrays are initialized
    if (positions.length === 0) return;

    const geometry = pointsRef.current.geometry;
    const positionAttr = geometry.attributes.position as THREE.BufferAttribute;
    const colorAttr = geometry.attributes.color as THREE.BufferAttribute;

    const count = positions.length / 3;
    const time = state.clock.getElapsedTime();

    // Hand Position to World Space
    const handX = (handData.x - 0.5) * viewport.width;
    const handY = -(handData.y - 0.5) * viewport.height;
    const handZ = 0; 

    const isOpen = handData.gesture === GestureType.OPEN_PALM;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      let px = positions[i3];
      let py = positions[i3 + 1];
      let pz = positions[i3 + 2];

      let tx = targetPositions[i3];
      let ty = targetPositions[i3 + 1];
      let tz = targetPositions[i3 + 2];

      let vx = velocities[i3];
      let vy = velocities[i3 + 1];
      let vz = velocities[i3 + 2];

      if (isOpen && !isTransitioning) {
        // === MODE A: GALAXY FLOW ===
        const dx = handX - px;
        const dy = handY - py;
        const dz = handZ - pz;
        const distSq = dx*dx + dy*dy + dz*dz;
        const dist = Math.sqrt(distSq);

        const force = Math.max(0.5, 5.0 / (dist + 0.1)); 
        
        vx += dx * 0.005 * force;
        vy += dy * 0.005 * force;
        vz += dz * 0.005 * force;

        const noiseScale = 2.0;
        vx += Math.sin(py * noiseScale + time) * 0.02;
        vy += Math.cos(px * noiseScale + time) * 0.02;
        vz += Math.sin(px * py * 0.1 + time) * 0.02;

        vx *= 0.92;
        vy *= 0.92;
        vz *= 0.92;

        px += vx;
        py += vy;
        pz += vz;

      } else {
        // === MODE B: RETURN TO FORM ===
        const k = 0.08; 
        const damp = 0.85;

        const ax = (tx - px) * k;
        const ay = (ty - py) * k;
        const az = (tz - pz) * k;

        vx += ax;
        vy += ay;
        vz += az;

        vx *= damp;
        vy *= damp;
        vz *= damp;

        px += vx;
        py += vy;
        pz += vz;

        // Color Interpolation
        const rT = targetColors[i3];
        const gT = targetColors[i3 + 1];
        const bT = targetColors[i3 + 2];

        currentColors[i3] += (rT - currentColors[i3]) * 0.1;
        currentColors[i3+1] += (gT - currentColors[i3+1]) * 0.1;
        currentColors[i3+2] += (bT - currentColors[i3+2]) * 0.1;
      }

      positions[i3] = px;
      positions[i3 + 1] = py;
      positions[i3 + 2] = pz;

      velocities[i3] = vx;
      velocities[i3 + 1] = vy;
      velocities[i3 + 2] = vz;
    }

    if (positionAttr) positionAttr.needsUpdate = true;
    if (colorAttr) colorAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry />
      <pointsMaterial 
        size={PARTICLE_SIZE} 
        vertexColors 
        sizeAttenuation 
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  );
};

export default Particles;