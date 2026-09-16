<template>
  <main class="heart-page">
    <div class="ambient ambient-one" />
    <div class="ambient ambient-two" />
    <section class="heart-header">
      <p class="eyebrow">CANVAS / PARTICLE PLAYGROUND</p>
      <h1>粒子比心</h1>
      <p class="subtitle">让每一颗光，都找到心里的位置</p>
    </section>

    <section ref="stageRef" class="heart-stage">
      <canvas ref="canvasRef" @pointerdown="burst" />
      <div class="stage-caption">
        <span class="pulse-dot" />
        点击画面，让心意绽放
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  size: number;
  alpha: number;
  phase: number;
  color: string;
}

const canvasRef = ref<HTMLCanvasElement | null>(null);
const stageRef = ref<HTMLElement | null>(null);
const particles: Particle[] = [];
const colors = ["#ff5c8a", "#ff8fb3", "#ffbd69", "#c58cff", "#ffffff"];
let context: CanvasRenderingContext2D | null = null;
let animationFrame = 0;
let width = 0;
let height = 0;
let dpr = 1;
let explodingUntil = 0;

const random = (min: number, max: number) => Math.random() * (max - min) + min;

const heartPoint = (t: number, scale: number, cx: number, cy: number) => ({
  x: cx + scale * 16 * Math.sin(t) ** 3,
  y: cy - scale * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)),
});

const createParticles = () => {
  particles.length = 0;
  const amount = Math.min(1500, Math.max(650, Math.floor((width * height) / 1200)));
  const scale = Math.min(width, height) / 38;

  for (let index = 0; index < amount; index += 1) {
    const point = heartPoint((index / amount) * Math.PI * 2, scale, width / 2, height / 2 + 10);
    particles.push({
      x: random(0, width),
      y: random(0, height),
      vx: 0,
      vy: 0,
      tx: point.x + random(-2, 2),
      ty: point.y + random(-2, 2),
      size: random(0.8, 2.4),
      alpha: random(0.35, 1),
      phase: random(0, Math.PI * 2),
      color: colors[index % colors.length],
    });
  }
};

const resize = () => {
  const canvas = canvasRef.value;
  const stage = stageRef.value;
  if (!canvas || !stage) return;
  const rect = stage.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context = canvas.getContext("2d");
  context?.setTransform(dpr, 0, 0, dpr, 0, 0);
  createParticles();
};

const burst = (event: PointerEvent) => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const originX = event.clientX - rect.left;
  const originY = event.clientY - rect.top;
  explodingUntil = performance.now() + 1000;

  particles.forEach((particle) => {
    const dx = particle.x - originX;
    const dy = particle.y - originY;
    const distance = Math.max(Math.hypot(dx, dy), 1);
    const force = random(5, 13) * (1 - Math.min(distance / Math.max(width, height), 0.7));
    particle.vx = (dx / distance) * force;
    particle.vy = (dy / distance) * force;
  });
};

const draw = (time: number) => {
  if (!context) return;
  context.fillStyle = "rgba(10, 7, 24, 0.22)";
  context.fillRect(0, 0, width, height);

  const exploding = time < explodingUntil;
  particles.forEach((particle) => {
    if (exploding) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx *= 0.95;
      particle.vy *= 0.95;
    } else {
      const driftX = Math.sin(time * 0.0012 + particle.phase) * 0.3;
      const driftY = Math.cos(time * 0.001 + particle.phase) * 0.3;
      particle.x += (particle.tx + driftX - particle.x) * 0.045;
      particle.y += (particle.ty + driftY - particle.y) * 0.045;
    }

    const flicker = 0.75 + Math.sin(time * 0.003 + particle.phase) * 0.25;
    context!.globalAlpha = particle.alpha * flicker;
    context!.fillStyle = particle.color;
    context!.shadowColor = particle.color;
    context!.shadowBlur = 8;
    context!.beginPath();
    context!.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    context!.fill();
  });

  context.globalAlpha = 1;
  context.shadowBlur = 0;
  animationFrame = requestAnimationFrame(draw);
};

onMounted(() => {
  resize();
  window.addEventListener("resize", resize);
  animationFrame = requestAnimationFrame(draw);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", resize);
  cancelAnimationFrame(animationFrame);
});
</script>

<style lang="scss" scoped>
.heart-page {
  position: relative;
  min-height: calc(100vh - 50px);
  overflow: hidden;
  padding: 52px clamp(22px, 5vw, 84px) 36px;
  color: #fff;
  background: #0a0718;
  isolation: isolate;
}

.ambient {
  position: absolute;
  width: 420px;
  height: 420px;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.2;
  pointer-events: none;
  z-index: -1;
}

.ambient-one {
  top: -180px;
  right: 8%;
  background: #e94378;
}

.ambient-two {
  bottom: -220px;
  left: 8%;
  background: #7255ff;
}

.heart-header {
  position: relative;
  z-index: 1;
  text-align: center;
}

.eyebrow {
  margin: 0 0 12px;
  color: #ff8fb3;
  font-size: 11px;
  letter-spacing: 0.18em;
}

h1 {
  margin: 0;
  font-size: clamp(30px, 5vw, 56px);
  letter-spacing: 0.08em;
  text-shadow: 0 0 28px rgba(255, 92, 138, 0.55);
}

.subtitle {
  margin: 12px 0 0;
  color: rgba(255, 255, 255, 0.62);
  font-size: 15px;
}

.heart-stage {
  position: relative;
  width: min(100%, 1040px);
  height: min(68vh, 620px);
  min-height: 390px;
  margin: 28px auto 0;
  overflow: hidden;
  border: 1px solid rgba(255, 143, 179, 0.2);
  border-radius: 24px;
  background: radial-gradient(circle at 50% 48%, rgba(112, 44, 100, 0.2), transparent 48%);
  box-shadow: inset 0 0 80px rgba(255, 76, 143, 0.06), 0 20px 80px rgba(0, 0, 0, 0.25);
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: pointer;
  touch-action: manipulation;
}

.stage-caption {
  position: absolute;
  right: 22px;
  bottom: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 12px;
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ff5c8a;
  box-shadow: 0 0 12px #ff5c8a;
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse {
  50% {
    transform: scale(1.5);
    opacity: 0.45;
  }
}

@media (max-width: 640px) {
  .heart-page {
    padding: 34px 14px 22px;
  }

  .heart-stage {
    height: 58vh;
    min-height: 330px;
    border-radius: 18px;
  }

  .stage-caption {
    right: 14px;
    bottom: 12px;
  }
}
</style>
