import { C, beta as toBeta, lorentzFactor, properTime } from '../relativity.js';
import {
  duration,
  el,
  frag,
  num,
  palette,
  percentOfC,
  segmented,
  slider,
} from './ui.js';

/**
 * What the dilation actually costs you, on a round trip to somewhere real.
 *
 * The framing matters: nobody is moved by a Lorentz factor, but everybody has
 * a picture of what it means to be young when you get home.
 */

interface Destination {
  id: string;
  name: string;
  lightYears: number;
  blurb: string;
}

const DESTINATIONS: readonly Destination[] = [
  {
    id: 'proxima',
    name: 'Proxima Centauri',
    lightYears: 4.2465,
    blurb: 'The nearest star to the Sun. 4.25 light-years.',
  },
  {
    id: 'sirius',
    name: 'Sirius',
    lightYears: 8.611,
    blurb: 'Brightest star in our night sky, 8.6 light-years out.',
  },
  {
    id: 'altair',
    name: 'Altair',
    lightYears: 16.7,
    blurb: '16.7 light-years. Genuinely the far side of the neighbourhood.',
  },
  {
    id: 'gal centre',
    name: 'Galactic Centre',
    lightYears: 26_000,
    blurb: 'The black hole at the middle of the Milky Way.',
  },
  {
    id: 'andromeda',
    name: 'Andromeda',
    lightYears: 2_537_000,
    blurb: 'A whole other galaxy, on a collision course with ours.',
  },
];

const SPEED_PRESETS: ReadonlyArray<{ label: string; beta: number }> = [
  { label: '0.1c', beta: 0.1 },
  { label: '0.5c', beta: 0.5 },
  { label: '0.9c', beta: 0.9 },
  { label: '0.99c', beta: 0.99 },
  { label: '0.9999c', beta: 0.999_999_9 },
];

/**
 * Slider position is logarithmic in speed, so the last sliver below c is
 * reachable with a linear track. Two conversions, because two different
 * representations are in play: the slider works in metres per second (what
 * every function in the relativity module expects) while the display works in
 * a fraction of c.
 */
/** Slider position for roughly 0.99c: high enough to be striking on arrival. */
const DEFAULT_RAW = 998;

const rawToFraction = (raw: number): number => Math.pow(10, -2 + (raw / 1000) * 1.999_999);
const rawToSpeed = (raw: number): number => rawToFraction(raw) * C;
const speedDisplay = (metresPerSecond: number): string => percentOfC(toBeta(metresPerSecond));

function firstDestination(): Destination {
  const [first] = DESTINATIONS;
  if (!first) throw new Error('DESTINATIONS must not be empty');
  return first;
}

const FIRST_DESTINATION = firstDestination();

