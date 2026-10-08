import { onTick } from './ui.js';

/**
 * Ambient starfield behind the whole page.
 *
 * Deliberately quiet: a few hundred points of light in three parallax layers,
 * drifting slowly enough to sit under the text rather than compete with it,
 * plus two very soft colour washes. Everything here is decorative and sits
 * behind `pointer-events: none` markup, so it costs nothing in interaction and
 * disappears entirely for readers who prefer reduced motion.
 */

interface Star {
  /** Position in a unit square, so the field reflows on resize. */
  x: number;
  y: number;
  /** Radius in CSS pixels. */
  r: number;
  /** 0 = far, 2 = near. Drives both size and parallax rate. */
  layer: 0 | 1 | 2;
  /** Base opacity before twinkle. */
  alpha: number;
  /** Twinkle phase and rate, so the field never pulses in unison. */
  phase: number;
  rate: number;
  /** Slight colour cast so the field is not uniformly white. */
  tint: string;
}

const LAYER_COUNT = 3;

const FAR_TINTS = ['rgba(214, 226, 255, 1)', 'rgba(196, 210, 245, 1)'] as const;
const MID_TINTS = ['rgba(255, 246, 232, 1)', 'rgba(214, 226, 255, 1)'] as const;
const NEAR_TINTS = [
  'rgba(214, 226, 255, 1)',
  'rgba(255, 244, 228, 1)',
  'rgba(186, 214, 255, 1)',
] as const;

/** Density is tuned so a wide screen does not read as noise. */
const STARS_PER_LAYER = [110, 70, 34] as const;
const FALLBACK_TINT = 'rgba(214, 226, 255, 1)';

/** Horizontal drift in CSS pixels per second, per layer. */
const DRIFT = [1.1, 2.4, 4.6] as const;

/** Parallax factor against page scroll, per layer. */
const PARALLAX = [0.012, 0.028, 0.055] as const;

const TINTS_BY_LAYER = { 0: FAR_TINTS, 1: MID_TINTS, 2: NEAR_TINTS } as const;

function makeStar(layer: 0 | 1 | 2): Star {
  const tints: readonly string[] = TINTS_BY_LAYER[layer];
  return {
    x: Math.random(),
    y: Math.random(),
    r: layer === 0 ? 0.5 + Math.random() * 0.5 : layer === 1 ? 0.7 + Math.random() * 0.7 : 1 + Math.random() * 1.1,
    layer,
    alpha: layer === 0 ? 0.16 + Math.random() * 0.2 : layer === 1 ? 0.3 + Math.random() * 0.3 : 0.55 + Math.random() * 0.4,
    phase: Math.random() * Math.PI * 2,
    rate: 0.4 + Math.random() * 1.4,
    tint: tints[Math.floor(Math.random() * tints.length)] ?? FALLBACK_TINT,
  };
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Mounts the backdrop. Safe to call once; returns a teardown function.
 */
export function installStarfield(): () => void {
  const canvas = document.createElement('canvas');
  canvas.className = 'starfield';
  // Decorative only: never intercepts clicks or drags over the article text.
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);

  const context = canvas.getContext('2d');
  if (!context) return () => canvas.remove();
  const ctx: CanvasRenderingContext2D = context;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let stars: Star[] = [];

  function build(): void {
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = { w: window.innerWidth, h: window.innerHeight };
    dpr = nextDpr;
    width = rect.w;
    height = rect.h;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Scale the count with area so a phone doesn't get desktop density.
    const area = (width * height) / (1440 * 900);
    const factor = Math.min(1.6, Math.max(0.45, Math.sqrt(area)));

    stars = [];
    for (let layer = 0; layer < LAYER_COUNT; layer++) {
      const count = Math.round((STARS_PER_LAYER[layer] ?? 0) * factor);
      for (let i = 0; i < count; i++) stars.push(makeStar(layer as 0 | 1 | 2));
    }
  }

  function draw(elapsed: number, scrollY: number): void {
    ctx.clearRect(0, 0, width, height);

    for (const star of stars) {
      const layer = star.layer;
      // Drift, wrapping at the right edge so the field never empties out.
      const drift = (elapsed * DRIFT[layer]) % (width + 80);
      let x = (star.x * (width + 80) - drift + width + 80) % (width + 80);
      x -= 40;
      const y = star.y * height - scrollY * PARALLAX[layer] * 0.35;

      // Wrap vertically over a long scroll rather than popping.
      const wrappedY = ((y % (height + 200)) + height + 200) % (height + 200) - 100;

      // Twinkle. Reduced motion holds this at its base value.
      const twinkle = 1 + Math.sin(elapsed * star.rate + star.phase) * 0.28;
      const opacity = Math.max(0, Math.min(1, star.alpha * twinkle));

      ctx.globalAlpha = opacity;
      ctx.fillStyle = star.tint;
      ctx.beginPath();
      ctx.arc(x, wrappedY, star.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  build();

  const reduced = prefersReducedMotion();
  let elapsed = 0;
  let scrollY = window.scrollY;

  const onScroll = (): void => {
    scrollY = window.scrollY;
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  let resizeHandle = 0;
  const onResize = (): void => {
    window.clearTimeout(resizeHandle);
    resizeHandle = window.setTimeout(() => {
      build();
      if (reduced) draw(0, window.scrollY);
    }, 150);
  };
  window.addEventListener('resize', onResize);

  // Reduced motion: one static frame, then stop. No ticker at all.
  if (reduced) {
    draw(0, window.scrollY);
  } else {
    onTick((_now, dt) => {
      elapsed += dt;
      draw(elapsed, scrollY);
    });
  }

  return () => {
    canvas.remove();
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    window.clearTimeout(resizeHandle);
  };
}