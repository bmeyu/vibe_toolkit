export enum GestureType {
  NONE = 'NONE',
  OPEN_PALM = 'OPEN_PALM',
  CLOSED_FIST = 'CLOSED_FIST'
}

export interface ParticleData {
  positions: Float32Array;
  colors: Float32Array;
  width: number;
  height: number;
  ratio: number;
}

export interface HandData {
  gesture: GestureType;
  x: number; // Normalized 0-1
  y: number; // Normalized 0-1
}

export type Painting = {
  id: string;
  title: string;
  url: string;
};