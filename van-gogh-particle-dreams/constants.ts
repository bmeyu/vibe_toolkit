import { Painting } from './types';

// Smaller particles for sharper images when sampling more pixels
export const PARTICLE_SIZE = 0.08;
// Higher sampling grid for better detail (approx 1.6M particles)
export const SAMPLE_WIDTH = 1000;
export const SAMPLE_HEIGHT = 1600;

export const PAINTINGS: Painting[] = [
  {
    id: 'hero',
    title: '智简 AI 简历构建器',
    url: '/public2/截屏2025-12-03 13.01.51.png'
  },
  {
    id: 'features',
    title: '产品功能',
    url: '/public2/截屏2025-12-03 12.12.45.png'
  }
];
