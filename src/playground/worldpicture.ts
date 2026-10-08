import { dashedLine, dot, el, label, palette, roundRect } from './ui.js';

/**
 * "What you see" is not "what you measure."
 *
 * Hughes & Kersting (2024) identify this conflation as the single most
 * pervasive misconception in relativity teaching: the time-dilation and
 * length-contraction equations describe a coordinate *measurement*, not a
 * photograph. Observers do not see a dilated clock or a squashed rod.
 *
 * This panel draws the world-picture — what an outsider's eye actually
 * receives — so it can be set beside the world-map and the gap becomes
 * visible rather than argued about.
 *
 * Physics: light reaching Ana's eye has to travel from the ship to her, so
 * she receives flashes at a Doppler-shifted rate, not at the rate they were
 * emitted. The path she *assigns* to that light is the zigzag on the
 * neighbouring world-map panel; the light itself is never drawn for her eye
 * as a shape.
 */

/** Apparent flash rate as an outsider sees it: f' = f√((1−β)/(1+β)) for recession. */
function observedFlashRate(beta: number, emittedPerTick: number): number {
  return emittedPerTick * Math.sqrt((1 - beta) / (1 + beta));
}

export function worldPictureLightClock(beta: number, phase: number): HTMLElement {
  const canvas = el('canvas', {
    class: 'canvas-mid',
    'aria-label': 'What an outsider actually sees: flashes, not a path',
  });

  // Redraw on demand; the animation is owned by the light-clock module, which
  // calls this each frame via the returned redraw hook.
  let draw = (): void => {};

  const redraw = (redrawBeta: number, redrawPhase: number): void => {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w < 2 || h < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    // Ana's eye sits at the left edge; the ship recedes to the right and
    // shrinks, which is the only cue she has that it is moving away.
    const eyeX = w * 0.12;
    const eyeY = h * 0.5;
    const b = redrawBeta;
    const shrink = 1 / (1 + b * 2.2);

    // Light from the ship arrives along these lines. They are straight,
    // because nothing tells her the beam bent.
    const shipCentreX = eyeX + (w - eyeX) * 0.52;
    const halfH = h * 0.2 * shrink;

    for (const y of [eyeY - halfH, eyeY + halfH]) {
      dashedLine(ctx, eyeX, eyeY, shipCentreX, y, palette.gridSoft, [3, 5]);
    }

    // Ana's eye
    dot(ctx, eyeX, eyeY, 5, palette.home);
    label(ctx, 'Ana’s eye', eyeX, eyeY + 26, palette.home, 11, 'center');

    // The receding ship, drawn as she perceives it: small, no zigzag inside
    const boxW = Math.max(10, 26 * shrink);
    const boxH = halfH * 2;
    const boxX = shipCentreX - boxW / 2;
    const boxY = eyeY - halfH;

    ctx.save();
    roundRect(ctx, boxX, boxY, boxW, boxH, 4);
    ctx.fillStyle = 'rgba(53, 214, 240, 0.08)';
    ctx.fill();
    ctx.strokeStyle = palette.ship;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // The flash. Emitted once per tick, but she receives them at the shifted
    // rate — so the flash brightness pulses at the observed rate, not the
    // emitted one. That mismatch is the whole point.
    const emitted = redrawPhase * 2;
    const isTop = emitted % 2 < 1;
    const flashX = boxX + boxW / 2;
    const flashY = isTop ? boxY : boxY + boxH;

    const glow = ctx.createRadialGradient(flashX, flashY, 0, flashX, flashY, 18 * shrink + 4);
    glow.addColorStop(0, 'rgba(169, 139, 255, 0.95)');
    glow.addColorStop(1, 'rgba(169, 139, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(flashX, flashY, 18 * shrink + 4, 0, Math.PI * 2);
    ctx.fill();
    dot(ctx, flashX, flashY, 3.5 * shrink + 1.2, palette.light);

    // Arriving pulse heading back to her eye
    const arrival = observedFlashRate(b, 1);
    const travel = (redrawPhase * 2 * arrival) % 1;
    const ax = flashX + (eyeX - flashX) * travel;
    const ay = flashY + (eyeY - flashY) * travel;
    dot(ctx, ax, ay, 2.2, palette.light);

    label(
      ctx,
      'she sees a flash, not a line',
      w * 0.52,
      h * 0.13,
      palette.text,
      12,
      'center',
      600,
    );
    label(
      ctx,
      `flashes arrive ${num2(observedFlashRate(b, 1))}× as often as they happen`,
      w * 0.52,
      h * 0.13 + 17,
      palette.dim,
      11,
      'center',
    );
    label(
      ctx,
      'no beam is ever traced for her',
      w * 0.52,
      h * 0.92,
      palette.faint,
      10,
      'center',
    );
  };

  draw = () => redraw(beta, phase);
  draw();

  return el('div', { class: 'frame' }, [
    el('p', { class: 'frame-title' }, [
      el('span', { class: 'swatch', style: `background:${palette.light}` }),
      'What Ana actually sees',
    ]),
    el('p', { class: 'frame-note' }, [
      'Not the zigzag. A beam of light is not something an eye can trace — she receives ',
      'flashes, slightly reddened because the ship is receding.',
    ]),
    canvas,
  ]);
}

function num2(value: number): string {
  return value.toFixed(2);
}
