const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d", { alpha: false });

const audioState = {
  context: null,
  analyser: null,
  source: null,
  micStream: null,
  data: null,
  bass: 0,
  mid: 0,
  treble: 0,
  level: 0,
  active: false,
};
const audio = new Audio();
audio.loop = true;

const audioFileInput = document.getElementById("audioFile");
const playBtn = document.getElementById("playBtn");
const micBtn = document.getElementById("micBtn");
const audioStatus = document.getElementById("audioStatus");
const audioMeter = document.getElementById("audioMeter");

function ensureAudioContext() {
  if (!audioState.context) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioState.context = new AudioContext();
  }
  if (!audioState.analyser) {
    audioState.analyser = audioState.context.createAnalyser();
    audioState.analyser.fftSize = 256;
    audioState.data = new Uint8Array(audioState.analyser.frequencyBinCount);
  }
}

function connectMediaElement() {
  ensureAudioContext();
  if (audioState.source && audioState.source.mediaStream) {
    audioState.source.disconnect();
    audioState.source = null;
  }
  if (!audioState.source) {
    audioState.source = audioState.context.createMediaElementSource(audio);
    audioState.source.connect(audioState.analyser);
    audioState.analyser.connect(audioState.context.destination);
  }
  audioState.active = true;
}

async function connectMic() {
  ensureAudioContext();
  if (audioState.micStream) {
    audioState.micStream.getTracks().forEach((track) => track.stop());
  }
  audioState.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  if (audioState.source) {
    audioState.source.disconnect();
  }
  const micSource = audioState.context.createMediaStreamSource(audioState.micStream);
  micSource.connect(audioState.analyser);
  audioState.source = micSource;
  audioState.active = true;
}

function updateAudioUI(text) {
  if (audioStatus) {
    audioStatus.textContent = text;
  }
}

function avg(data, start, end) {
  let sum = 0;
  const clampedEnd = Math.min(end, data.length);
  for (let i = start; i < clampedEnd; i += 1) {
    sum += data[i];
  }
  return sum / Math.max(1, clampedEnd - start);
}

function updateAudioData() {
  if (!audioState.analyser || !audioState.active) {
    audioState.bass = 0;
    audioState.mid = 0;
    audioState.treble = 0;
    audioState.level = 0;
    if (audioMeter) {
      audioMeter.style.transform = "scaleX(0.05)";
    }
    return;
  }
  audioState.analyser.getByteFrequencyData(audioState.data);
  const freq = audioState.data;
  audioState.bass = avg(freq, 0, 10);
  audioState.mid = avg(freq, 10, 100);
  audioState.treble = avg(freq, 100, freq.length);
  audioState.level = avg(freq, 0, freq.length);
  if (audioMeter) {
    audioMeter.style.transform = `scaleX(${0.05 + (audioState.level / 255) * 0.95})`;
  }
}

if (audioFileInput) {
  audioFileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    if (audioState.micStream) {
      audioState.micStream.getTracks().forEach((track) => track.stop());
      audioState.micStream = null;
      if (audioState.source) {
        audioState.source.disconnect();
        audioState.source = null;
      }
    }
    audio.src = URL.createObjectURL(file);
    connectMediaElement();
    audio.play();
    if (audioState.context && audioState.context.state === "suspended") {
      audioState.context.resume();
    }
    updateAudioUI(`Playing: ${file.name}`);
    if (playBtn) {
      playBtn.textContent = "Pause";
    }
  });
}

if (playBtn) {
  playBtn.addEventListener("click", async () => {
    ensureAudioContext();
    if (audioState.context.state === "suspended") {
      await audioState.context.resume();
    }
    if (audio.paused) {
      connectMediaElement();
      await audio.play();
      updateAudioUI("Playing file audio");
      playBtn.textContent = "Pause";
      audioState.active = true;
    } else {
      audio.pause();
      audioState.active = false;
      updateAudioUI("Paused");
      playBtn.textContent = "Play";
    }
  });
}

