import { C, beta as toBeta, lorentzFactor } from '../relativity.js';
import { el, num, percentOfC } from './ui.js';

/**
 * A lookup table for the one number everything hangs off, generated from the
 * same functions the interactive modules use so the two can never drift apart.
 */

const ROWS: ReadonlyArray<number> = [
  0.01, 0.1, 0.3, 0.5, 0.7, 0.8, 0.9, 0.95, 0.99, 0.999, 0.9999, 0.999999,
];

/** Something recognisable at each speed, so the number lands on a picture. */
const ANCHORS: Record<string, string> = {
  '0.01': 'a fast jet',
  '0.1': 'a third of the way to the Sun in an hour',
  '0.3': 'proxima in 14 years, no time saved',
  '0.5': 'still feels instant; the maths does not',
  '0.7': 'the Sun is 14 years older when you get back',
  '0.8': 'the first speed where the effect is hard to argue with',
  '0.9': 'Proxima round trip: 17 years for you, 3.7 for Ana',
  '0.95': 'Ana is 6.3× older when you reunite',
  '0.99': 'Ana is 7.1× older',
  '0.999': 'Ana is 22× older',
  '0.9999': 'Ana is 70× older',
  '0.999999': 'Ana is 707× older',
};

export function gammaTable(): HTMLElement {
  const head = el('tr', {}, [
    el('th', { scope: 'col' }, ['Speed']),
    el('th', { scope: 'col' }, ['β = v/c']),
    el('th', { scope: 'col' }, ['γ']),
    el('th', { scope: 'col' }, ['1 unit of your time is…']),
    el('th', { scope: 'col' }, ['In context']),
  ]);

  const body = el('tbody');
  for (const value of ROWS) {
    const speed = value * C;
    const gamma = lorentzFactor(speed);
    const key = String(value);
    body.append(
      el('tr', {}, [
        el('th', { scope: 'row' }, [percentOfC(toBeta(speed))]),
        el('td', {}, [String(value)]),
        el('td', { class: 'num' }, [num(gamma, gamma < 100 ? 3 : 0)]),
        el('td', {}, [`${num(gamma, gamma < 100 ? 3 : 0)} of it here`]),
        el('td', { class: 'muted' }, [ANCHORS[key] ?? '']),
      ]),
    );
  }

  return el('div', { class: 'table-wrap' }, [
    el('table', { class: 'table' }, [
      el('caption', {}, ['γ across the range that matters. Note how flat it is until 0.5c, then how it runs away.']),
      el('thead', {}, [head]),
      body,
    ]),
  ]);
}