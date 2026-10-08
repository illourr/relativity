import { C, lorentzFactor } from '../relativity.js';
import { predictionPrompt } from './poe.js';
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
 * The travelling-twin case, drawn as a Minkowski diagram.
 *
 * Departure and reunion are agreed facts in every frame. What each twin feels
 * is the length of their own path between those two fixed points. Ana's path
 * is straight; yours dives out into space and comes back, and bending costs
 * you time. The diagram uses one isotropic scale for both axes, so the
 * light-cone edges really are 45 degrees and path lengths are comparable.
 */

/** One-way distance to Proxima Centauri, in light-years. */
const DISTANCE_LY = 4.2465;
const ROUND_TRIP_EARTH_YEARS = 2 * DISTANCE_LY;

export function spacetime(): HTMLElement {
  let beta = 0.8;
  let progress = 0;
  let running = true;

  const canvas = el('canvas', {
    class: 'canvas-tall',
    'aria-label': 'Spacetime diagram of two twins separating and reuniting',
  });
  const ctx = surface(canvas).ctx;

  const rowsCanvas = el('canvas', {
    class: 'canvas-wide',
    'aria-label': 'Ana reads one row of clocks the whole way; you read two that disagree',
  });
  const rowsCtx = surface(rowsCanvas).ctx;

  const earthRead = el('span', { class: 'stat-value' }, ['0.00']);
  const shipRead = el('span', { class: 'stat-value' }, ['0.00']);
  const gapRead = el('span', { class: 'stat-value' }, ['0.00']);
  const verdict = el('p', { class: 'panel-sub' }, [
    frag(['Outbound leg. Ana stays home; you are halfway out at the turn.']),
  ]);

  const paradoxNote = el('div', { class: 'note note-caution', hidden: true }, [
    el('strong', {}, ['"But each twin sees the other aging slowly — how can that be?"']),
    el('p', { class: 'prose', style: 'margin:0.6rem 0 0' }, [
      frag([
        'Each twin is right, about their own stretch of the trip. But ',
        'you compare notes twice: once outbound, once inbound. On the way out you are using the frame ',
        'where you left Earth behind; after the turnaround you are using a different frame, in which ',
        'Earth is the one that turned around. Only Ana stays in one unbroken frame the whole way. ',
        'The asymmetry is the turnaround, not the speed.',
      ]),
    ]),
  ]);

  const speed = slider(
    {
      label: 'Your speed',
      min: 0.1,
      max: 0.99,
      step: 0.01,
      value: beta,
      display: (v) => `${num(v * 100, 0)}% of light`,
      hint: 'Same trip either way: 4.25 light-years out and back, with Ana waiting.',
    },
    (v) => {
      beta = v;
      render();
    },
  );

  const playButton = checkbox('Animate the trip', true, (v) => {
    running = v;
  });
  const reveal = checkbox('Show the paradox and its answer', false, (v) => {
    paradoxNote.hidden = !v;
  });

  const betaRead = el('span', { class: 'slider-value' }, ['1.67×']);

  /**
   * The asymmetry, drawn as clocks.
   *
   * Textbooks routinely present the twin paradox by silently switching the
   * traveller's reference frame at turnaround, then act surprised that the
   * answer is asymmetric. Salerno et al. (2019) identify this omission as the
   * source of most residual confusion. So: Ana reads one row of clocks the
   * whole way. You read the outbound row on the way out and a *different* row
   * on the way home, and the two rows disagree with each other. That
   * desynchronisation is the asymmetry — it is not a consequence of it.
   */
  function drawClockRows(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const rowsY = [h * 0.36, h * 0.66];
    const left = w * 0.08;
    const right = w * 0.92;
    const count = 9;

    const rows = [
      { label: 'Ana', note: 'one row, start to finish', color: palette.home },
      { label: 'You', note: 'outbound row, then a different one home', color: palette.ship },
    ];

    rows.forEach((row, rowIndex) => {
      const y = rowsY[rowIndex];
      if (y === undefined) return;

      label(ctx, row.label, left, y - 26, row.color, 12, 'left', 650);
      label(ctx, row.note, left, y - 11, palette.faint, 10, 'left');

      // Ana reads a single continuous row. You read two, and they do not line
      // up where they meet.
      const halves = rowIndex === 0 ? 1 : 2;
      for (let half = 0; half < halves; half++) {
        const from = left + (right - left) * (half / halves);
        const to = left + (right - left) * ((half + 1) / halves);
        line(ctx, from, y, to, y, row.color, half === 0 ? 2 : 2);

        // Desynchronisation marker: the gap where your second row begins.
        if (rowIndex === 1 && half === 1) {
          line(ctx, to, y - 14, to, y + 14, palette.bad, 2.5);
          label(ctx, 'these two rows disagree', to + 8, y - 18, palette.bad, 10, 'left');
          label(ctx, 'and the gap is what costs you time', to + 8, y + 22, palette.dim, 10, 'left');
        }

        for (let i = 0; i <= count; i++) {
          const x = from + ((to - from) * i) / count;
          line(ctx, x, y - 5, x, y + 5, row.color, 1.5);
          if (i === 0 || i === count) {
            label(ctx, i === 0 ? 'launch' : 'reunion', x, y + 17, palette.faint, 9, 'center');
          }
        }
      }
    });

    label(
      ctx,
      'Ana never changes rows. You change yours once.',
      w / 2,
      h * 0.12,
      palette.text,
      11,
      'center',
      620,
    );
  }

  function render(): void {
    const gamma = lorentzFactor(beta * C);
    betaRead.textContent = `${num(gamma, 2)}×`;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w < 2 || h < 2) return;
    ctx.clearRect(0, 0, w, h);

    // One isotropic scale keeps the light cone at 45 degrees.
    const padX = w * 0.09;
    const padY = h * 0.05;
    const tMax = ROUND_TRIP_EARTH_YEARS * 1.04;
    const xMin = -DISTANCE_LY * 0.16;
    const xMax = DISTANCE_LY * 1.12;
    const scale = Math.min((w - padX * 2) / (xMax - xMin), (h - padY * 2) / tMax);

    const originX = padX + (0 - xMin) * scale;
    const originY = h - padY;
    const sx = (x: number): number => originX + x * scale;
    const sy = (t: number): number => originY - t * scale;

    // Light cone from departure
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(sx(0), sy(0));
    ctx.lineTo(sx(tMax), sy(tMax));
    ctx.moveTo(sx(0), sy(0));
    ctx.lineTo(sx(-tMax), sy(tMax));
    ctx.strokeStyle = palette.light;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    label(ctx, 'light', sx(ROUND_TRIP_EARTH_YEARS * 0.55) + 4, sy(ROUND_TRIP_EARTH_YEARS * 0.55) - 8, palette.light, 11);

    // Axes
    line(ctx, sx(xMin), sy(0), sx(xMax), sy(0), palette.grid, 1);
    dashedLine(ctx, sx(0), sy(0), sx(0), sy(tMax), palette.grid, [3, 5]);
    label(ctx, 'space →', sx(xMax) - 4, sy(0) + 16, palette.faint, 11, 'right');
    label(ctx, 'time ↑', sx(0) + 8, sy(tMax) + 12, palette.faint, 11);

    // Ana: a straight worldline through both events
    line(ctx, sx(0), sy(0), sx(0), sy(ROUND_TRIP_EARTH_YEARS), palette.home, 3);

    // Your path, revealed as the animation advances. Only the portion of the
    // route actually travelled so far is drawn; appending to a fully drawn
    // path would leave a stray segment across the diagram.
    const turnT = ROUND_TRIP_EARTH_YEARS / 2;
    const turnX = DISTANCE_LY;
    const travelledT = progress * ROUND_TRIP_EARTH_YEARS;
    ctx.save();
    ctx.strokeStyle = palette.ship;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(sx(0), sy(0));
    if (progress < 0.5) {
      ctx.lineTo(sx(beta * travelledT), sy(travelledT));
    } else {
      ctx.lineTo(sx(turnX), sy(turnT));
      ctx.lineTo(sx(turnX * (2 - 2 * progress)), sy(travelledT));
    }
    ctx.stroke();
    ctx.restore();

    // Turnaround marker
    dot(ctx, sx(turnX), sy(turnT), 4, palette.ship);
    label(ctx, 'turnaround', sx(turnX) + 9, sy(turnT), palette.ship, 11);

    // Departure and reunion events
    dot(ctx, sx(0), sy(0), 5, palette.text);
    dot(ctx, sx(0), sy(ROUND_TRIP_EARTH_YEARS), 5, palette.text);

    // Ship marker
    let shipX = 0;
    let shipT = 0;
    if (progress < 0.5) {
      shipT = progress * 2;
      shipX = shipT * beta;
    } else {
      shipT = progress * 2;
      shipX = (2 - shipT) * beta;
    }
    if (progress > 0.001 && progress < 0.999) {
      dot(ctx, sx(shipX), sy(shipT), 6, palette.ship, palette.bg);
    }

    // Labels for the two people. Ana's label sits inside the open wedge to the
    // right of her line; anchoring it left of the line clipped it off-canvas.
    label(ctx, 'Ana stays home', sx(0) + 10, sy(ROUND_TRIP_EARTH_YEARS * 0.46), palette.home, 12, 'left', 600);
    label(ctx, 'your path', sx(turnX * 0.55) + 14, sy(turnT * 0.55) - 16, palette.ship, 12, 'left', 600);

    // Path-length comparison, drawn to scale
    if (progress > 0.985) {
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = palette.home;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(sx(0) - 14, sy(0));
      ctx.lineTo(sx(0) - 14, sy(ROUND_TRIP_EARTH_YEARS));
      ctx.stroke();
      ctx.restore();
      label(ctx, 'most time', sx(0) - 20, sy(ROUND_TRIP_EARTH_YEARS * 0.5), palette.home, 11, 'right');

      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = palette.ship;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sx(0) + 14, sy(0));
      ctx.lineTo(sx(14 + turnX), sy(turnT));
      ctx.lineTo(sx(14 + 0), sy(ROUND_TRIP_EARTH_YEARS));
      ctx.stroke();
      ctx.restore();
      label(ctx, 'less time', sx(0) + 22, sy(ROUND_TRIP_EARTH_YEARS * 0.72), palette.ship, 11);
    }

    // Reunion badge
    if (progress > 0.985) {
      const badgeW = 150;
      const badgeH = 46;
      const bx = Math.min(w - badgeW - 8, sx(0) + 26);
      const by = 8;
      ctx.save();
      roundRect(ctx, bx, by, badgeW, badgeH, 8);
      ctx.fillStyle = 'rgba(7,8,12,0.9)';
      ctx.fill();
      ctx.strokeStyle = palette.good;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
      label(ctx, 'Ana is', bx + 12, by + 17, palette.home, 12, 'left', 600);
      label(ctx, `${num(ROUND_TRIP_EARTH_YEARS, 2)} years older`, bx + 12, by + 33, palette.text, 11);
    }
  }

  const play = playback();

  onTick((_now, dt) => {
    if (running && (play.isPlaying() || play.consumeStep())) {
      progress = (progress + dt / 7) % 1;
      if (progress < dt / 7) progress = 0;
    }
    const gamma = lorentzFactor(beta * C);
    const earthYears = progress * ROUND_TRIP_EARTH_YEARS;
    const shipYears = earthYears / gamma;
    earthRead.textContent = `${num(earthYears, 2)} yr`;
    shipRead.textContent = `${num(shipYears, 2)} yr`;
    const gap = earthYears - shipYears;
    gapRead.textContent = progress > 0.985 ? `${num(gap, 2)} yr` : '—';

    if (progress > 0.985) {
      verdict.textContent =
        `Back in the hangar, clocks side by side. Ana's reads ${num(ROUND_TRIP_EARTH_YEARS, 2)} years; ` +
        `yours reads ${num(ROUND_TRIP_EARTH_YEARS / gamma, 2)}. She is ${num(gap, 2)} years older than you.`;
    } else if (progress > 0.5) {
      verdict.textContent =
      'Inbound leg. You covered the same 4.25 light-years home in the same span of time Ana did.';
    } else if (progress > 0.001) {
      verdict.textContent = `Outbound. You are ${num(shipYears, 2)} years older; Ana is ${num(earthYears, 2)} years older.`;
    } else {
      verdict.textContent = 'Ready to depart. Both clocks read zero and both agree the event happens.';
    }

    render();
    const rowsRect = rowsCanvas.getBoundingClientRect();
    if (rowsRect.width > 2 && rowsRect.height > 2) {
      rowsCtx.clearRect(0, 0, rowsRect.width, rowsRect.height);
      drawClockRows(rowsCtx, rowsRect.width, rowsRect.height);
    }
  });

  const poe = predictionPrompt({
    question:
      'You leave for Proxima at 0.8c and come straight back at the same speed, turning around ' +
      'instantly at the halfway point. You and Ana both started at 20. You meet again at the ' +
      'hangar. Who is older?',
    options: [
      {
        label: 'You are. You went out and came back while Ana waited.',
        correct: true,
        why:
          'Correct. But notice how much work the return leg is doing. Going out alone proves ' +
          'nothing — each of you sees the other age slowly, symmetrically. It is the turning ' +
          'around that breaks the tie, and the diagram below shows exactly where the symmetry ' +
          'breaks.',
      },
      {
        label: 'Ana is. She was moving through space while I was stationary.',
        correct: false,
        why:
          'The earth-centred way of putting it. From the hangar it looks as though Ana was the ' +
          'one moving — she is, relative to the stars. But "the one who stayed put" is a choice ' +
          'of frame, and it is not the one that answers the question. The question is settled by ' +
          'the paths, not by who moved.',
      },
      {
        label: 'We are the same age. You each saw the other age slowly, so it cancels out.',
        correct: false,
        why:
          'This is the paradox as usually stated, and it is a genuinely reasonable thought. ' +
          'It fails because it applies "each saw the other slow" to the whole journey. You use ' +
          'one frame going out and a different one coming back. The two do not cancel, because ' +
          'they are not the same claim.',
      },
      {
        label: 'It depends on how much of the trip you spent accelerating.',
        correct: false,
        why:
          'Not quite. Acceleration is what makes the path bend, and it is a real part of the ' +
          'journey — but it is not a separate clock-reading effect. Even with instantaneous, ' +
          'gentle turnarounds the result is the same. It is the shape of the path in spacetime, ' +
          'not the size of the push, that sets the age gap.',
      },
    ],
    takeaway:
      'You cannot get younger by going fast. You get younger by going fast and then turning ' +
      'around — and turning around is the entire physical content.',
  });

  return el('section', { class: 'panel' }, [
    el('div', { class: 'panel-head' }, [
      el('h3', { class: 'panel-title' }, ['The traveller returns older']),
      el('p', { class: 'panel-sub' }, [
        frag([
          'You and Ana, same launch, same reunion — 4.25 light-years out and back, ',
          'drawn in spacetime rather than in space.',
        ]),
      ]),
    ]),
    el('div', { class: 'panel-body' }, [
      poe.root,
      el('div', { class: 'split' }, [
        el('div', {}, [canvas]),
        el('div', {}, [
          el('div', { class: 'stats', style: 'grid-template-columns:repeat(2,1fr)' }, [
            el('div', { class: 'stat' }, [
              el('span', { class: 'stat-label' }, ['Ana, on the home worldline']),
              earthRead,
            ]),
            el('div', { class: 'stat' }, [
              el('span', { class: 'stat-label' }, ['You, on your path']),
              shipRead,
            ]),
            el('div', { class: 'stat' }, [
              el('span', { class: 'stat-label' }, ['Age difference at reunion']),
              gapRead,
            ]),
            el('div', { class: 'stat' }, [
              el('span', { class: 'stat-label' }, ['γ at this speed']),
              betaRead,
            ]),
          ]),
          el('p', { class: 'panel-sub', style: 'margin:1rem 0 0' }, [verdict]),
        ]),
      ]),
    ]),
    el('div', { class: 'panel-body' }, [
      el('h3', { class: 'map-legend-heading' }, [
        'Where the symmetry actually breaks',
      ]),
      rowsCanvas,
      el('div', { class: 'map-legend' }, [
        el('span', { html: 'Textbooks usually hide this. Ana reads <b>one</b> row of clocks for the whole trip. You read the outbound row going out and a <b>different</b> row coming home, and those two rows are not synchronised with each other.' }),
      ]),
    ]),
    el('div', { class: 'controls' }, [speed.root, playButton.root, play.root, reveal.root]),
    el('div', { class: 'panel-foot', style: 'padding:0 1.4rem 1.2rem' }, [paradoxNote]),
  ]);
}