import { C, energy, kineticEnergy, lorentzFactor } from '../relativity.js';
import {
  el,
  frag,
  num,
  palette,
  percentOfC,
  sci,
  slider,
} from './ui.js';

/**
 * E = mc², and the number that makes it memorable.
 *
 * The equation is usually shown as a curiosity. The useful version is the one
 * on the left: matter holds an enormous amount of energy, and converting it is
 * hard on purpose.
 */

/** One kilogram of TNT, in joules. */
const J_PER_TON_TNT = 4.184e9;

export function massEnergy(): HTMLElement {
  let massKg = 1;
  let speed = 0;

  const restRead = el('span', { class: 'stat-value' }, ['—']);
  const totalRead = el('span', { class: 'stat-value' }, ['—']);
  const kineticRead = el('span', { class: 'stat-value' }, ['—']);
  const gammaRead = el('span', { class: 'stat-value' }, ['—']);
  const tntRead = el('span', { class: 'stat-value' }, ['—']);
  const verdict = el('p', { class: 'punchline' }, ['']);

  function update(): void {
    const gamma = lorentzFactor(speed);
    const rest = energy(massKg, 0);
    const total = energy(massKg, speed);
    const kinetic = kineticEnergy(massKg, speed);

    restRead.textContent = `${sci(rest, 4)} J`;
    totalRead.textContent = `${sci(total, 4)} J`;
    kineticRead.textContent = kinetic < 1e-3 ? `${sci(kinetic, 3)} J` : `${num(kinetic, 1)} J`;
    gammaRead.textContent = `${num(gamma, 4)}×`;

    const megatons = rest / J_PER_TON_TNT / 1e6;
    tntRead.textContent = `${num(megatons, 1)} Mt`;
    verdict.textContent =
      `${num(massKg, 2)} kg of ship, sitting in the hangar or streaking past Proxima, holds the ` +
      `same ${sci(rest, 3)} J — the energy of ${num(megatons, 1)} megatons of TNT, about ` +
      `${num(megatons / 0.015, 0)} times the Hiroshima bomb. Speed adds more on top of that, and ` +
      `the bill climbs steeply as you approach light.`;

    // The rest energy is the reference width; everything else scales against it.
    const relative = (value: number): string =>
      `${Math.max(0.3, (value / (rest || 1)) * 100)}%`;
    restFill.style.width = relative(rest);
    totalFill.style.width = relative(total);
    kineticFill.style.width = relative(kinetic);
  }

  const restFill = el('div', { class: 'bar-fill', style: `background:${palette.dim}` });
  const totalFill = el('div', { class: 'bar-fill', style: `background:${palette.light}` });
  const kineticFill = el('div', { class: 'bar-fill', style: `background:${palette.ship}` });

  const massSlider = slider(
    {
      label: 'Mass of the thing you are moving',
      min: 0.001,
      max: 1000,
      step: 0.001,
      value: massKg,
      transform: (raw) => Math.pow(10, -3 + (raw / 1000) * 6),
      display: (v) => (v < 1 ? `${num(v * 1000, 1)} g` : `${num(v, 2)} kg`),
      hint: 'Logarithmic, from a grain of sand to a small car. Try the ship, or a person.',
    },
    (v) => {
      massKg = v;
      update();
    },
  );

  const speedSlider = slider(
    {
      label: 'The Wayfarer\u2019s speed',
      min: 0,
      max: 0.99,
      step: 0.01,
      value: speed / C,
      display: percentOfC,
    },
    (v) => {
      speed = v * C;
      update();
    },
  );

  const bars = el('div', { class: 'bars' }, [
    el('div', {}, [
      el('div', { class: 'bar-row' }, [
        el('div', { class: 'bar-name' }, [
          el('span', { class: 'swatch', style: `background:${palette.dim}` }),
          'Rest energy, mc²',
        ]),
        el('div', { class: 'bar-track' }, [restFill]),
      ]),
    ]),
    el('div', {}, [
      el('div', { class: 'bar-row' }, [
        el('div', { class: 'bar-name' }, [
          el('span', { class: 'swatch', style: `background:${palette.light}` }),
          'Total energy, γmc²',
        ]),
        el('div', { class: 'bar-track' }, [totalFill]),
      ]),
    ]),
    el('div', {}, [
      el('div', { class: 'bar-row' }, [
        el('div', { class: 'bar-name' }, [
          el('span', { class: 'swatch', style: `background:${palette.ship}` }),
          'Kinetic energy, (γ−1)mc²',
        ]),
        el('div', { class: 'bar-track' }, [kineticFill]),
      ]),
    ]),
  ]);

  const stats = el('div', { class: 'stats' }, [
    el('div', { class: 'stat' }, [el('span', { class: 'stat-label' }, ['Rest energy']), restRead]),
    el('div', { class: 'stat' }, [el('span', { class: 'stat-label' }, ['Total energy']), totalRead]),
    el('div', { class: 'stat' }, [el('span', { class: 'stat-label' }, ['Kinetic energy']), kineticRead]),
    el('div', { class: 'stat' }, [el('span', { class: 'stat-label' }, ['γ']), gammaRead]),
    el('div', { class: 'stat' }, [
      el('span', { class: 'stat-label' }, ['That energy as TNT']),
      tntRead,
    ]),
  ]);

  update();

  return el('section', { class: 'panel' }, [
    el('div', { class: 'panel-head' }, [
      el('h3', { class: 'panel-title' }, ['Mass is energy, already']),
      el('p', { class: 'panel-sub' }, [
        frag([
          'Your own mass, the ship\u2019s hull, the fuel. All of it holds this energy ',
          'whether or not anything is moving.',
        ]),
      ]),
    ]),
    el('div', { class: 'panel-body' }, [stats, bars, verdict]),
    el('div', { class: 'controls' }, [massSlider.root, speedSlider.root]),
  ]);
}