export function tripCalculator(): HTMLElement {
  let destination: Destination = FIRST_DESTINATION;
  let speed = rawToSpeed(DEFAULT_RAW);

  const destNote = el('p', { class: 'panel-sub' }, [frag([destination.blurb])]);
  const verdict = el('p', { class: 'punchline' }, ['']);

  const yourValue = el('span', { class: 'stat-value' }, ['—']);
  const earthValue = el('span', { class: 'stat-value' }, ['—']);
  const gammaValue = el('span', { class: 'stat-value' }, ['—']);
  const newsValue = el('span', { class: 'stat-value' }, ['—']);

  const yourFill = el('div', { class: 'bar-fill', style: `background:${palette.ship}` });
  const earthFill = el('div', { class: 'bar-fill', style: `background:${palette.home}` });
  const yourCaption = el('div', { class: 'bar-read' }, [
    el('span', {}, ['0']),
    el('span', {}, ['—']),
  ]);
  const earthCaption = el('div', { class: 'bar-read' }, [
    el('span', {}, ['0']),
    el('span', {}, ['—']),
  ]);

  const barCaption = yourCaption.lastElementChild as HTMLElement;
  const earthBarCaption = earthCaption.lastElementChild as HTMLElement;

  function update(): void {
    const beta = toBeta(speed);
    const gamma = lorentzFactor(speed);
    const d = destination.lightYears;

    // The ship covers 2d, so Earth sees 2d/beta years elapse; the ship's own
    // clock shows that divided by gamma.
    const earthYears = (2 * d) / beta;
    const yourYears = properTime(earthYears, speed);

    yourValue.textContent = duration(yourYears);
    earthValue.textContent = duration(earthYears);
    gammaValue.textContent = `${num(gamma, gamma < 100 ? 2 : 0)}×`;
    newsValue.textContent = duration(2 * d);

    yourFill.style.width = `${Math.max(0.4, 100 / gamma)}%`;
    earthFill.style.width = '100%';
    barCaption.textContent = duration(yourYears);
    earthBarCaption.textContent = duration(earthYears);

    const newsYears = 2 * d;
    const margin = newsYears - yourYears;
    verdict.textContent =
      margin > 0
        ? `You arrive home ${duration(margin)} before a light signal sent from Earth today ` +
          `would even get back. You were away for ${duration(yourYears)}; everyone at home ` +
          `aged ${duration(earthYears)}.`
        : `Too slow to outrun the news: a signal sent from Earth today gets back ` +
          `${duration(-margin)} before you do. You need to be moving faster for the trip to ` +
          `beat the mail.`;
  }

  const destPicker = segmented(
    'Destination',
    DESTINATIONS.map((d) => ({ value: d.id, label: d.name })),
    destination.id,
    (id) => {
      destination = DESTINATIONS.find((d) => d.id === id) ?? FIRST_DESTINATION;
      destNote.textContent = destination.blurb;
      update();
    },
  );

  const speedControl = slider(
    {
      label: 'Your speed (logarithmic)',
      min: 0,
      max: 1000,
      step: 1,
      value: DEFAULT_RAW,
      transform: rawToSpeed,
      display: speedDisplay,
      hint: 'The scale is logarithmic, so the last sliver below light speed is reachable.',
    },
    (v) => {
      speed = v;
      update();
    },
  );

  const presets = el('div', { class: 'control' }, [
    el('span', { class: 'control-label' }, ['Jump to']),
    el('div', { class: 'segmented' }, [
      ...SPEED_PRESETS.map((preset) => {
        const button = el('button', { type: 'button', class: 'segment' }, [preset.label]);
        button.addEventListener('click', () => {
          speed = preset.beta * C;
          speedControl.set(speed);
          update();
        });
        return button;
      }),
    ]),
  ]);

  const stats = el('div', { class: 'stats' }, [
    el('div', { class: 'stat' }, [el('span', { class: 'stat-label' }, ['You, on board']), yourValue]),
    el('div', { class: 'stat' }, [el('span', { class: 'stat-label' }, ['Earth, at home']), earthValue]),
    el('div', { class: 'stat' }, [el('span', { class: 'stat-label' }, ['Time dilation γ']), gammaValue]),
    el('div', { class: 'stat' }, [
      el('span', { class: 'stat-label' }, ['Signal round trip']),
      newsValue,
      el('span', { class: 'stat-hint' }, ['light, out and back']),
    ]),
  ]);

  const bars = el('div', { class: 'bars' }, [
    el('div', {}, [
      el('div', { class: 'bar-row' }, [
        el('div', { class: 'bar-name' }, [
          el('span', { class: 'swatch', style: `background:${palette.ship}` }),
          'Your clock',
        ]),
        el('div', { class: 'bar-track' }, [yourFill]),
      ]),
      yourCaption,
    ]),
    el('div', {}, [
      el('div', { class: 'bar-row' }, [
        el('div', { class: 'bar-name' }, [
          el('span', { class: 'swatch', style: `background:${palette.home}` }),
          'Earth’s clock',
        ]),
        el('div', { class: 'bar-track' }, [earthFill]),
      ]),
      earthCaption,
    ]),
  ]);

  update();

  return el('section', { class: 'panel' }, [
    el('div', { class: 'panel-head' }, [
      el('h3', { class: 'panel-title' }, ['What it costs you']),
      el('p', { class: 'panel-sub' }, [
        frag(['Round trip, out and back, at constant speed the whole way.']),
      ]),
    ]),
    el('div', { class: 'panel-body' }, [stats, bars, verdict, el('p', { class: 'panel-sub', style: 'margin:0' }, [destNote])]),
    el('div', { class: 'controls' }, [destPicker.root, speedControl.root, presets]),
  ]);
}