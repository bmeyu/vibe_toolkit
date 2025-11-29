import { Painting } from './types';

// Smaller particles for sharper images when sampling more pixels
export const PARTICLE_SIZE = 0.2;
// Higher sampling grid for better detail (approx 640k particles)
export const SAMPLE_WIDTH = 600; 
export const SAMPLE_HEIGHT = 800;

export const PAINTINGS: Painting[] = [
  {
    id: 'starry-night',
    title: 'The Starry Night',
    url: '/starry-night.jpg'
  },
  {
    id: 'sunflowers',
    title: 'Sunflowers',
    url: '/sunflowers.jpg'
  },
  {
    id: 'wheatfield',
    title: 'Wheatfield with Crows',
    url: '/wheatfield.jpg'
  },
  {
    id: 'rhone',
    title: 'Starry Night Over the Rhone',
    url: '/rhone.jpg'
  }
];
