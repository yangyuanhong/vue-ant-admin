<template>
  <main class="rose-page">
    <div class="ambient ambient-one" />
    <div class="ambient ambient-two" />
    <section class="rose-header">
      <p class="eyebrow">CANVAS / PARTICLE GARDEN</p>
      <h1>粒子送玫瑰</h1>
      <p class="subtitle">让一朵花，从微光里慢慢长出来</p>
    </section>

    <section ref="stageRef" class="rose-stage">
      <canvas ref="canvasRef" @pointerdown="sendRose" />
      <div class="stage-caption">
        <span class="pulse-dot" />
        点击画面，送出一朵玫瑰
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

type ParticleKind = "stem" | "leaf" | "petal" | "spark";
interface Particle {
  x: number; y: number; vx: number; vy: number; tx: number; ty: number;
  size: number; alpha: number; phase: number; color: string;
  kind: ParticleKind; delay: number;
}

const canvasRef = ref<HTMLCanvasElement | null>(null);
const stageRef = ref<HTMLElement | null>(null);
const particles: Particle[] = [];
const palette = {
  stem: ["#49d18b", "#82f2a9", "#1d9d71"],
  leaf: ["#37c879", "#72ed9d", "#1f996a"],
  petal: ["#ff315f", "#ff4d76", "#e8184f", "#ff8da6", "#b80845"],
  spark: ["#ffd56a", "#fff0b1", "#ff9e58"],
};
let context: CanvasRenderingContext2D | null = null;
let animationFrame = 0;
let width = 0;
let height = 0;
let dpr = 1;
let phaseStartedAt = 0;
let sendUntil = 0;

const random = (min: number, max: number) => Math.random() * (max - min) + min;
const rosePoint = (index: number, total: number, cx: number, cy: number, scale: number) => {
  const angle = (index / total) * Math.PI * 2;
  const radius = scale * (0.42 + Math.sin(angle * 5) * 0.11 + Math.sin(angle * 9) * 0.07);
  return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius * 0.72 };
};

const addParticle = (kind: ParticleKind, tx: number, ty: number, index: number, delay: number) => {
  particles.push({
    x: random(0, width), y: random(height * 0.1, height * 0.9), vx: 0, vy: 0, tx, ty,
    size: kind === "petal" ? random(1.1, 2.8) : random(0.8, 2.2),
    alpha: random(0.55, 1), phase: index * 0.33 + random(0, Math.PI),
    color: palette[kind][index % palette[kind].length], kind, delay,
  });
};

const createParticles = () => {
  particles.length = 0;
  const cx = width / 2;
  const flowerY = height * 0.41;
  const scale = Math.min(width, height) * 0.28;
  let index = 0;
  for (let y = flowerY + scale * 0.45; y < height * 0.88; y += 4) {
    addParticle("stem", cx + Math.sin((y - flowerY) * 0.02) * 10 + random(-2, 2), y, index++, 0);
  }
  for (let leafIndex = 0; leafIndex < 170; leafIndex += 1) {
    const side = leafIndex % 2 === 0 ? -1 : 1;
    const y = flowerY + scale * 0.35 + (leafIndex % 10) * 10;
    const x = cx + side * (18 + (leafIndex % 17) * 2.8);
    addParticle("leaf", x + random(-7, 7), y + random(-18, 18), index++, 900);
  }
  for (let petalIndex = 0; petalIndex < 1100; petalIndex += 1) {
    const point = rosePoint(petalIndex, 1100, cx, flowerY, scale);
    addParticle("petal", point.x, point.y, index++, 1450 + (petalIndex % 80) * 5);
  }
  for (let sparkIndex = 0; sparkIndex < 80; sparkIndex += 1) {
    addParticle("spark", cx + random(-scale * 1.2, scale * 1.2), flowerY + random(-scale * 0.8, scale * 1.2), index++, 2500 + sparkIndex * 8);
  }
};

const resize = () => {
  const canvas = canvasRef.value;
  const stage = stageRef.value;
  if (!canvas || !stage) return;
  const rect = stage.getBoundingClientRect();
  width = rect.width; height = rect.height; dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = width * dpr; canvas.height = height * dpr;
  canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
  context = canvas.getContext("2d"); context?.setTransform(dpr, 0, 0, dpr, 0, 0);
  createParticles(); phaseStartedAt = performance.now();
};

