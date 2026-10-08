import { C, lengthContraction, lorentzFactor } from '../relativity.js';
import {
  checkbox,
  dashedLine,
  dot,
  el,
  frag,
  label,
  line,
  num,
  palette,
  slider,
  surface,
} from './ui.js';

/**
 * "Right now" is not a universal fact.
 *
 * To measure a moving object's length you must note where its two ends are
 * *at the same moment in your frame*. That single simultaneity rule is what
 * produces length contraction, and the same rule is what makes the traveller's
 * clock lose time. Both panels below are the same measurement seen twice.
 */

export function simultaneity(): HTMLElement {
  let beta = 0.8;
  let showLabLine = true;

  const labCanvas = el('canvas', { class: 'canvas-wide', 'aria-label': 'A moving rod measured from the lab' });
  const rodCanvas = el('canvas', { class: 'canvas-wide', 'aria-label': 'The same rod measured from its own rest frame' });
  const labCtx = surface(labCanvas, drawLab).ctx;
  const rodCtx = surface(rodCanvas, drawRod).ctx;

  const labRead = el('span', { class: 'stat-value' }, ['—']);
  const rodRead = el('span', { class: 'stat-value' }, ['—']);
  const ratioRead = el('span', { class: 'stat-value' }, ['—']);
  const agreeRead = el('span', { class: 'stat-value' }, ['—']);

  function drawLab(ctx: CanvasRenderingContext2D): void {
    const w = labCanvas.getBoundingClientRect().width;
    const h = labCanvas.getBoundingClientRect().height;
    if (w < 2 || h < 2) return;
    ctx.clearRect(0, 0, w, h);

    const properLength = 1; // one unit of proper length
    const measured = lengthContraction(properLength, beta * C);

    // Choose a scale so the contracted rod fills a readable share of the panel.
    const scale = (w * 0.42) / Math.max(measured, 1e-6);
    const rodH = 18;
    const y = h * 0.56;
    const x = w * 0.5 - (measured * scale) / 2;

    // Reference ruler at rest, in lab metres
    line(ctx, w * 0.08, y + 54, w * 0.92, y + 54, palette.grid, 1);
    for (let i = 0; i <= 10; i++) {
      const tx = w * 0.08 + (w * 0.84 * i) / 10;
      line(ctx, tx, y + 54, tx, y + 60, palette.grid, 1);
    }

    // The rod, contracted
    ctx.save();
    ctx.fillStyle = palette.ship;
    ctx.globalAlpha = 0.16;
    ctx.fillRect(x, y - rodH / 2, measured * scale, rodH);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = palette.ship;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y - rodH / 2, measured * scale, rodH);
    ctx.restore();

    // Ends
    line(ctx, x, y - rodH / 2 - 14, x, y + rodH / 2 + 14, palette.ship, 2.5);
    line(ctx, x + measured * scale, y - rodH / 2 - 14, x + measured * scale, y + rodH / 2 + 14, palette.ship, 2.5);
    dot(ctx, x, y, 4, palette.ship);
    dot(ctx, x + measured * scale, y, 4, palette.ship);

    label(ctx, 'front', x, y + rodH / 2 + 26, palette.ship, 11, 'center');
    label(ctx, 'back', x + measured * scale, y + rodH / 2 + 26, palette.ship, 11, 'center');

    // The simultaneity line: both ends noted at the same lab instant
    if (showLabLine) {
      dashedLine(ctx, w * 0.04, y - 46, w * 0.96, y - 46, palette.light, [5, 4]);
      label(ctx, 'the one instant you measure at', w * 0.96, y - 56, palette.light, 11, 'right');
    }

    label(
      ctx,
      `you measure ${num(measured, 3)} of a ${num(properLength, 1)} rest length`,
      w / 2,
      h * 0.9,
      palette.text,
      12,
      'center',
      600,
    );
    label(ctx, 'moving right', w * 0.08, h * 0.12, palette.faint, 11);
  }

  function drawRod(ctx: CanvasRenderingContext2D): void {
    const w = rodCanvas.getBoundingClientRect().width;
    const h = rodCanvas.getBoundingClientRect().height;
    if (w < 2 || h < 2) return;
    ctx.clearRect(0, 0, w, h);

    const properLength = 1;
    const measured = lengthContraction(properLength, beta * C);

    // Same visual scale as the lab panel, so the difference is honest.
    const scale = (w * 0.42) / Math.max(measured, 1e-6);
    const rodH = 18;
    const y = h * 0.56;
    const x = w * 0.5 - (properLength * scale) / 2;

    ctx.save();
    ctx.fillStyle = palette.home;
    ctx.globalAlpha = 0.16;
    ctx.fillRect(x, y - rodH / 2, properLength * scale, rodH);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = palette.home;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y - rodH / 2, properLength * scale, rodH);
    ctx.restore();

    line(ctx, x, y - rodH / 2 - 14, x, y + rodH / 2 + 14, palette.home, 2.5);
    line(ctx, x + properLength * scale, y - rodH / 2 - 14, x + properLength * scale, y + rodH / 2 + 14, palette.home, 2.5);
    dot(ctx, x, y, 4, palette.home);
    dot(ctx, x + properLength * scale, y, 4, palette.home);

    // The rod's own simultaneous line is tilted, because simultaneity is relative.
    // In the rod's frame the lab's simultaneity line has slope -beta.
    if (showLabLine) {
      const halfW = properLength * scale * 0.42;
      const slope = -beta * (halfW / 1);
      ctx.save();
      ctx.strokeStyle = palette.light;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(w / 2 - halfW * 2, y - 46 - slope);
      ctx.lineTo(w / 2 + halfW * 2, y - 46 + slope);
      ctx.stroke();
      ctx.restore();
      label(ctx, 'your "same moment" runs at an angle here', w * 0.96, y - 58, palette.light, 11, 'right');
    }

    label(
      ctx,
      `the rod knows it is ${num(properLength, 1)} long`,
      w / 2,
      h * 0.9,
      palette.text,
      12,
      'center',
      600,
    );
    label(ctx, 'rod is at rest', w * 0.08, h * 0.12, palette.faint, 11);
  }

  function update(): void {
    const gamma = lorentzFactor(beta * C);
    const measured = lengthContraction(1, beta * C);
    labRead.textContent = `${num(measured, 4)}`;
    rodRead.textContent = '1.0000';
    ratioRead.textContent = `${num(1 / gamma, 4)}×`;
    agreeRead.textContent = `${num(gamma, 3)}×`;
    drawLab(labCtx);
    drawRod(rodCtx);
  }

  const speed = slider(
    {
      label: 'Speed of the Wayfarer',
      min: 0.01,
      max: 0.99,
      step: 0.01,
      value: beta,
      display: (v) => `${num(v * 100, 0)}% of light`,
    },
    (v) => {
      beta = v;
      update();
    },
  );

  const lineToggle = checkbox('Show the simultaneity line', true, (v) => {
    showLabLine = v;
    update();
  });

  const crossCheck = el('div', { class: 'note note-key' }, [
    frag([
      'The same rule, used differently, gives the time dilation from the first module. ',
      'Contract the length of a rod that is being ', el('em', {}, ['clocked']), ': fewer proper ' +
      'seconds per unit length means each second takes longer, and the result is exactly ',
      el('em', {}, ['γ']), '.',
    ]),
  ]);

  update();

  return el('section', { class: 'panel' }, [
    el('div', { class: 'panel-head' }, [
      el('h3', { class: 'panel-title' }, ['Two events, one instant — to different people']),
      el('p', { class: 'panel-sub' }, [
        frag([
        'A docking rod on the Wayfarer\u2019s nose, one light-second long. ',
        'Both panels use the same on-screen scale. It really does look different in each.',
      ]),
      ]),
    ]),
    el('div', { class: 'frame-pair' }, [
      el('div', { class: 'frame' }, [
        el('p', { class: 'frame-title' }, [
          el('span', { class: 'swatch', style: `background:${palette.ship}` }),
          'You, watching from the hangar',
        ]),
        el('p', { class: 'frame-note' }, [
          'The rod flashes once as it passes you. Both ends are noted at that single instant — ',
          'which is what it means to measure a length.',
        ]),
        labCanvas,
      ]),
      el('div', { class: 'frame' }, [
        el('p', { class: 'frame-title' }, [
          el('span', { class: 'swatch', style: `background:${palette.home}` }),
          'Riding along with the rod',
        ]),
        el('p', { class: 'frame-note' }, [
          'The rod is stationary here, so it measures itself with its own simultaneous flashes ',
          'and gets its full length. Nobody is doing anything wrong.',
        ]),
        rodCanvas,
      ]),
    ]),
    el('div', { class: 'panel-body' }, [
      el('div', { class: 'stats' }, [
        el('div', { class: 'stat' }, [
          el('span', { class: 'stat-label' }, ['Lab measures']),
          labRead,
          el('span', { class: 'stat-hint' }, ['rest units']),
        ]),
        el('div', { class: 'stat' }, [
          el('span', { class: 'stat-label' }, ['Rod measures']),
          rodRead,
        ]),
        el('div', { class: 'stat' }, [
          el('span', { class: 'stat-label' }, ['Ratio']),
          ratioRead,
        ]),
        el('div', { class: 'stat' }, [
          el('span', { class: 'stat-label' }, ['Reciprocal, i.e. γ']),
          agreeRead,
        ]),
      ]),
      crossCheck,
    ]),
    el('div', { class: 'controls' }, [speed.root, lineToggle.root]),
  ]);
}