if (micBtn) {
  micBtn.addEventListener("click", async () => {
    try {
      if (audioState.micStream) {
        audioState.micStream.getTracks().forEach((track) => track.stop());
        audioState.micStream = null;
        if (audioState.source) {
          audioState.source.disconnect();
          audioState.source = null;
        }
        audioState.active = false;
        updateAudioUI("Mic stopped");
        micBtn.textContent = "Mic";
        return;
      }
      if (!audio.paused) {
        audio.pause();
        if (playBtn) {
          playBtn.textContent = "Play";
        }
      }
      await connectMic();
      updateAudioUI("Mic live");
      micBtn.textContent = "Stop Mic";
      if (audioState.context.state === "suspended") {
        await audioState.context.resume();
      }
    } catch (error) {
      updateAudioUI("Mic blocked");
    }
  });
}

audio.addEventListener("ended", () => {
  updateAudioUI("Ended");
  audioState.active = false;
  if (playBtn) {
    playBtn.textContent = "Play";
  }
});

const FLOW = {
  cellSize: 14,
  cols: 0,
  rows: 0,
  field: [],
  centers: [],
};

const particles = [];
const particleCount = 6200;
const trailLength = 120;

let width = 0;
let height = 0;
let dpi = 1;

function resize() {
  dpi = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpi);
  canvas.height = Math.floor(height * dpi);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpi, 0, 0, dpi, 0, 0);

  FLOW.cols = Math.ceil(width / FLOW.cellSize);
  FLOW.rows = Math.ceil(height / FLOW.cellSize);
  FLOW.field = new Float32Array(FLOW.cols * FLOW.rows * 2);

  if (FLOW.centers.length === 0) {
    FLOW.centers = [
      { x: width * 0.25, y: height * 0.35 },
      { x: width * 0.65, y: height * 0.3 },
      { x: width * 0.75, y: height * 0.7 },
      { x: width * 0.35, y: height * 0.65 },
      { x: width * 0.85, y: height * 0.2 },
    ];
  }

}

const permutation = new Uint8Array(512);
const basePerm = new Uint8Array(256);
for (let i = 0; i < 256; i += 1) {
  basePerm[i] = i;
}
for (let i = 255; i > 0; i -= 1) {
  const j = Math.floor(Math.random() * (i + 1));
  const tmp = basePerm[i];
  basePerm[i] = basePerm[j];
  basePerm[j] = tmp;
}
for (let i = 0; i < 512; i += 1) {
  permutation[i] = basePerm[i & 255];
}

