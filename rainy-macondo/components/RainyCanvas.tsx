
import React, { useEffect, useRef } from 'react';
import p5 from 'p5';

export const RainyCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const sketch = (p: p5) => {
      const sourceText = "MACONDOWASRAINING";
      const TEXT = "MACONDO WAS RAINING";
      const WORDS = ["MACONDO", "WAS", "RAINING", "RAIN", "WATER", "TIME", "MEMORY"];
      let charArray: string[] = [];
      let drops: RainDrop[] = [];
      const numDrops = 300;

      // Natural stacking system
      let stackedChars: StackedChar[] = [];
      let heightMap: number[] = []; // Height at each x position
      const GRID_SIZE = 5; // Pixel grid for height tracking

      // Butterflies
      let butterflies: Butterfly[] = [];
      let butterflySpawnRate = 0;
      let butterflyTimer = 0;

      // Phase management
      type Phase = 'raining' | 'stopping' | 'butterflies' | 'resetting';
      let phase: Phase = 'raining';
      let stoppingTimer = 0;
      let rainingTimer = 0; // Timer for automatic rain stop

      // Theme colors
      const bgColor = p.color(20, 30, 50);
      const rainColor = p.color(180, 200, 220);
      const stackedColor = p.color(140, 160, 180); // Darker for stacked
      const butterflyColor = p.color(255, 200, 80);

      // Interfaces
      interface StackedChar {
        x: number;
        y: number;
        char: string;
        size: number;
        alpha: number;
        targetAlpha: number;
        glowPhase: number;
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

      // Gaussian random number generator
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
        word: string; // Changed from char to word
        alpha: number;

        constructor(startRandomY = true) {
          // Gaussian distribution for center-weighted position
          this.x = gaussianRandom(p.width / 2, p.width / 4);
          this.x = p.constrain(this.x, 0, p.width);

          this.y = startRandomY ? p.random(-p.height, p.height) : p.random(-500, -50);
          this.z = p.random(0.5, 2);

          // Random speed variation
          const baseSpeed = p.map(this.z, 0.5, 2, 1, 3.5);
          this.speed = baseSpeed * p.random(0.7, 1.3);

          // Smaller text size
          this.textSize = p.map(this.z, 0.5, 2, 6, 12); // Reduced from 10-24 to 6-12
          this.alpha = p.map(this.z, 0.5, 2, 120, 255);
          this.pickWord();
        }

        pickWord() {
          // Pick a random word
          const randomIndex = Math.floor(p.random(WORDS.length));
          this.word = WORDS[randomIndex];
          // Occasionally show empty
          if (p.random(1) > 0.9) {
            this.word = "";
          }
        }

        // Get first character for stacking
        get char(): string {
          return this.word.length > 0 ? this.word[0] : '';
        }

        update() {
          this.y += this.speed;

          // Check for stacking (only in raining phase)
          if (phase === 'raining' && this.y > p.height - 100) {
            if (checkStacking(this)) {
              this.reset();
              return;
            }
          }

          // Reset when off screen (only in raining phase)
          if (phase === 'raining' && this.y > p.height + 50) {
            this.reset();
          }
        }

        reset() {
          this.y = p.random(-200, -50);
          this.x = gaussianRandom(p.width / 2, p.width / 4);
          this.x = p.constrain(this.x, 0, p.width);
          this.pickWord();
        }

        display() {
          if (!this.word) return;

          // Draw tail (shorter for smaller text)
          const tailLength = p.map(this.z, 0.5, 2, 40, 90); // Reduced from 80-180
          p.stroke(rainColor.levels[0], rainColor.levels[1], rainColor.levels[2], this.alpha * 0.4);
          p.strokeWeight(p.map(this.z, 0.5, 2, 0.3, 1));
          p.line(this.x, this.y - tailLength, this.x, this.y);

          // Draw word vertically
          p.noStroke();
          p.fill(rainColor.levels[0], rainColor.levels[1], rainColor.levels[2], this.alpha);
          p.textSize(this.textSize);
          p.textAlign(p.CENTER, p.TOP);

          // Draw each character vertically
          for (let i = 0; i < this.word.length; i++) {
            const charY = this.y + i * this.textSize * 1.2; // 1.2 for line spacing
            p.text(this.word[i], this.x, charY);
          }
        }
      }

      // Initialize height map
      function initHeightMap() {
        heightMap = [];
        const mapWidth = Math.ceil(p.width / GRID_SIZE);
        for (let i = 0; i < mapWidth; i++) {
          heightMap[i] = p.height;
        }
      }

      // Check if drop should stack
      function checkStacking(drop: RainDrop): boolean {
        if (!drop.char) return false;

        const gridX = Math.floor(drop.x / GRID_SIZE);
        if (gridX < 0 || gridX >= heightMap.length) return false;

        const currentHeight = heightMap[gridX];

        // Check if drop reached stacking height
        if (drop.y >= currentHeight - 5) {
          // Add to stacked chars
          const jitterX = p.random(-2, 2);
          const jitterY = p.random(-1, 1);

          stackedChars.push({
            x: drop.x + jitterX,
            y: currentHeight + jitterY,
            char: drop.char,
            size: drop.textSize * 0.7,
            alpha: 150,
            targetAlpha: 150,
            glowPhase: p.random(p.TWO_PI)
          });

          // Update height map
          heightMap[gridX] -= drop.textSize * 0.7;

          return true;
        }

        return false;
      }

      // Draw stacked characters
      function drawStackedChars() {
        p.textAlign(p.CENTER, p.BOTTOM);

        for (const char of stackedChars) {
          // Update glow
          char.glowPhase += 0.02;
          const glow = p.sin(char.glowPhase) * 0.15 + 0.85;

          // Fade towards target
          if (Math.abs(char.alpha - char.targetAlpha) > 1) {
            char.alpha += (char.targetAlpha - char.alpha) * 0.05;
          }

          if (char.alpha > 0) {
            p.noStroke();
            p.fill(stackedColor.levels[0], stackedColor.levels[1],
                   stackedColor.levels[2], char.alpha * glow);
            p.textSize(char.size);
            p.text(char.char, char.x, char.y);
          }
        }

        // Remove fully faded chars
        for (let i = stackedChars.length - 1; i >= 0; i--) {
          if (stackedChars[i].alpha <= 1) {
            stackedChars.splice(i, 1);
          }
        }
      }

      // Check if ready to stop rain
      function checkStopRain(): boolean {
        // Get max stack height
        const minHeight = Math.min(...heightMap);
        const stackHeight = p.height - minHeight;
        return stackHeight >= p.height * 0.25; // Stop when quarter screen filled (faster)
      }

      // Spawn butterflies gradually
      function spawnButterfly() {
        if (stackedChars.length === 0) return;

        // Pick random stacked char
        const charIndex = Math.floor(p.random(stackedChars.length));
        const char = stackedChars[charIndex];

        const angle = p.random(p.TWO_PI);
        const speed = p.random(1, 3);

        butterflies.push({
          x: char.x,
          y: char.y,
          vx: p.cos(angle) * speed,
          vy: p.sin(angle) * speed - 1, // Bias upward
          wingPhase: p.random(p.TWO_PI),
          wingSpeed: p.random(0.1, 0.2),
          size: p.random(12, 20),
          alpha: 255
        });
      }

      // Update butterflies
      function updateButterflies() {
        for (let i = butterflies.length - 1; i >= 0; i--) {
          const b = butterflies[i];

          b.x += b.vx;
          b.y += b.vy;
          b.wingPhase += b.wingSpeed;
          b.alpha -= 1;

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
        p.fill(butterflyColor.levels[0], butterflyColor.levels[1],
               butterflyColor.levels[2], b.alpha);
        p.noStroke();
        p.ellipse(-b.size * 0.3, 0, b.size, b.size * 0.6);
        p.pop();

        // Right wing
        p.push();
        p.rotate(wingAngle);
        p.fill(butterflyColor.levels[0], butterflyColor.levels[1],
               butterflyColor.levels[2], b.alpha);
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

        // Initialize height map
        initHeightMap();
      };

      p.draw = () => {
        p.background(bgColor);

        switch(phase) {
          case 'raining':
            // Draw stacked chars first (background)
            drawStackedChars();

            // Update and display rain drops
            for (let drop of drops) {
              drop.update();
              drop.display();
            }

            // Increment timer
            rainingTimer++;

            // Debug: Log timer every second
            if (rainingTimer % 60 === 0) {
              console.log(`Raining timer: ${rainingTimer} frames (${rainingTimer/60} seconds)`);
              console.log(`Current phase: ${phase}`);
              console.log(`Stacked chars: ${stackedChars.length}`);
            }

            // Check if should stop (10 seconds = 600 frames at 60fps, OR height threshold)
            if (rainingTimer >= 600 || checkStopRain()) {
              console.log(`STOPPING RAIN - Timer: ${rainingTimer}, Height check: ${checkStopRain()}`);
              phase = 'stopping';
              stoppingTimer = 0;
            }
            break;

          case 'stopping':
            // Draw stacked chars
            drawStackedChars();

            // Continue updating existing drops
            for (let drop of drops) {
              drop.update();
              if (drop.y > -100) { // Only show drops that are visible
                drop.display();
              }
            }

            // Wait for all drops to clear
            stoppingTimer++;
            const allDropsGone = drops.every(d => d.y > p.height + 50 || d.y < -100);

            // Debug
            if (stoppingTimer % 30 === 0) {
              console.log(`STOPPING phase - Timer: ${stoppingTimer}, All drops gone: ${allDropsGone}`);
            }

            if (allDropsGone && stoppingTimer > 30) { // Wait 30 frames after clear
              console.log(`ENTERING BUTTERFLIES PHASE`);
              phase = 'butterflies';
              butterflySpawnRate = 0.005;
              butterflyTimer = 0;
            }
            break;

          case 'butterflies':
            // Draw stacked chars (fading)
            drawStackedChars();

            // Gradually fade all stacked chars
            for (const char of stackedChars) {
              char.targetAlpha -= 0.5;
            }

            // Spawn butterflies with acceleration
            butterflyTimer++;
            butterflySpawnRate *= 1.03; // Accelerate spawn rate

            // Debug
            if (butterflyTimer % 60 === 0) {
              console.log(`BUTTERFLIES phase - Timer: ${butterflyTimer}, Spawn rate: ${butterflySpawnRate.toFixed(4)}, Butterflies: ${butterflies.length}, Stacked: ${stackedChars.length}`);
            }

            if (p.random() < butterflySpawnRate && stackedChars.length > 0) {
              spawnButterfly();
            }

            // Update and draw butterflies
            updateButterflies();
            for (const b of butterflies) {
              drawButterfly(b);
            }

            // Transition to resetting when chars and butterflies gone
            if (stackedChars.length === 0 && butterflies.length === 0 && butterflyTimer > 180) {
              console.log(`ENTERING RESETTING PHASE`);
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

            // When all drops restored, reset and return to raining
            if (allRestored) {
              phase = 'raining';
              rainingTimer = 0; // Reset timer
              initHeightMap();
              stackedChars = [];
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
          initHeightMap();
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
