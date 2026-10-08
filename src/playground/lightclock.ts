import { C, lorentzFactor } from '../relativity.js';
import { predictionPrompt } from './poe.js';
import { worldPictureLightClock } from './worldpicture.js';
import {
  checkbox,
  dashedLine,
  dot,
  el,
  frag,
  label,
  line,
  num,
  onTick,
  palette,
  playback,
  roundRect,
  slider,
  surface,
} from './ui.js';

/**
 * The light clock: the mechanism behind time dilation.
 *
 * A photon bounces between two mirrors held L apart. The clock "ticks" every
 * time the photon hits a mirror. Working in units where L = c = 1, one tick
 * takes 2 units of ship time and 2*gamma units of Earth time — and the only
 * reason is that the light's path is geometrically longer for an outside
 * observer, while light still travels at c for both of them.
 */

const MAX_BETA = 0.99;

export function lightClock(): HTMLElement {
  let beta = 0.6;
  let showGhost = true;
  let phase = 0;
  let poeChosen = false;

  const shipCanvas = el('canvas', { 'aria-label': 'The light clock seen from inside the ship' });
  const earthCanvas = el('canvas', { 'aria-label': 'The same light clock seen from Earth' });
  const shipClock = el('span', { class: 'stat-value' }, ['0.00']);
  const earthClock = el('span', { class: 'stat-value' }, ['0.00']);
  const ratioRead = el('span', { class: 'slider-value' }, ['1.25']);

  const shipSurface = surface(shipCanvas);
  const earthSurface = surface(earthCanvas);

  // The third panel: what Ana's eye actually receives. Redrawn each frame from
  // the same phase as the other two so the three stay in step.
  const seenPanel = worldPictureLightClock(beta, phase);
  const seenCanvas = seenPanel.querySelector('canvas');
  const seenCtx = seenCanvas ? surface(seenCanvas).ctx : null;
  const redrawSeen = (): void => {
    if (!seenCtx || !seenCanvas) return;
    const w = seenCanvas.getBoundingClientRect().width;
    const h = seenCanvas.getBoundingClientRect().height;
    if (w < 2 || h < 2) return;
    seenCtx.clearRect(0, 0, w, h);
    drawSeenScene(seenCtx, w, h, beta, phase);
  };

  const speed = slider(
    {
      label: 'Ship speed',
      min: 0.01,
      max: MAX_BETA,
      step: 0.01,
      value: beta,
      display: (v) => `${num(v * 100, 0)}% of light`,
      hint: 'Held at or below 99% so both drawings stay at true proportions.',
    },
    (v) => {
      beta = v;
      update();
    },
  );

  const ghost = checkbox('Show where the ship ends up', true, (v) => {
    showGhost = v;
  });

  // Built as a helper so each readout is captured directly. Indexing
  // querySelectorAll here is how a one-off edit silently breaks every module.
  const stat = (name: string, initial: string): { row: HTMLElement; value: HTMLElement } => {
    const value = el('span', { class: 'stat-value' }, [initial]);
    return {
      row: el('div', { class: 'stat' }, [el('span', { class: 'stat-label' }, [name]), value]),
      value,
    };
  };

  const shipPath = stat('Light path, ship', '2 L');
  const earthPath = stat('Light path, Earth', '2.50 L');
  const earthPerTick = stat('Earth time per tick', '2.50 units');
  const meters = el('div', { class: 'stats' }, [shipPath.row, earthPath.row, earthPerTick.row]);

  function update(): void {
    const gamma = lorentzFactor(beta * C);
    ratioRead.textContent = `${num(gamma, 2)}×`;
    earthPath.value.textContent = `${num(2 * gamma, 2)} L`;
    earthPerTick.value.textContent = `${num(2 * gamma, 2)} units`;
    earthClock.textContent = num(earthTime, 2);
    shipClock.textContent = num(shipTime, 2);
    void 0;
    phase = phase % 1;
  }

  let earthTime = 0;
  let shipTime = 0;

  /** What the outsider receives: flashes and straight arrival lines, no path. */
  function drawSeenScene(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    b: number,
    ph: number,
  ): void {
    const eyeX = w * 0.13;
    const eyeY = h * 0.5;
    const shrink = 1 / (1 + b * 2.2);
    const shipX = eyeX + (w - eyeX) * 0.54;
    const halfH = h * 0.2 * shrink;

    for (const y of [eyeY - halfH, eyeY + halfH]) {
      dashedLine(ctx, eyeX, eyeY, shipX, y, palette.gridSoft, [3, 5]);
    }

    dot(ctx, eyeX, eyeY, 5, palette.home);
    label(ctx, "Ana's eye", eyeX, eyeY + 28, palette.home, 11, 'center');

    const boxW = Math.max(10, 26 * shrink);
    const boxH = halfH * 2;
    const boxX = shipX - boxW / 2;
    const boxY = eyeY - halfH;

    ctx.save();
    roundRect(ctx, boxX, boxY, boxW, boxH, 4);
    ctx.fillStyle = 'rgba(53, 214, 240, 0.08)';
    ctx.fill();
    ctx.strokeStyle = palette.ship;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // Flash emitted once per tick; received at a Doppler-shifted rate.
    const emitted = ph * 2;
    const isTop = emitted % 2 < 1;
    const flashX = boxX + boxW / 2;
    const flashY = isTop ? boxY : boxY + boxH;
    const glowR = 18 * shrink + 4;
    const glow = ctx.createRadialGradient(flashX, flashY, 0, flashX, flashY, glowR);
    glow.addColorStop(0, 'rgba(169, 139, 255, 0.95)');
    glow.addColorStop(1, 'rgba(169, 139, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(flashX, flashY, glowR, 0, Math.PI * 2);
    ctx.fill();
    dot(ctx, flashX, flashY, 3.5 * shrink + 1.2, palette.light);

    // The arriving pulse, still a straight line back to her eye.
    const arrivalRate = Math.sqrt((1 - b) / (1 + b));
    const travel = (ph * 2 * arrivalRate) % 1;
    dot(ctx, flashX + (eyeX - flashX) * travel, flashY + (eyeY - flashY) * travel, 2.4, palette.light);

    label(ctx, 'she sees a flash, never a line', w * 0.53, h * 0.14, palette.text, 12, 'center', 600);
    label(
      ctx,
      `flashes arrive ${num(Math.sqrt((1 - b) / (1 + b)), 2)}\u00d7 as often as they happen`,
      w * 0.53,
      h * 0.14 + 17,
      palette.dim,
      11,
      'center',
    );
    label(ctx, 'the ship only gets smaller', w * 0.53, h * 0.9, palette.faint, 10, 'center');
  }

  /** Shared geometry: one world-unit of tube length, in CSS pixels. */
  function unit(panelHeight: number, panelWidth: number): number {
    const maxByHeight = panelHeight * 0.6;
    const legSpan = Math.max(beta * lorentzFactor(beta * C), 1e-6);
    const maxByWidth = (panelWidth * 0.78) / (2 * legSpan);
    return Math.max(6, Math.min(maxByHeight, maxByWidth));
  }

  function drawShipFrame(): void {
    const { ctx } = shipSurface;
    const w = shipCanvas.getBoundingClientRect().width;
    const h = shipCanvas.getBoundingClientRect().height;
    ctx.clearRect(0, 0, w, h);

    const L = unit(h, w);
    const tubeW = Math.min(40, L * 0.62);
    const cx = w / 2;
    const bottom = h * 0.78;
    const top = bottom - L;
    const pulse = phase < 0.5 ? phase * 2 : 2 - phase * 2;

    // Tube body
    ctx.save();
    roundRect(ctx, cx - tubeW / 2, top, tubeW, L, 6);
    ctx.fillStyle = 'rgba(53, 214, 240, 0.07)';
    ctx.fill();
    ctx.strokeStyle = palette.ship;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Mirrors
    ctx.fillStyle = palette.ship;
    roundRect(ctx, cx - tubeW / 2 - 6, top - 4, tubeW + 12, 5, 2);
    ctx.fill();
    roundRect(ctx, cx - tubeW / 2 - 6, bottom - 1, tubeW + 12, 5, 2);
    ctx.fill();

    // Photon
    dot(ctx, cx, bottom - L * pulse, 5.5, palette.light);

    // Trajectory: straight up and down
    line(ctx, cx, top, cx, bottom, palette.light, 2);

    // Measurement: 2L
    const mx = cx + tubeW / 2 + 20;
    line(ctx, mx, top, mx, bottom, palette.dim, 1);
    line(ctx, mx - 4, top, mx + 4, top, palette.dim, 1);
    line(ctx, mx - 4, bottom, mx + 4, bottom, palette.dim, 1);
    label(ctx, 'L', mx + 8, (top + bottom) / 2, palette.dim, 11);

    label(ctx, 'ship is at rest', cx, h - 14, palette.faint, 11, 'center');
    label(ctx, `1 tick = 2 L/c`, cx, h * 0.14, palette.ship, 12, 'center', 600);
  }

  function drawEarthFrame(): void {
    const { ctx } = earthSurface;
    const w = earthCanvas.getBoundingClientRect().width;
    const h = earthCanvas.getBoundingClientRect().height;
    ctx.clearRect(0, 0, w, h);

    const gamma = lorentzFactor(beta * C);
    const L = unit(h, w);
    const tubeW = Math.min(40, L * 0.62);
    const legShift = beta * gamma * L;
    const originX = w / 2 - legShift;
    const bottom = h * 0.78;
    const top = bottom - L;

    const tubeAt = (x: number): void => {
      ctx.save();
      roundRect(ctx, x - tubeW / 2, top, tubeW, L, 6);
      ctx.strokeStyle = palette.ship;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = palette.ship;
      roundRect(ctx, x - tubeW / 2 - 6, top - 4, tubeW + 12, 5, 2);
      ctx.fill();
      roundRect(ctx, x - tubeW / 2 - 6, bottom - 1, tubeW + 12, 5, 2);
      ctx.fill();
    };

    // The sawtooth the light traces. Two legs per tick.
    const leg = Math.floor(phase * 2);
    const f = phase * 2 - leg;
    const xa = originX + leg * legShift;
    const ya = leg % 2 === 0 ? bottom : top;
    const yb = leg % 2 === 0 ? top : bottom;
    const photonX = xa + f * legShift;
    const photonY = ya + (yb - ya) * f;

    // Upcoming part of this leg
    dashedLine(ctx, xa, ya, xa + legShift, yb, palette.dim, [3, 4]);

    // Completed leg
    line(ctx, xa, ya, photonX, photonY, palette.light, 2.5);
    dot(ctx, photonX, photonY, 5.5, palette.light);

    // Previous legs, fading back
    for (let back = 1; back <= 2; back++) {
      const idx = leg - back;
      if (idx < 0) continue;
      const px = originX + idx * legShift;
      const py = idx % 2 === 0 ? bottom : top;
      const nx = originX + (idx + 1) * legShift;
      const ny = idx % 2 === 0 ? top : bottom;
      ctx.save();
      ctx.globalAlpha = back === 1 ? 0.28 : 0.14;
      line(ctx, px, py, nx, ny, palette.light, 2);
      ctx.restore();
    }

    tubeAt(originX);
    if (showGhost) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      tubeAt(originX + 2 * legShift);
      ctx.restore();
      // Ship displacement across one tick
      const ay = bottom + 20;
      line(ctx, originX, ay, originX + 2 * legShift, ay, palette.dim, 1.5);
      line(ctx, originX, ay - 4, originX, ay + 4, palette.dim, 1.5);
      line(ctx, originX + 2 * legShift, ay - 4, originX + 2 * legShift, ay + 4, palette.dim, 1.5);
      label(
        ctx,
        'ship moved while the light bounced',
        originX + legShift,
        ay + 14,
        palette.dim,
        11,
        'center',
      );
    }

    label(ctx, `1 tick = 2γL/c  =  ${num(2 * gamma, 2)} L/c`, w / 2, h * 0.14, palette.ship, 12, 'center', 600);
  }

  const clocks = el('div', { class: 'stats' }, [
    el('div', { class: 'stat' }, [el('span', { class: 'stat-label' }, ['Earth clock']), earthClock]),
    el('div', { class: 'stat' }, [el('span', { class: 'stat-label' }, ['Ship clock']), shipClock]),
    el('div', { class: 'stat' }, [
      el('span', { class: 'stat-label' }, ['Earth ticks per ship tick']),
      ratioRead,
    ]),
  ]);

  const play = playback();

  onTick((_now, dt) => {
    // Until the student commits to a prediction, the animation waits. POE only
    // works if the prediction genuinely precedes the observation.
    const advance = poeChosen ? (play.isPlaying() ? dt : play.consumeStep() ? 1 / 60 : 0) : 0;
    phase = (phase + advance / 1.7) % 1;
    earthTime += advance;
    shipTime += advance / lorentzFactor(beta * C);
    if (earthTime > 999) {
      earthTime = 0;
      shipTime = 0;
    }
    earthClock.textContent = num(earthTime, 2);
    shipClock.textContent = num(shipTime, 2);
    void 0;
    drawShipFrame();
    drawEarthFrame();
    redrawSeen();
  });

  const poe = predictionPrompt({
    question:
      'You watch the Wayfarer go past at 60% of light. The clock inside is a good clock. ' +
      'When you read it later, alongside a copy you kept:',
    options: [
      {
        label: 'The ship\u2019s clock has fallen behind mine.',
        correct: true,
        why:
          'Right, and the reverse is equally true: from inside, your own clock looks behind ' +
          'the ship\u2019s. Neither clock is broken. They disagree about how much time passed, ' +
          'and no experiment either can run will settle it, because every experiment they can ' +
          'perform has to travel by light.',
      },
      {
        label: 'Both clocks show the same time — they are identical clocks.',
        correct: false,
        why:
          'This is the classical expectation, and it is what makes relativity surprising. ' +
          'Identical clocks only agree when the two observers stay in one frame. Ana and the ' +
          'ship are in different frames, and that is exactly what breaks the agreement.',
      },
      {
        label: 'The ship\u2019s clock runs faster, because time dilation is a property of motion itself.',
        correct: false,
        why:
          'Time dilation is not a property that motion imposes on a clock. It is what two ' +
          'observers in different frames must agree about. From the ship\u2019s own frame the ' +
          'ship\u2019s clock runs perfectly normally.',
      },
      {
        label: 'Whichever clock is moving more slowly runs slower, and the ship is moving.',
        correct: false,
        why:
          'Very close, and this is the single most common misconception. It privileges one ' +
          'frame as the true one and calls the other distorted. There is no such frame. Ana ' +
          'is equally "moving" relative to the ship, and the same symmetry applies to her clock.',
      },
    ],
    takeaway:
      'Nobody sees their own clock misbehave. Every observer measures the other one as slow, ' +
      'and every one of them is doing correct physics.',
  });

  play.lock('Answer the question above to start the animation.');
  poe.root.addEventListener('click', () => {
    poeChosen = true;
    play.lock(null);
  });

  update();

  return el('section', { class: 'panel' }, [
    el('div', { class: 'panel-head' }, [
      el('h3', { class: 'panel-title' }, ['One clock, three views']),
      el('p', { class: 'panel-sub' }, [
        frag([
          'You are aboard the Wayfarer, outbound from Earth at the speed below. ',
          'Ana is back in the hangar watching you go. One clock, three views.',
        ]),
      ]),
    ]),
    el('div', { class: 'panel-body' }, [poe.root]),
    el('div', { class: 'frame-pair' }, [
      el('div', { class: 'frame' }, [
        el('p', { class: 'frame-title' }, [
          el('span', { class: 'swatch', style: `background:${palette.ship}` }),
          'Looking along with you',
        ]),
        el('p', { class: 'frame-note' }, [
          'You are standing still relative to the Wayfarer, so the beam just bounces straight up and down.',
        ]),
        shipCanvas,
      ]),
      el('div', { class: 'frame' }, [
        el('p', { class: 'frame-title' }, [
          el('span', { class: 'swatch', style: `background:${palette.light}` }),
          'Looking down from the hangar',
        ]),
        el('p', { class: 'frame-note' }, [
          'Ana watches the whole ship slide past, so the beam has to chase a target that is running away.',
        ]),
        earthCanvas,
      ]),
      seenPanel,
    ]),
    el('div', { class: 'map-legend' }, [
      el('span', { html: '<b>Left two panels are a world-map</b> — a coordinate measurement, drawn with rulers and clocks.' }),
      el('span', { html: '<b>Right panel is a world-picture</b> — what a camera would receive.' }),
      el('span', { html: 'The equations describe the map. Nobody sees the map.' }),
    ]),
    el('div', { class: 'panel-body' }, [clocks, meters]),
    el('div', { class: 'controls' }, [speed.root, ghost.root, play.root]),
  ]);
}