function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function grad(hash, x, y, z) {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

function perlin(x, y, z) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;

  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const zf = z - Math.floor(z);

  const u = fade(xf);
  const v = fade(yf);
  const w = fade(zf);

  const A = permutation[X] + Y;
  const AA = permutation[A] + Z;
  const AB = permutation[A + 1] + Z;
  const B = permutation[X + 1] + Y;
  const BA = permutation[B] + Z;
  const BB = permutation[B + 1] + Z;

  const x1 = lerp(
    grad(permutation[AA], xf, yf, zf),
    grad(permutation[BA], xf - 1, yf, zf),
    u
  );
  const x2 = lerp(
    grad(permutation[AB], xf, yf - 1, zf),
    grad(permutation[BB], xf - 1, yf - 1, zf),
    u
  );
  const y1 = lerp(x1, x2, v);

  const x3 = lerp(
    grad(permutation[AA + 1], xf, yf, zf - 1),
    grad(permutation[BA + 1], xf - 1, yf, zf - 1),
    u
  );
  const x4 = lerp(
    grad(permutation[AB + 1], xf, yf - 1, zf - 1),
    grad(permutation[BB + 1], xf - 1, yf - 1, zf - 1),
    u
  );
  const y2 = lerp(x3, x4, v);

  return (lerp(y1, y2, w) + 1) / 2;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function sampleFlow(x, y) {
  const gx = x / FLOW.cellSize;
  const gy = y / FLOW.cellSize;
  const x0 = Math.max(0, Math.min(FLOW.cols - 1, Math.floor(gx)));
  const y0 = Math.max(0, Math.min(FLOW.rows - 1, Math.floor(gy)));
  const x1 = Math.min(FLOW.cols - 1, x0 + 1);
  const y1 = Math.min(FLOW.rows - 1, y0 + 1);

  const fx = gx - x0;
  const fy = gy - y0;

  const idx00 = (y0 * FLOW.cols + x0) * 2;
  const idx10 = (y0 * FLOW.cols + x1) * 2;
  const idx01 = (y1 * FLOW.cols + x0) * 2;
  const idx11 = (y1 * FLOW.cols + x1) * 2;

  const vx = lerp(
    lerp(FLOW.field[idx00], FLOW.field[idx10], fx),
    lerp(FLOW.field[idx01], FLOW.field[idx11], fx),
    fy
  );
  const vy = lerp(
    lerp(FLOW.field[idx00 + 1], FLOW.field[idx10 + 1], fx),
    lerp(FLOW.field[idx01 + 1], FLOW.field[idx11 + 1], fx),
    fy
  );
  return { vx, vy };
}

function buildFlowField(time, bassNorm) {
  const scale = 0.007;
  const swirlBoost = 0.9 + bassNorm * 1.6;
  let idx = 0;
  for (let y = 0; y < FLOW.rows; y += 1) {
    for (let x = 0; x < FLOW.cols; x += 1) {
      const n = perlin(x * scale, y * scale, time * 0.15);
      const baseAngle = n * Math.PI * 4;
      let vx = Math.cos(baseAngle);
      let vy = Math.sin(baseAngle);

      const px = x * FLOW.cellSize;
      const py = y * FLOW.cellSize;
      for (let c = 0; c < FLOW.centers.length; c += 1) {
        const center = FLOW.centers[c];
        const dx = px - center.x;
        const dy = py - center.y;
        const dist = Math.max(40, Math.sqrt(dx * dx + dy * dy));
        const swirl = (120 / dist) * swirlBoost;
        vx += (-dy / dist) * swirl;
        vy += (dx / dist) * swirl;
      }

      const mag = Math.hypot(vx, vy) || 1;
      FLOW.field[idx] = vx / mag;
      FLOW.field[idx + 1] = vy / mag;
      idx += 2;
    }
  }
}

function spawnParticle(particle) {
  particle.x = Math.random() * width;
  particle.y = Math.random() * height;
  particle.speed = 0.6 + Math.random() * 1.4;
  particle.head = trailLength - 1;
  particle.life = 0;
  particle.maxLife = 90 + Math.random() * 60; // ~1.5-2.5 seconds at 60fps
  for (let t = 0; t < trailLength; t += 1) {
    const idx = t * 2;
    particle.trail[idx] = particle.x;
    particle.trail[idx + 1] = particle.y;
  }
}

function initParticles() {
  particles.length = 0;
  for (let i = 0; i < particleCount; i += 1) {
    const trail = new Float32Array(trailLength * 2);
    const p = { x: 0, y: 0, speed: 1, trail, head: trailLength - 1, life: 0, maxLife: 240 };
    spawnParticle(p);
    p.life = Math.random() * p.maxLife; // stagger initial lifespans
    particles.push(p);
  }
}

function gradientColor(t) {
  const c0 = { r: 18, g: 40, b: 110 };
  const c1 = { r: 90, g: 200, b: 255 };
  const c2 = { r: 255, g: 220, b: 120 };
  const c3 = { r: 255, g: 245, b: 230 };
  let a;
  let b;
  let u;
  if (t < 0.45) {
    a = c0;
    b = c1;
    u = t / 0.45;
  } else if (t < 0.75) {
    a = c1;
    b = c2;
    u = (t - 0.45) / 0.3;
  } else {
    a = c2;
    b = c3;
    u = (t - 0.75) / 0.25;
  }
  return {
    r: lerp(a.r, b.r, u),
    g: lerp(a.g, b.g, u),
    b: lerp(a.b, b.b, u),
  };
}

function applyRegionTint(x, y, color) {
  if (x > width * 0.65 && y < height * 0.3) {
    return { r: 255, g: 215, b: 110 };
  }
  return color;
}

function draw() {
  updateAudioData();
  const bassNorm = audioState.bass / 255;
  const trebleNorm = audioState.treble / 255;
  const levelNorm = audioState.level / 255;

  buildFlowField(performance.now() * 0.001, bassNorm);

  ctx.fillStyle = "rgba(5, 10, 20, 0.28)";
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "lighter";

  const speedScale = 0.6 + levelNorm * 1.6;
  const brightness = 0.7 + trebleNorm * 0.8;

  for (let i = 0; i < particles.length; i += 1) {
    const p = particles[i];
    const { vx, vy } = sampleFlow(p.x, p.y);

    if (!Number.isFinite(vx) || !Number.isFinite(vy)) {
      spawnParticle(p);
      continue;
    }

    p.x += vx * p.speed * speedScale;
    p.y += vy * p.speed * speedScale;

    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
      spawnParticle(p);
      continue;
    }

    if (p.x < -20 || p.x > width + 20 || p.y < -20 || p.y > height + 20) {
      spawnParticle(p);
      continue;
    }

    p.life += 1;
    if (p.life > p.maxLife) {
      spawnParticle(p);
      continue;
    }

    p.head = (p.head + 1) % trailLength;
    const headIndex = p.head * 2;
    p.trail[headIndex] = p.x;
    p.trail[headIndex + 1] = p.y;

    const tailIndex = (p.head + 1) % trailLength;
    const tailX = p.trail[tailIndex * 2];
    const tailY = p.trail[tailIndex * 2 + 1];
    const headX = p.trail[headIndex];
    const headY = p.trail[headIndex + 1];

    const angle = Math.atan2(vy, vx);
    const t = (angle + Math.PI) / (Math.PI * 2);
    const baseColor = applyRegionTint(headX, headY, gradientColor(t));
    const color = {
      r: baseColor.r * brightness,
      g: baseColor.g * brightness,
      b: baseColor.b * brightness,
    };

    const gradient = ctx.createLinearGradient(tailX, tailY, headX, headY);
    gradient.addColorStop(0, `rgba(${color.r.toFixed(1)}, ${color.g.toFixed(1)}, ${color.b.toFixed(1)}, 0)`);
    gradient.addColorStop(0.6, `rgba(${color.r.toFixed(1)}, ${color.g.toFixed(1)}, ${color.b.toFixed(1)}, ${0.25 * brightness})`);
    gradient.addColorStop(1, `rgba(${color.r.toFixed(1)}, ${color.g.toFixed(1)}, ${color.b.toFixed(1)}, ${0.9 * brightness})`);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 0.7 + (1 - p.speed / 2) * 0.6;
    ctx.beginPath();

    for (let s = 0; s < trailLength; s += 1) {
      const idxTrail = (p.head - (trailLength - 1 - s) + trailLength) % trailLength;
      const tx = p.trail[idxTrail * 2];
      const ty = p.trail[idxTrail * 2 + 1];
      if (s === 0) {
        ctx.moveTo(tx, ty);
      } else {
        ctx.lineTo(tx, ty);
      }
    }
    ctx.stroke();
  }

  ctx.globalCompositeOperation = "source-over";
  requestAnimationFrame(draw);
}

resize();
initParticles();
ctx.fillStyle = "rgb(5, 10, 20)";
ctx.fillRect(0, 0, width, height);
window.addEventListener("resize", () => {
  resize();
  initParticles();
});
requestAnimationFrame(draw);
