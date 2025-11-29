import { SAMPLE_WIDTH, SAMPLE_HEIGHT } from '../constants';
import { ParticleData } from '../types';

export const loadAndProcessImage = (url: string): Promise<ParticleData> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    const handleSuccess = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("No context");

        const ratio = img.width / img.height;
        let drawWidth = SAMPLE_WIDTH;
        let drawHeight = SAMPLE_HEIGHT;
        
        if (ratio > 1) {
            drawHeight = SAMPLE_WIDTH / ratio;
        } else {
            drawWidth = SAMPLE_HEIGHT * ratio;
        }

        drawWidth = Math.floor(drawWidth);
        drawHeight = Math.floor(drawHeight);

        canvas.width = drawWidth;
        canvas.height = drawHeight;
        
        ctx.drawImage(img, 0, 0, drawWidth, drawHeight);
        
        const imgData = ctx.getImageData(0, 0, drawWidth, drawHeight);
        const data = imgData.data;
        
        processData(data, drawWidth, drawHeight, ratio, resolve);
      } catch (e) {
        console.warn("Canvas Access Error (CORS likely):", e);
        generateFallback(resolve);
      }
    };

    const handleError = () => {
       console.warn("Image Load Error:", url);
       generateFallback(resolve);
    };

    img.onload = handleSuccess;
    img.onerror = handleError;
    
    img.src = url;
  });
};

const processData = (data: Uint8ClampedArray, width: number, height: number, ratio: number, resolve: any) => {
    const count = width * height;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    const scaleFactor = 12 / Math.max(width, height); // Smaller footprint for denser, sharper particles

    for (let i = 0; i < count; i++) {
      const i4 = i * 4;
      const r = data[i4] / 255;
      const g = data[i4 + 1] / 255;
      const b = data[i4 + 2] / 255;

      const x = (i % width) - width / 2;
      const y = height / 2 - Math.floor(i / width); 

      positions[i * 3] = x * scaleFactor;
      positions[i * 3 + 1] = y * scaleFactor;
      positions[i * 3 + 2] = 0;

      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    resolve({
      positions,
      colors,
      width,
      height,
      ratio
    });
};

const generateFallback = (resolve: any) => {
    // Generate a colorful noise grid as fallback so screen isn't black
    const width = SAMPLE_WIDTH;
    const height = SAMPLE_HEIGHT;
    const count = width * height;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const scaleFactor = 12 / Math.max(width, height);

    for (let i = 0; i < count; i++) {
        const x = (i % width) - width / 2;
        const y = height / 2 - Math.floor(i / width); 

        positions[i * 3] = x * scaleFactor;
        positions[i * 3 + 1] = y * scaleFactor;
        positions[i * 3 + 2] = 0;

        // Procedural color: Sine wave gradient
        colors[i * 3] = 0.5 + 0.5 * Math.sin(x * 0.1);
        colors[i * 3 + 1] = 0.5 + 0.5 * Math.cos(y * 0.1);
        colors[i * 3 + 2] = 0.5 + 0.5 * Math.sin((x+y) * 0.1);
    }
    
    resolve({
        positions,
        colors,
        width,
        height,
        ratio: 1
    });
};
