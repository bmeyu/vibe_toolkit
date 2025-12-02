
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
      let stackedWords: StackedWord[] = [];
      let heightMap: number[] = []; // Height at each x position
      const GRID_SIZE = 15; // Pixel grid for height tracking (larger for better stacking)

      // Butterflies
      let butterflies: Butterfly[] = [];
      let butterflySpawnRate = 0;
      let butterflyTimer = 0;

      // Phase management
      type Phase = 'raining' | 'slowingDown' | 'stopping' | 'butterflies';
      let phase: Phase = 'raining';
      let slowingTimer = 0;
      let stoppingTimer = 0;
      let rainingTimer = 0; // Timer for automatic rain stop

      // Theme colors
      const bgColor = p.color(20, 30, 50);
      const rainColor = p.color(180, 200, 220);
      const stackedColor = p.color(140, 160, 180); // Darker for stacked
      const butterflyColor = p.color(255, 200, 80);

      // Interfaces
      interface StackedWord {
        x: number;
        y: number;
        word: string;        // Changed from char to word
        size: number;
        rotation: number;    // Rotation angle in radians
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

        update(speedMultiplier = 1) {
          this.y += this.speed * speedMultiplier;

          // Check for stacking (only in raining phase)
          // Start checking earlier for better stacking detection
          if (phase === 'raining' && this.y > p.height - 200) {
            if (checkStacking(this)) {
              this.reset();
              return;
            }
          }

          // Reset when off screen (only in raining and slowingDown phases)
          if ((phase === 'raining' || phase === 'slowingDown') && this.y > p.height + 50) {
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
        if (!drop.word) return false;

        const gridX = Math.floor(drop.x / GRID_SIZE);
        if (gridX < 0 || gridX >= heightMap.length) return false;

        const currentHeight = heightMap[gridX];

        // Check if drop reached stacking height (larger detection range)
        if (drop.y >= currentHeight - 15) {
          // Random jitter for natural scatter
          const jitterX = p.random(-8, 8);
          const jitterY = p.random(-3, 3);

          // Random rotation: ±15 degrees (convert to radians)
          const rotation = p.random(-0.26, 0.26); // ~±15°

          stackedWords.push({
            x: drop.x + jitterX,
            y: currentHeight + jitterY,
            word: drop.word,  // Store complete word
            size: drop.textSize,  // Keep original size variation (6-12px)
            rotation: rotation,
            alpha: 200,
            targetAlpha: 200,
            glowPhase: p.random(p.TWO_PI)
          });

          // Update height map
          const wordHeight = drop.textSize * 1.2;
          heightMap[gridX] -= wordHeight;

          // Update adjacent cells for smoother mountain shape
          if (gridX > 0) {
            heightMap[gridX - 1] -= wordHeight * 0.4;
          }
          if (gridX < heightMap.length - 1) {
            heightMap[gridX + 1] -= wordHeight * 0.4;
          }

          return true;
        }

        return false;
      }

      // Draw stacked words (with rotation)
      function drawStackedWords() {
        for (const item of stackedWords) {
          // Update glow
          item.glowPhase += 0.02;
          const glow = p.sin(item.glowPhase) * 0.15 + 0.85;

          // Fade towards target
          if (Math.abs(item.alpha - item.targetAlpha) > 1) {
            item.alpha += (item.targetAlpha - item.alpha) * 0.05;
          }

          if (item.alpha > 0) {
            p.push();
            p.translate(item.x, item.y);
            p.rotate(item.rotation);  // Apply rotation

            p.noStroke();
            p.fill(stackedColor.levels[0], stackedColor.levels[1],
                   stackedColor.levels[2], item.alpha * glow);
            p.textSize(item.size);
            p.textAlign(p.CENTER, p.BOTTOM);
            p.text(item.word, 0, 0);  // Draw at origin (already translated)

            p.pop();
          }
        }

        // Remove fully faded words
        for (let i = stackedWords.length - 1; i >= 0; i--) {
          if (stackedWords[i].alpha <= 1) {
            stackedWords.splice(i, 1);
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

      // Spawn butterflies from center point (blooming effect)
      function spawnButterfly() {
        if (stackedWords.length === 0) return;

        // Find the lowest stacked word (center of the mountain)
        let lowestY = 0;
        let centerX = p.width / 2;
        let centerY = p.height;

        for (const item of stackedWords) {
          if (item.y < centerY) {
            centerY = item.y;
            centerX = item.x;
          }
        }

        // Burst from center point in all directions
        const angle = p.random(p.TWO_PI);
        const speed = p.random(2, 4); // Faster burst

        butterflies.push({
          x: centerX,
          y: centerY,
          vx: p.cos(angle) * speed,
          vy: p.sin(angle) * speed - 1.5, // Stronger upward bias
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
            // Ensure clean start on first frame
            if (rainingTimer <= 0) {
              stackedWords = []; // Force clear
              rainingTimer++;
              break; // Skip all drawing on first frame for clean slate
            }

            // Draw stacked words first (background)
            drawStackedWords();

            // Update and display rain drops
            for (let drop of drops) {
              drop.update();
              drop.display();
            }

            // Increment timer
            rainingTimer++;

            // Check if should start slowing down (9 seconds = 540 frames at 60fps, OR height threshold)
            if (rainingTimer >= 540 || checkStopRain()) {
              phase = 'slowingDown';
              slowingTimer = 0;
            }
            break;

          case 'slowingDown':
            // Draw stacked words first (background)
            drawStackedWords();

            // Calculate slowdown factor (gradually reduce speed over 2 seconds)
            // slowingTimer 0-120: factor goes from 1.0 to 0.0
            const slowdownFactor = Math.max(0, 1 - (slowingTimer / 120));

            // Update and display rain drops with slowdown
            for (let drop of drops) {
              drop.update(slowdownFactor);
              drop.display();
            }

            // Increment timer
            slowingTimer++;

            // After 2 seconds of slowing down (120 frames), freeze completely
            if (slowingTimer >= 120) {
              phase = 'stopping';
              stoppingTimer = 0;
            }
            break;

          case 'stopping':
            // Draw stacked words
            drawStackedWords();

            // Freeze all drops - display but don't update
            // Only show drops that are on screen
            for (let drop of drops) {
              if (drop.y >= -100 && drop.y <= p.height + 100) {
                drop.display();
              }
            }

            // Short pause with frozen rain
            stoppingTimer++;

            if (stoppingTimer > 60) { // Wait 1 second (60 frames)
              phase = 'butterflies';
              butterflySpawnRate = 0.01; // Start slow for blooming effect
              butterflyTimer = 0;
            }
            break;

          case 'butterflies':
            // Draw stacked words (fading)
            drawStackedWords();

            // Gradually fade all stacked words
            for (const item of stackedWords) {
              item.targetAlpha -= 0.5;
            }

            // Spawn butterflies with acceleration (blooming effect)
            butterflyTimer++;
            butterflySpawnRate *= 1.05; // Faster acceleration for dramatic burst

            if (p.random() < butterflySpawnRate && stackedWords.length > 0) {
              spawnButterfly();
            }

            // Update and draw butterflies
            updateButterflies();
            for (const b of butterflies) {
              drawButterfly(b);
            }

            // Transition to resetting when words and butterflies gone
            if (stackedWords.length === 0 && butterflies.length === 0 && butterflyTimer > 180) {
              // Simple solution: Reset everything from scratch
              drops = [];
              for (let i = 0; i < numDrops; i++) {
                drops.push(new RainDrop());
              }
              stackedWords = [];
              butterflies = [];
              initHeightMap();
              phase = 'raining';
              rainingTimer = 0;
              butterflyTimer = 0;
              butterflySpawnRate = 0;
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
