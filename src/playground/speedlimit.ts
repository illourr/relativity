import { C, beta as toBeta, kineticEnergy, velocityAddition } from '../relativity.js';
import {
  dot,
  el,
  frag,
  label,
  line,
  num,
  palette,
  percentOfC,
  roundRect,
  slider,
  surface,
} from './ui.js';

/**
 * Why light speed is a wall rather than a goalpost you can push past.
 *
 * Two reasons, stacked. Velocities compose in a way that cannot exceed c, and
 * the energy needed to approach c grows without bound. The first is
 * geometric; the second is why a rocket cannot cheat the first.
 */

export function speedLimit(): HTMLElement {
  // Ana and the Wayfarer, relabelled: the two observers below are the same two
  // people from the rest of the page, so no new cast is introduced here.
  let betaA = 0.9;
  let probe = 0.5;

  const framesCanvas = el('canvas', {
    class: 'canvas-wide',
    'aria-label': 'The same ship measured as faster or slower depending on the observer',
  });
  const framesCtx = surface(framesCanvas).ctx;

  const energyCanvas = el('canvas', {
    class: 'canvas-wide',
    'aria-label': 'Energy to accelerate one kilogram, relativistic versus Newtonian',
  });
  const energyCtx = surface(energyCanvas, drawEnergy).ctx;

  const labRead = el('span', { class: 'stat-value' }, ['—']);
  const seenRead = el('span', { class: 'stat-value' }, ['—']);
  const classicalRead = el('span', { class: 'stat-value' }, ['—']);
  const energyRead = el('span', { class: 'stat-value' }, ['—']);
  const verdict = el('p', { class: 'punchline' }, ['']);

  /**
   * Speed at which observer A sees the probe ship move, in metres per second —
   * the unit every function in the relativity module works in.
   */
  const seenSpeed = (): number => Math.abs(velocityAddition(probe * C, -betaA * C));

  /** Display helper: metres per second to a percent of light. */
  const asPercent = (metresPerSecond: number): string => percentOfC(toBeta(metresPerSecond));

  function drawLanes(): void {
    const w = framesCanvas.getBoundingClientRect().width;
    const h = framesCanvas.getBoundingClientRect().height;
    if (w < 2 || h < 2) return;
    framesCtx.clearRect(0, 0, w, h);

    const seen = seenSpeed();
    const lanes: ReadonlyArray<{ title: string; accent: string; note: string }> = [
      {
        title: 'Ana’s frame — she is standing still in the hangar',
        accent: palette.home,
        note: `Wayfarer measured at ${percentOfC(probe)}`,
      },
      {
        title: 'Wayfarer’s frame — the ship is at rest',
        accent: palette.ship,
        note: `Wayfarer measured at ${asPercent(seen)}`,
      },
    ];

    const laneH = h * 0.3;
    lanes.forEach((lane, index) => {
      const y = h * 0.2 + index * (laneH + h * 0.12);

      // Lane bed
      roundRect(framesCtx, w * 0.04, y, w * 0.92, laneH, 8);
      framesCtx.save();
      framesCtx.fillStyle = 'rgba(10, 12, 18, 0.7)';
      framesCtx.fill();
      framesCtx.restore();

      // Static reference marks along the lane.
      framesCtx.save();
      framesCtx.strokeStyle = palette.grid;
      framesCtx.lineWidth = 1;
      for (let i = 0; i < 14; i++) {
        const x = w * 0.06 + (i * w * 0.92) / 13;
        framesCtx.beginPath();
        framesCtx.moveTo(x, y + laneH * 0.18);
        framesCtx.lineTo(x, y + laneH * 0.82);
        framesCtx.stroke();
      }
      framesCtx.restore();

      label(framesCtx, lane.title, w * 0.07, y - 10, lane.accent, 11, 'left', 600);

      // The ship sits at a fixed position. It used to drift continuously,
      // which conveyed nothing except that something was moving — the whole
      // point of the panel is the two speed labels, not the travel.
      const markerX = w * 0.34;
      const shipY = y + laneH * 0.5;
      drawShip(framesCtx, markerX, shipY, lane.accent);
      label(framesCtx, lane.note, w * 0.89, y - 10, palette.text, 11, 'right', 600);
      label(framesCtx, 'Wayfarer', markerX, shipY + laneH * 0.34, palette.dim, 10, 'center');
    });

    label(
      framesCtx,
      'one ship, one moment, two honest answers',
      w * 0.5,
      h * 0.94,
      palette.text,
      12,
      'center',
      600,
    );
  }

  function drawShip(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + 16, y);
    ctx.lineTo(x - 8, y - 8);
    ctx.lineTo(x - 4, y);
    ctx.lineTo(x - 8, y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawEnergy(ctx: CanvasRenderingContext2D): void {
    const w = energyCanvas.getBoundingClientRect().width;
    const h = energyCanvas.getBoundingClientRect().height;
    if (w < 2 || h < 2) return;
    ctx.clearRect(0, 0, w, h);

    const padL = 54;
    const padR = 14;
    const padT = 42;
    const padB = 28;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const baseY = h - padB;
    const maxRel = kineticEnergy(1, 0.999 * C);
    const logMax = Math.log10(maxRel + 1);

    line(ctx, padL, padT, padL, baseY, palette.grid, 1);
    line(ctx, padL, baseY, w - padR, baseY, palette.grid, 1);
    for (let dec = 0; dec <= 16; dec += 2) {
      const y = baseY - (dec / 16) * plotH;
      label(ctx, `10${sup(dec)}`, padL - 6, y, palette.faint, 10, 'right');
    }

    const curve = (fn: (b: number) => number, color: string, width: number, dashed: boolean): void => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      if (dashed) ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let i = 0; i <= 240; i++) {
        const b = i / 240;
        const x = padL + b * plotW;
        const y = baseY - (Math.log10(fn(b) + 1) / logMax) * plotH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    };

    curve((b) => 0.5 * (b * C) ** 2, palette.faint, 2, true);
    curve((b) => kineticEnergy(1, b * C), palette.ship, 2.5, false);

    // Current probe speed
    const x = padL + probe * plotW;
    const yRel = baseY - (Math.log10(kineticEnergy(1, probe * C) + 1) / logMax) * plotH;
    const yClass = baseY - (Math.log10(0.5 * (probe * C) ** 2 + 1) / logMax) * plotH;
    line(ctx, x, baseY, x, yRel, palette.ship, 1);
    dot(ctx, x, yRel, 4, palette.ship);
    dot(ctx, x, yClass, 4, palette.faint);
    label(ctx, percentOfC(probe), x, baseY + 14, palette.text, 10, 'center');

    // Legend
    const legend: ReadonlyArray<[string, string]> = [
      ['solid — Einstein', palette.ship],
      ['dashed — Newton', palette.faint],
    ];
    legend.forEach(([text, color], i) => {
      const ly = padT - 24 + i * 16;
      line(ctx, padL, ly, padL + 18, ly, color, i === 0 ? 2.5 : 2);
      label(ctx, text, padL + 24, ly, palette.dim, 11);
    });

    label(ctx, 'kinetic energy of 1 kg, log scale', padL + plotW / 2, h - 8, palette.faint, 10, 'center');
  }

  function update(): void {
    const seen = seenSpeed();
    const classical = Math.abs(probe + betaA);
    const relativistic = Math.abs(velocityAddition(probe * C, betaA * C));

    labRead.textContent = percentOfC(probe);
    seenRead.textContent = asPercent(seen);
    classicalRead.textContent = `${num(classical * 100, 1)}% of light`;
    energyRead.textContent = `${kineticEnergy(1, probe * C).toExponential(2)} J`;

    verdict.textContent =
      classical > 1
        ? `Newton would add these and get ${num(classical * 100, 0)}% of light — straight over ` +
          `the wall. The relativistic sum is ${asPercent(relativistic)}, and it cannot exceed ` +
          `light no matter which speeds you feed it.`
        : `Still below the wall, so the two answers are closer together. Push both speeds up ` +
          `and Newton sails past light while Einstein cannot.`;

    drawLanes();
    drawEnergy(energyCtx);
  }

  const sliderA = slider(
    {
      label: 'Ana’s speed past the ship',
      min: 0.01,
      max: 0.99,
      step: 0.01,
      value: betaA,
      display: percentOfC,
    },
    (v) => {
      betaA = v;
      update();
    },
  );

  const sliderProbe = slider(
    {
      label: 'Wayfarer’s speed',
      min: 0.01,
      max: 0.99,
      step: 0.01,
      value: probe,
      display: percentOfC,
      hint: 'The same Wayfarer in both lanes. Only the observer changes.',
    },
    (v) => {
      probe = v;
      update();
    },
  );

  const wallNote = el('div', { class: 'note note-caution' }, [
    el('strong', {}, ['The energy curve is the reason, not the decoration.']),
    el('p', { class: 'prose', style: 'margin:0.6rem 0 0' }, [
      frag([
        'Velocity addition keeps speeds under light, but on its own that would not stop a rocket. ',
        'The binding constraint is the dashed curve’s absence: Newtonian energy stays finite at ',
        'any speed, so Newtonian physics never objected to going faster and faster. Relativistic ',
        'energy grows without bound as you approach light, so there is always another push needed ',
        'and never a finite push that finishes the job. The wall is not a sign. It is the price list.',
      ]),
    ]),
  ]);

  const stats = el('div', { class: 'stats' }, [
    el('div', { class: 'stat' }, [
      el('span', { class: 'stat-label' }, ['Ana measures the ship']),
      labRead,
    ]),
    el('div', { class: 'stat' }, [
      el('span', { class: 'stat-label' }, ['The ship measures itself']),
      seenRead,
    ]),
    el('div', { class: 'stat' }, [
      el('span', { class: 'stat-label' }, ['Newtonian sum']),
      classicalRead,
      el('span', { class: 'stat-hint' }, ['wrong, and can exceed light']),
    ]),
    el('div', { class: 'stat' }, [
      el('span', { class: 'stat-label' }, ['K to reach that speed, 1 kg']),
      energyRead,
    ]),
  ]);

  update();

  return el('section', { class: 'panel' }, [
    el('div', { class: 'panel-head' }, [
      el('h3', { class: 'panel-title' }, ['The wall, not the goalpost']),
      el('p', { class: 'panel-sub' }, [
        frag([
          'Ana and the Wayfarer, again — now to ask why they can never close the gap ',
          'between them and light. Two reasons: one geometric, one financial.',
        ]),
      ]),
    ]),
    el('div', { class: 'panel-body' }, [
      framesCanvas,
      el('div', { class: 'map-legend' }, [
        el('span', { html: '<b>These lanes are world-maps.</b> They are coordinate statements about how fast one object passes another — not something either observer photographs.' }),
      ]),
      el('div', { style: 'margin-top:1.4rem' }, [stats, verdict]),
      el('div', { class: 'prose', style: 'margin-bottom:0.4rem' }, [
        el('h3', {}, ['What it costs to get close']),
        el('p', {}, [
          'One kilogram, accelerated from rest. The dashed line is the Newtonian prediction. ',
          'The solid line is the real bill, and it never flattens out.',
        ]),
      ]),
      energyCanvas,
      wallNote,
    ]),
    el('div', { class: 'controls' }, [sliderA.root, sliderProbe.root]),
  ]);
}

/** Superscript digits for the axis labels, avoiding a unicode table. */
function sup(value: number): string {
  const digits: Record<number, string> = { 0: '⁰', 2: '²', 4: '⁴', 6: '⁶', 8: '⁸', 10: '¹⁰' };
  return digits[value] ?? String(value);
}