const sendRose = (event: PointerEvent) => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const originX = event.clientX - rect.left; const originY = event.clientY - rect.top;
  sendUntil = performance.now() + 1300;
  particles.forEach((particle) => {
    const dx = particle.x - originX; const dy = particle.y - originY;
    const distance = Math.max(Math.hypot(dx, dy), 1);
    const force = random(3, 10);
    particle.vx = (dx / distance) * force; particle.vy = (dy / distance) * force - random(1, 4);
  });
};

const draw = (time: number) => {
  if (!context) return;
  const sending = time < sendUntil;
  context.fillStyle = "rgba(12, 7, 20, 0.2)"; context.fillRect(0, 0, width, height);
  particles.forEach((particle) => {
    if (!sending && time - phaseStartedAt < particle.delay) return;
    if (sending) {
      particle.x += particle.vx; particle.y += particle.vy;
      particle.vx *= 0.95; particle.vy *= 0.95;
    } else {
      const driftX = Math.sin(time * 0.0013 + particle.phase) * (particle.kind === "spark" ? 1.2 : 0.35);
      const driftY = Math.cos(time * 0.001 + particle.phase) * 0.35;
      const attract = particle.kind === "spark" ? 0.025 : 0.052;
      particle.x += (particle.tx + driftX - particle.x) * attract;
      particle.y += (particle.ty + driftY - particle.y) * attract;
    }
    const flicker = particle.kind === "spark"
      ? 0.5 + Math.abs(Math.sin(time * 0.004 + particle.phase)) * 0.5
      : 0.78 + Math.sin(time * 0.002 + particle.phase) * 0.22;
    context!.globalAlpha = particle.alpha * flicker; context!.fillStyle = particle.color;
    context!.shadowColor = particle.color; context!.shadowBlur = particle.kind === "petal" ? 10 : 7;
    context!.beginPath(); context!.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); context!.fill();
  });
  context.globalAlpha = 1; context.shadowBlur = 0; animationFrame = requestAnimationFrame(draw);
};

onMounted(() => { resize(); window.addEventListener("resize", resize); animationFrame = requestAnimationFrame(draw); });
onBeforeUnmount(() => { window.removeEventListener("resize", resize); cancelAnimationFrame(animationFrame); });
</script>

<style lang="scss" scoped>
.rose-page { position: relative; min-height: calc(100vh - 50px); overflow: hidden; padding: 52px clamp(22px, 5vw, 84px) 36px; color: #fff; background: #0c0714; isolation: isolate; }
.ambient { position: absolute; width: 430px; height: 430px; border-radius: 50%; filter: blur(90px); opacity: .18; pointer-events: none; z-index: -1; }
.ambient-one { top: -220px; left: 14%; background: #e52c63; }
.ambient-two { right: 4%; bottom: -240px; background: #6a3bff; }
.rose-header { position: relative; z-index: 1; text-align: center; }
.eyebrow { margin: 0 0 12px; color: #ff8da6; font-size: 11px; letter-spacing: .18em; }
h1 { margin: 0; font-size: clamp(30px, 5vw, 56px); letter-spacing: .08em; text-shadow: 0 0 28px rgba(255, 49, 95, .55); }
.subtitle { margin: 12px 0 0; color: rgba(255, 255, 255, .62); font-size: 15px; }
.rose-stage { position: relative; width: min(100%, 1040px); height: min(68vh, 620px); min-height: 390px; margin: 28px auto 0; overflow: hidden; border: 1px solid rgba(255, 121, 151, .2); border-radius: 24px; background: radial-gradient(circle at 50% 43%, rgba(112, 28, 58, .25), transparent 48%); box-shadow: inset 0 0 80px rgba(255, 61, 111, .06), 0 20px 80px rgba(0, 0, 0, .25); }
canvas { display: block; width: 100%; height: 100%; cursor: pointer; touch-action: manipulation; }
.stage-caption { position: absolute; right: 22px; bottom: 18px; display: flex; align-items: center; gap: 8px; color: rgba(255, 255, 255, .55); font-size: 12px; }
.pulse-dot { width: 7px; height: 7px; border-radius: 50%; background: #ff315f; box-shadow: 0 0 12px #ff315f; animation: pulse 1.4s ease-in-out infinite; }
@keyframes pulse { 50% { transform: scale(1.5); opacity: .45; } }
@media (max-width: 640px) { .rose-page { padding: 34px 14px 22px; } .rose-stage { height: 58vh; min-height: 330px; border-radius: 18px; } .stage-caption { right: 14px; bottom: 12px; } }
</style>
