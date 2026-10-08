import { dashedLine, dot, el, frag, label, line, num, palette, surface } from './ui.js';

/**
 * Deriving relativity of simultaneity instead of asserting it.
 *
 * Scherr (2001, and the AJP tutorial pair) identifies relativity of
 * simultaneity as the concept students most reliably fail to learn from
 * passive instruction, and the two-flash construction as the intervention that
 * works. It matters because it makes simultaneity a *consequence* of light
 * speed being invariant, rather than a strange extra postulate.
 *
 * The argument, in three stills:
 *
 *   1. Two lamps at the ends of a rod flash at once, judged by Ana on the
 *      ground. In her frame they really are simultaneous.
 *   2. Ana watches the wavefronts expand. The observer at the rod's midpoint
 *      is being carried along by the rod, so he meets the front wavefront
 *      first — measurably, visibly, first.
 *   3. But from the rod's own frame the rod is stationary, both lamps are
 *      equidistant, and both wavefronts travel at c. So they must arrive
 *      together. They don't. Therefore the flashes were NOT simultaneous in
 *      the rod's frame.
 *
 * No animation is needed. Three labelled diagrams carry the whole argument,
 * which is the point: the contradiction is logical, not kinematic.
 */

/** Rod length in light-seconds of travel time; any value works. */
const ROD_HALF = 0.5;

function flashTimeFromFront(beta: number): number {
  // Wavefront from the front lamp meets an observer coming toward it.
  return ROD_HALF / (1 + beta);
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  frame: 1 | 2 | 3,
  beta: number,
  boxW: number,
  boxH: number,
): void {
  const w = boxW;
  const h = boxH;
  const scale = (w * 0.82) / 2.4;
  const midX = w / 2;
  const rodY = h * 0.6;

  const rearX = midX - ROD_HALF * scale;
  const frontX = midX + ROD_HALF * scale;
  let t = 0;
  if (frame === 2) t = flashTimeFromFront(beta) * 0.94;

  ctx.clearRect(0, 0, w, h);

  // Ground line (Ana is at rest on it)
  line(ctx, w * 0.06, rodY + 46, w * 0.94, rodY + 46, palette.grid, 1);

  // The rod
  const drawRod = (dx: number): void => {
    const a = rearX + dx;
    const b = frontX + dx;
    ctx.save();
    ctx.strokeStyle = palette.ship;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(a, rodY);
    ctx.lineTo(b, rodY);
    ctx.stroke();
    ctx.restore();
  };

  if (frame === 3) {
    // Rod's own frame: stationary by definition.
    drawRod(0);
  } else {
    drawRod(beta * t * scale);
  }

  // Lamps
  const lampDx = frame === 3 ? 0 : beta * t * scale;
  for (const [x, name] of [
    [rearX + lampDx, 'rear lamp'],
    [frontX + lampDx, 'front lamp'],
  ] as const) {
    dot(ctx, x, rodY, 4.5, palette.home);
    label(ctx, name === 'rear lamp' ? 'rear' : 'front', x, rodY + 16, palette.home, 10, 'center');
  }

  // The observer at the midpoint, carried along by the rod
  const obsX = midX + lampDx;
  dot(ctx, obsX, rodY - 26, 5, palette.light);
  label(ctx, 'observer', obsX, rodY - 38, palette.light, 10, 'center');

  // Wavefronts
  const drawWave = (x: number, r: number, alpha: number): void => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = palette.light;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, rodY, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };

  if (frame === 1) {
    // Both flash at the same instant. Concentric circles, equal radius.
    drawWave(rearX, ROD_HALF * scale * 0.34, 0.9);
    drawWave(frontX, ROD_HALF * scale * 0.34, 0.9);
    label(ctx, 'two flashes, one instant', w / 2, h * 0.13, palette.text, 12, 'center', 620);
    label(
      ctx,
      'In Ana’s frame the two lamps really did flash together.',
      w / 2,
      h * 0.13 + 17,
      palette.dim,
      11,
      'center',
    );
  } else if (frame === 2) {
    // Front wavefront has reached the observer; rear is still short of him.
    // Both circles have radius c·t, but from opposite lamps, so the observer
    // sits on one of them and well outside the other.
    const radius = t * scale;
    drawWave(frontX + lampDx, radius, 0.95);
    drawWave(rearX + lampDx, radius, 0.45);
    // Highlight the front one reaching him.
    dot(ctx, obsX, rodY, 3, palette.good);
    label(ctx, 'front wavefront gets here first', w / 2, h * 0.13, palette.good, 12, 'center', 620);
    label(
      ctx,
      'He is being carried along by the rod, so he meets the front wavefront first.',
      w / 2,
      h * 0.13 + 17,
      palette.dim,
      11,
      'center',
    );
  } else {
    // Rod's frame: equal distances, so equal arrival times. But that contradicts frame 2.
    const rEq = ROD_HALF * scale;
    drawWave(rearX, rEq, 0.75);
    drawWave(frontX, rEq, 0.75);
    dashedLine(ctx, midX, rodY - rEq, midX, rodY + rEq, palette.bad, [3, 4]);
    label(ctx, 'but both are equidistant here', w / 2, h * 0.13, palette.bad, 12, 'center', 620);
    label(
      ctx,
      'Same rod, same observer, same light speed — and now they arrive together.',
      w / 2,
      h * 0.13 + 17,
      palette.dim,
      11,
      'center',
    );
    label(
      ctx,
      'Both frames are right. The flashes cannot have been simultaneous in both.',
      w / 2,
      h - 12,
      palette.text,
      11,
      'center',
      600,
    );
  }

  if (frame === 1) {
    label(ctx, `rod moving at ${num(beta, 2)}c`, w / 2, h - 12, palette.faint, 10, 'center');
  }
}

