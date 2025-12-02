
import React, { useEffect, useRef } from 'react';
import p5 from 'p5';

export const RainyCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const sketch = (p: p5) => {
      const sourceText = "MACONDOWASRAINING";
      let charArray: string[] = [];
      let drops: RainDrop[] = [];
      const numDrops = 300;

      // Grid system
      const TEXT = "MACONDO WAS RAINING";
      const CHAR_WIDTH = 20;
      const CHAR_HEIGHT = 24;
      let grid: GridCell[][] = [];
      let ROWS = 0;

      // Butterflies
      let butterflies: Butterfly[] = [];

      // Phase management
      type Phase = 'raining' | 'transforming' | 'resetting';
      let phase: Phase = 'raining';

      // Theme colors
      const bgColor = p.color(20, 30, 50);
      const rainColor = p.color(180, 200, 220);
      const butterflyColor = p.color(255, 200, 80); // Gold

      // Interfaces
      interface GridCell {
        x: number;
        y: number;
        char: string;
        row: number;
        col: number;
        lit: boolean;
        brightness: number;
        glowPhase: number;
        jitterX: number;  // Random offset for natural look
        jitterY: number;
      }

      interface Butterfly {
        x: number;
        y: number;
        vx: number;
        vy: number;
        wingPhase: number;
        wingSpeed: number;
        size: number;
        alpha: number;
      }

      // Gaussian random number generator (Box-Muller transform)
      function gaussianRandom(mean: number, stdDev: number): number {
        const u1 = p.random();
        const u2 = p.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return mean + z * stdDev;
      }

      class RainDrop {
        x: number;
        y: number;
        z: number;
        speed: number;
        textSize: number;
        char: string;
        alpha: number;

        constructor(startRandomY = true) {
          // Use Gaussian distribution for x position (center-weighted)
          this.x = gaussianRandom(p.width / 2, p.width / 4);
          this.x = p.constrain(this.x, 0, p.width);

          this.y = startRandomY ? p.random(-p.height, p.height) : p.random(-500, -50);
          this.z = p.random(0.5, 2);

          // Add random speed variation
          const baseSpeed = p.map(this.z, 0.5, 2, 1, 3.5);
          this.speed = baseSpeed * p.random(0.7, 1.3);

          this.textSize = p.map(this.z, 0.5, 2, 10, 24); // Reduced from 12-28 to 10-24
          this.alpha = p.map(this.z, 0.5, 2, 120, 255);
          this.pickChar();
        }

        pickChar() {
          const randomIndex = Math.floor(p.random(charArray.length));
          this.char = charArray[randomIndex];
          if (p.random(1) > 0.85) {
            this.char = "";
          }
        }

        update() {
          this.y += this.speed;

          // Check for grid match in raining phase
          if (phase === 'raining' && this.char) {
            if (checkMatch(this)) {
              this.reset();
              return;
            }
          }

          // Reset when reaching bottom
          if (this.y > p.height + 50) {
            this.reset();
          }
        }

        reset() {
          this.y = p.random(-200, -50);
          // Use Gaussian distribution for reset position too
          this.x = gaussianRandom(p.width / 2, p.width / 4);
          this.x = p.constrain(this.x, 0, p.width);
          this.pickChar();
        }

        display() {
          // Draw tail
          const tailLength = p.map(this.z, 0.5, 2, 80, 180);
          p.stroke(rainColor.levels[0], rainColor.levels[1], rainColor.levels[2], this.alpha * 0.4);
          p.strokeWeight(p.map(this.z, 0.5, 2, 0.5, 1.5));
          p.line(this.x, this.y - tailLength, this.x, this.y);

          // Draw character
          p.noStroke();
          p.fill(rainColor.levels[0], rainColor.levels[1], rainColor.levels[2], this.alpha);
          p.textSize(this.textSize);
          p.textAlign(p.CENTER, p.BOTTOM);
          p.text(this.char, this.x, this.y);
        }
      }

      // Create grid
      function createGrid() {
        grid = [];
        ROWS = Math.floor((p.height * 2/3) / CHAR_HEIGHT);
        const startX = (p.width - TEXT.length * CHAR_WIDTH) / 2;

        for (let row = 0; row < ROWS; row++) {
          const rowCells: GridCell[] = [];
          const y = p.height - (row + 1) * CHAR_HEIGHT;

          for (let col = 0; col < TEXT.length; col++) {
            const x = startX + col * CHAR_WIDTH;
            rowCells.push({
              x, y,
              char: TEXT[col],
              row, col,
              lit: false,
              brightness: 0,
              glowPhase: p.random(p.TWO_PI),
              jitterX: p.random(-2, 2),  // Random horizontal offset
              jitterY: p.random(-1, 1)   // Random vertical offset
            });
          }
          grid.push(rowCells);
        }
      }

      // Check if drop matches grid cell
      function checkMatch(drop: RainDrop): boolean {
        if (!grid.length) return false;

        // Check if in grid area
        if (drop.y < p.height - ROWS * CHAR_HEIGHT) return false;

        // Find row
        const row = Math.floor((p.height - drop.y) / CHAR_HEIGHT);
        if (row < 0 || row >= ROWS) return false;

        // Find matching cell in row
        for (const cell of grid[row]) {
          if (!cell.lit && cell.char === drop.char) {
            // Check if we can light this cell (bottom row or row below is lit)
            if (row === 0) {
              // Bottom row - always can light
              cell.lit = true;
              return true;
            } else {
              // Check if same column in row below is lit
              const cellBelow = grid[row - 1][cell.col];
              if (cellBelow.lit) {
                cell.lit = true;
                return true;
              }
            }
          }
        }
        return false;
      }

      // Draw grid
      function drawGrid() {
        p.textFont('Georgia');
        p.textAlign(p.CENTER, p.BOTTOM);

        // Soaked (stacked) text color - darker than falling rain
        const soakedColor = p.color(140, 160, 180);

        for (const row of grid) {
          for (const cell of row) {
            // Update brightness
            if (cell.lit && cell.brightness < 1) {
              cell.brightness = p.min(cell.brightness + 0.05, 1);
            }

            if (cell.brightness > 0) {
              // Glow effect
              cell.glowPhase += 0.02;
              const glow = p.sin(cell.glowPhase) * 0.15 + 0.85;

              // Reduced opacity for soaked/old text (40-60%)
              const alpha = cell.brightness * 150 * glow;

              p.noStroke();
              p.fill(soakedColor.levels[0], soakedColor.levels[1], soakedColor.levels[2], alpha);
              p.textSize(16); // Reduced from 18 to 16

              // Apply jitter offset for organic look
              p.text(cell.char, cell.x + cell.jitterX, cell.y + cell.jitterY);
            }
          }
        }
      }

      // Check if ready to transform
      function checkTransformReady(): boolean {
        if (!grid.length) return false;

        // Count total lit cells
        let totalCells = 0;
        let litCells = 0;

        for (const row of grid) {
          for (const cell of row) {
            totalCells++;
            if (cell.lit) litCells++;
          }
        }

        // Transform when 2/3 of grid is lit
        const threshold = totalCells * 0.67;
        return litCells >= threshold;
      }

      // Transform grid to butterflies
      function transformToButterflies() {
        butterflies = [];

        for (const row of grid) {
          for (const cell of row) {
            if (cell.lit) {
              const angle = p.random(p.TWO_PI);
              const speed = p.random(1, 3);

              butterflies.push({
                x: cell.x,
                y: cell.y,
                vx: p.cos(angle) * speed,
                vy: p.sin(angle) * speed - 1, // Bias upward
                wingPhase: p.random(p.TWO_PI),
                wingSpeed: p.random(0.1, 0.2),
                size: p.random(12, 20),
                alpha: 255
              });
            }
          }
        }

        // Reset grid
        for (const row of grid) {
          for (const cell of row) {
            cell.lit = false;
            cell.brightness = 0;
          }
        }
      }

      // Update butterflies
      function updateButterflies() {
        for (let i = butterflies.length - 1; i >= 0; i--) {
          const b = butterflies[i];

          // Update position
          b.x += b.vx;
          b.y += b.vy;
          b.wingPhase += b.wingSpeed;

          // Fade out
          b.alpha -= 1;

          // Remove if faded
          if (b.alpha <= 0 || b.y < -50 || b.x < -50 || b.x > p.width + 50) {
            butterflies.splice(i, 1);
          }
        }
      }

      // Draw butterfly
      function drawButterfly(b: Butterfly) {
        const wingAngle = p.sin(b.wingPhase) * 0.8;

        p.push();
        p.translate(b.x, b.y);

        // Left wing
        p.push();
        p.rotate(-wingAngle);
        p.fill(butterflyColor.levels[0], butterflyColor.levels[1], butterflyColor.levels[2], b.alpha);
        p.noStroke();
        p.ellipse(-b.size * 0.3, 0, b.size, b.size * 0.6);
        p.pop();

        // Right wing
        p.push();
        p.rotate(wingAngle);
        p.fill(butterflyColor.levels[0], butterflyColor.levels[1], butterflyColor.levels[2], b.alpha);
        p.noStroke();
        p.ellipse(b.size * 0.3, 0, b.size, b.size * 0.6);
        p.pop();

        // Body
        p.fill(100, 80, 60, b.alpha);
        p.ellipse(0, 0, b.size * 0.15, b.size * 0.5);

        p.pop();
      }

      p.setup = () => {
        const canvas = p.createCanvas(
          containerRef.current!.clientWidth,
          containerRef.current!.clientHeight
        );
        canvas.parent(containerRef.current!);

        charArray = sourceText.split("");
        p.textFont('Georgia');

        // Initialize drops
        for (let i = 0; i < numDrops; i++) {
          drops.push(new RainDrop());
        }

        // Create grid
        createGrid();
      };

      p.draw = () => {
        p.background(bgColor);

        switch(phase) {
          case 'raining':
            // Draw grid
            drawGrid();

            // Update and display rain drops
            for (let drop of drops) {
              drop.update();
              drop.display();
            }

            // Check if ready to transform
            if (checkTransformReady()) {
              transformToButterflies();
              phase = 'transforming';
            }
            break;

          case 'transforming':
            // Update and draw butterflies
            updateButterflies();
            for (const b of butterflies) {
              drawButterfly(b);
            }

            // Fade out rain drops
            for (let drop of drops) {
              drop.update();
              drop.alpha = p.max(drop.alpha - 2, 0);
              if (drop.alpha > 0) {
                drop.display();
              }
            }

            // Check if all butterflies gone
            if (butterflies.length === 0) {
              phase = 'resetting';
            }
            break;

          case 'resetting':
            // Gradually restore rain drops
            let allRestored = true;
            for (let drop of drops) {
              drop.update();
              if (drop.alpha < p.map(drop.z, 0.5, 2, 120, 255)) {
                drop.alpha = p.min(drop.alpha + 3, p.map(drop.z, 0.5, 2, 120, 255));
                allRestored = false;
              }
              drop.display();
            }

            // When all drops restored, return to raining
            if (allRestored) {
              phase = 'raining';
            }
            break;
        }
      };

      p.windowResized = () => {
        if (containerRef.current) {
          p.resizeCanvas(
            containerRef.current.clientWidth,
            containerRef.current.clientHeight
          );
          createGrid(); // Recreate grid on resize
        }
      };
    };

    p5InstanceRef.current = new p5(sketch);

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-neutral-900"
    />
  );
};
