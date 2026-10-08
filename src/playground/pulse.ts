import { C, lorentzFactor } from '../relativity.js';
import { dashedLine, dot, el, frag, label, line, num, palette, surface } from './ui.js';

/**
 * The signal-exchange diagram.
 *
 * The Minkowski diagram says "your worldline is bent, so you age less." That
 * is a geometric claim, and research consistently finds students cannot
 * reconstruct it afterwards — it is the textbook presentation Salerno et al.
 * (2019) criticise for silently switching the traveller's frame.
 *
 * This is the other standard picture, and it argues by counting instead. Ana
 * broadcasts a pulse on her birthday. You receive every one of them. Because
 * light always arrives at c, the pulses bunch up on the way out, bunch up
 * differently on the way back, and the total you *count* is the same as the
 * total she *sent*. No geometry, no paradox, no bent line — just an asymmetry
 * in how the same pulses are spaced out for each of you.
 */

/** One-way distance to Proxima, light-years. */
const DISTANCE_LY = 4.2465;

export function pulseExchange(beta: number): HTMLElement {
  const canvas = el('canvas', {
    class: 'canvas-wide',
    'aria-label':
      'Pulses sent by Ana once a year, and when each one arrives aboard the ship',
  });

  const gamma = lorentzFactor(beta * C);
  const earthRoundTrip = 2 * DISTANCE_LY;
  const shipRoundTrip = earthRoundTrip / gamma;

  const pulsesSent = Math.floor(earthRoundTrip);

  function draw(): void {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w < 2 || h < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    const padX = w * 0.06;
    const padTop = h * 0.3;
    const padBottom = h * 0.14;
    const laneH = (h - padTop - padBottom) / 2;

    // Top lane: Ana's broadcast, evenly spaced — she experiences one year per year.
    const sendY = padTop + laneH * 0.45;
    // Bottom lane: arrivals aboard the ship, bunched toward each end.
    const receiveY = padTop + laneH * 1.55;

    const label_ = (text: string, x: number, y: number, color: string, size = 10, align: CanvasTextAlign = 'left', weight = 500): void => {
      label(ctx, text, x, y, color, size, align, weight);
    };

    // Lane rails
    line(ctx, padX, sendY, w - padX, sendY, palette.gridSoft, 1);
    line(ctx, padX, receiveY, w - padX, receiveY, palette.gridSoft, 1);

    label_('Ana broadcasts', padX, sendY - 30, palette.home, 12, 'left', 650);
    label_('once a year, and once a year she feels it', padX, sendY - 16, palette.faint, 10);
    label_('You receive', padX, receiveY - 30, palette.ship, 12, 'left', 650);
    label_('all of them — but they arrive in clumps', padX, receiveY - 16, palette.faint, 10);

    // Ana's pulses: one per year of her own time.
    for (let i = 0; i <= pulsesSent; i++) {
      const year = i;
      const x = padX + ((w - 2 * padX) * year) / earthRoundTrip;
      dot(ctx, x, sendY, 4, palette.home);
      if (i % 2 === 0) label_(String(year), x, sendY + 16, palette.faint, 9, 'center');
    }
    label_('years', w - padX, sendY + 16, palette.faint, 9, 'right');

    // Arrival times aboard the ship.
    // Outbound: a pulse leaving at Earth-year T meets the ship at proper time
    //   (T - D/β) / γ  =  (T - D/c)·sqrt(1-β²)
    // and arrives in Earth-frame time T + D/c.
    // Inboard:   T + D/c  →  proper time  (T + D/c - 2D/c)/sqrt(1-β²)
    const D = DISTANCE_LY;
    const s = Math.sqrt(1 - beta * beta);

    const arrivals: { proper: number; outbound: boolean }[] = [];
    for (let i = 0; i <= pulsesSent; i++) {
      const T = i;
      if (T + D / 1 >= 2 * D) {
        // Received after turnaround: Earth time T + D, ship time (T + D - 2D)/s
        const ship = (T + D - 2 * D) / s;
        if (ship >= 0) arrivals.push({ proper: ship, outbound: false });
      } else {
        const ship = (T - D) / s;
        if (ship >= 0) arrivals.push({ proper: ship, outbound: true });
      }
    }

    for (const a of arrivals) {
      const x = padX + ((w - 2 * padX) * a.proper) / shipRoundTrip;
      dot(ctx, x, receiveY, 4.5, a.outbound ? palette.ship : palette.light);
    }

    // Mark the turnaround, where the clumping pattern changes.
    const turnProper = (D - D) / s;
    void turnProper;
    const turnX = padX + ((w - 2 * padX) * D) / shipRoundTrip;
    dashedLine(ctx, turnX, sendY - 8, turnX, receiveY + 8, palette.bad, [3, 4]);
    label_('turnaround', turnX, receiveY + 24, palette.bad, 10, 'center');

    // Your elapsed time axis.
    label_(
      `you experience ${num(shipRoundTrip, 2)} years`,
      w - padX,
      receiveY + 40,
      palette.text,
      11,
      'right',
      620,
    );
    label_(
      `she experiences ${num(earthRoundTrip, 2)} years`,
      w - padX,
      sendY + 40,
      palette.text,
      11,
      'right',
      620,
    );
  }

  surface(canvas, draw);
  draw();

  const explanation = el('div', { class: 'note note-key' }, [
    el('strong', {}, ['Same pulses. Different spacings.']),
    el('p', { class: 'prose', style: 'margin:0.6rem 0 0' }, [
      frag([
        'Ana sends one pulse a year and feels one year between each. You receive every single ' +
          'one of them, but they arrive in clumps: tightly bunched while you are leaving, ' +
          'differently bunched while you are coming home. ',
        el('em', {}, ['You never miss a pulse']),
        '. There is no contradiction to resolve, because nobody claimed the pulses were evenly ' +
          'spaced for both of you — only that light travels at the same speed for both, which is ' +
          'true. You counted the same number of pulses as Ana. You just did it in less of your own ' +
          'time, and that is the whole answer.',
      ]),
    ]),
  ]);

  const root = el('div', { class: 'pulse-exchange' }, [
    el('h3', { class: 'wavefront-heading' }, [
      'The same argument, counted instead of drawn',
    ]),
    canvas,
    explanation,
  ]);

  return root;
}