export function wavefrontArgument(beta: number): HTMLElement {
  const boxes: HTMLCanvasElement[] = [];
  const row = el('div', { class: 'wavefront-row' });
  let lastBeta = beta;
  const indexOf = (list: HTMLCanvasElement[], item: HTMLCanvasElement): number => {
    const i = list.indexOf(item);
    return i >= 0 ? i : 0;
  };

  const panels = [
    {
      n: '1',
      title: 'Ana: simultaneous',
      body: 'Two lamps at the ends of the Wayfarer’s docking rod. Ana, at rest on the ground, sees them flash at the same instant. She is not confused — in her frame, they genuinely are simultaneous.',
    },
    {
      n: '2',
      title: 'Ana: the wavefronts',
      body: 'Light from each lamp expands at c. The observer at the rod’s midpoint is being carried along by the rod, so he runs into the front wavefront first. Ana measures this, and it is not close.',
    },
    {
      n: '3',
      title: 'The ship: a contradiction',
      body: 'From the rod’s own frame the rod is standing still. Both lamps are equidistant, both wavefronts travel at c — so they must arrive together. But frame 2 says they do not.',
    },
  ];

  for (const panel of panels) {
    const canvas = el('canvas', {
      class: 'wavefront-canvas',
      'aria-label': `Panel ${panel.n}: ${panel.title}`,
    }) as HTMLCanvasElement;
    // surface() owns sizing and repaints on layout, which is what fixes the
    // first-paint-after-attach case.
    surface(canvas, (ctx) => {
      const frame = (indexOf(boxes, canvas) + 1) as 1 | 2 | 3;
      drawPanel(ctx, frame, lastBeta, ctx.canvas.width, ctx.canvas.height);
    });
    boxes.push(canvas);
    row.append(
      el('div', { class: 'wavefront-panel' }, [
        el('p', { class: 'wavefront-n' }, [panel.n]),
        canvas,
        el('p', { class: 'wavefront-title' }, [panel.title]),
        el('p', { class: 'wavefront-body' }, [panel.body]),
      ]),
    );
  }

  const redraw = (b: number): void => {
    lastBeta = b;
    for (const [i, canvas] of boxes.entries()) {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 2) continue;
      const ctx = canvas.getContext('2d');
      if (ctx) drawPanel(ctx, (i + 1) as 1 | 2 | 3, b, rect.width, rect.height);
    }
  };

  lastBeta = beta;
  redraw(beta);

  const resolution = el('div', { class: 'note note-key' }, [
    el('strong', {}, ['The only way out.']),
    el('p', { class: 'prose', style: 'margin:0.6rem 0 0' }, [
      frag([
        'The flashes were not simultaneous in the ship’s frame. In the ship’s frame the front lamp ',
        'fired first — which is exactly what Ana measures, seen from the other side. ',
        el('em', {}, ['Simultaneity is not an extra rule']),
        '; it is forced on you by insisting that light travels at the same speed for everyone. ' +
          'Every diagram in this page is a consequence of that one postulate.',
      ]),
    ]),
  ]);

  return el('div', { class: 'wavefront' }, [
    el('h3', { class: 'wavefront-heading' }, [
      'Why "right now" has no single answer — worked out, not asserted',
    ]),
    row,
    resolution,
  ]);
}
