/** Small DOM, formatting, and animation helpers shared by every module. */

type Attrs = Record<string, string | number | boolean | undefined>;

/** Creates an element with attributes and children in one call. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: Array<Node | string> = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (key === 'class') node.className = String(value);
    else if (key === 'html') node.innerHTML = String(value);
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children) {
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

/** Groups children into a fragment without an extra wrapper element. */
export function frag(children: Array<Node | string>): DocumentFragment {
  const f = document.createDocumentFragment();
  for (const child of children) {
    f.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return f;
}

/** Wraps a heading, paragraph pair in the standard prose block. */
export function prose(heading: string, body: string): HTMLElement {
  return el('div', { class: 'prose' }, [el('h3', {}, [heading]), el('p', {}, [body])]);
}

// ---------------------------------------------------------------- formatting

/** Fixed-decimal with thousands separators, trimmed of trailing noise. */
export function num(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Scientific notation, for energies and other extreme magnitudes. */
export function sci(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  return value.toExponential(digits).replace('e+', ' × 10^').replace('e-', ' × 10^−');
}

/**
 * Percent of light speed, with enough significant digits to stay meaningful
 * near c, where 0.9999 and 0.99999 are wildly different speeds.
 */
export function percentOfC(beta: number): string {
  const pct = beta * 100;
  if (!(pct > 0)) return '0%';
  if (pct < 1) return `${pct.toPrecision(2)}%`;

  // Close to c, count the nines: each extra 9 after the first needs another
  // decimal place, otherwise 99.99% and 99.9999% both collapse to "100%".
  const deficit = 1 - beta;
  const decimals =
    deficit > 0 && deficit < 1
      ? Math.min(12, Math.max(0, Math.ceil(-Math.log10(deficit)) - 2))
      : 2;
  return `${pct.toFixed(decimals)}%`;
}

/** Human duration from a number of years. */
export function duration(years: number): string {
  if (!Number.isFinite(years)) return '—';
  const abs = Math.abs(years);
  if (abs < 1e-6) return 'under a millionth of a second';
  if (abs < 1 / 365.25) return `${num(abs * 365.25, 1)} days`;
  if (abs < 1) return `${num(abs * 365.25, 1)} days`;
  if (abs < 1000) return `${num(years, 2)} years`;
  if (abs < 1e6) return `${num(years, 0)} years`;
  if (abs < 1e9) return `${num(years / 1000, 2)} million years`;
  return `${num(years / 1e9, 2)} billion years`;
}

/** Signed duration, keeping the sign explicit. */
export function signedDuration(years: number): string {
  return `${years < 0 ? '−' : ''}${duration(Math.abs(years))}`;
}

// ------------------------------------------------------------------- ticker

export type Tick = (elapsedMs: number, deltaSeconds: number) => void;

const subscribers = new Set<{ fn: Tick; last: number }>();
let frameHandle = 0;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function runFrame(now: number): void {
  // Copy first: a callback may unsubscribe itself during iteration.
  for (const sub of [...subscribers]) {
    const dt = sub.last === 0 ? 0 : Math.min((now - sub.last) / 1000, 1 / 20);
    sub.last = now;
    sub.fn(now, dt);
  }
  frameHandle = subscribers.size > 0 ? requestAnimationFrame(runFrame) : 0;
}

/** Registers an animation callback. Returns an unsubscribe function. */
export function onTick(fn: Tick): () => void {
  if (prefersReducedMotion()) {
    // Draw a single static frame; modules render a sensible still.
    fn(0, 0);
    return () => {};
  }
  const sub = { fn, last: 0 };
  subscribers.add(sub);
  if (frameHandle === 0) frameHandle = requestAnimationFrame(runFrame);
  return () => {
    subscribers.delete(sub);
    if (subscribers.size === 0 && frameHandle !== 0) {
      cancelAnimationFrame(frameHandle);
      frameHandle = 0;
    }
  };
}

// ------------------------------------------------------------------ canvas

export interface Surface {
  ctx: CanvasRenderingContext2D;
  invalidate: () => void;
}

/**
 * Prepares a canvas for crisp rendering and keeps it sized to its CSS box.
 * Drawing coordinates are in CSS pixels; device pixel ratio is handled here.
 *
 * `draw` is invoked with the context whenever the box size changes, which
 * covers the two cases that otherwise leave a canvas blank: the first real
 * layout after the element is attached (its box is 0×0 while detached), and
 * any later resize. The context is passed in rather than captured so `draw`
 * can be supplied at construction time without a temporal-dead-zone hazard.
 */
export function surface(
  canvas: HTMLCanvasElement,
  draw?: (ctx: CanvasRenderingContext2D) => void,
): Surface {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D canvas context unavailable');
  const ctx: CanvasRenderingContext2D = context;

  let width = 0;
  let height = 0;
  let appliedDpr = -1;

  function resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (w === width && h === height && dpr === appliedDpr) return;
    width = w;
    height = h;
    appliedDpr = dpr;
    // Assigning width/height resets the context transform and clears the
    // backing store, so reapply the transform and repaint immediately.
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw?.(ctx);
  }

  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  window.addEventListener('resize', resize);

  return { ctx, invalidate: resize };
}

/** Palette accessors so every module draws in the same colours. */
export const palette = {
  bg: '#07080c',
  surface: '#141824',
  grid: '#232839',
  gridSoft: '#1a1e2c',
  text: '#eef1f8',
  dim: '#a7b0c4',
  faint: '#69718a',
  home: '#f7a72b',
  ship: '#35d6f0',
  light: '#a98bff',
  good: '#3ddc97',
  bad: '#ff6b6b',
};

export type ColorKey = keyof typeof palette;

/** Rounded rectangle path, used throughout for panels and bars. */
export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Dashed guide line that survives canvas state leakage. */
export function dashedLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  dash: number[] = [4, 5],
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

export function line(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 2,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

/** Small label text on the canvas, matching the page's type scale. */
export function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  size = 12,
  align: CanvasTextAlign = 'left',
  weight = 500,
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** Filled circle. */
export function dot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill: string,
  stroke?: string,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ playback

/**
 * Play / pause / single-step, shared by the animated modules.
 *
 * Barma-Gelb (2007) found learner-paced presentations beat system-paced ones on
 * higher-element-interactivity material, with lower cognitive load — even
 * though students rarely pressed the buttons. The affordance matters more than
 * the usage rate, and it costs one boolean to provide.
 */
export interface Playback {
  root: HTMLElement;
  isPlaying: () => boolean;
  toggle: () => void;
  /** Register a request to advance one frame while paused. */
  step: () => void;
  /** True once per queued step request, so the caller advances one frame. */
  consumeStep: () => boolean;
  /** Re-render the controls after an external change. */
  sync: () => void;
}

export function playback(): Playback {
  let playing = true;
  let queued = 0;

  const playIcon = el('span', { class: 'playback-icon', 'aria-hidden': 'true' }, ['❚❚']);
  const playLabel = el('span', { class: 'playback-label' }, ['Pause']);

  const button = el('button', {
    type: 'button',
    class: 'playback-button',
    'aria-pressed': 'false',
  }, [playIcon, playLabel]) as HTMLButtonElement;

  const stepButton = el('button', { type: 'button', class: 'playback-button' }, [
    el('span', { class: 'playback-icon', 'aria-hidden': 'true' }, ['▶❙']),
    el('span', { class: 'playback-label' }, ['Step']),
  ]) as HTMLButtonElement;

  const sync = (): void => {
    playIcon.textContent = playing ? '❚❚' : '▶';
    playLabel.textContent = playing ? 'Pause' : 'Play';
    button.setAttribute('aria-pressed', String(!playing));
  };

  const toggle = (): void => {
    playing = !playing;
    sync();
  };

  button.addEventListener('click', toggle);
  stepButton.addEventListener('click', () => {
    playing = false;
    queued += 1;
    sync();
  });

  sync();

  return {
    root: el('div', { class: 'playback' }, [button, stepButton]),
    isPlaying: () => playing,
    toggle,
    step: () => {
      queued += 1;
    },
    consumeStep: () => {
      if (queued === 0) return false;
      queued -= 1;
      return true;
    },
    sync,
  };
}

// ------------------------------------------------------------------ controls

export interface SliderSpec {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  /** Maps a raw slider value to the value actually used. */
  transform?: (raw: number) => number;
  /** Renders the current value for the readout. */
  display: (value: number) => string;
  hint?: string;
}

/** A labelled range input wired to a change callback. Returns an update hook. */
export function slider(spec: SliderSpec, onChange: (value: number) => void): {
  root: HTMLElement;
  set: (value: number) => void;
} {
  const readout = el('span', { class: 'slider-value' }, [
    spec.display(spec.transform ? spec.transform(spec.value) : spec.value),
  ]);
  const input = el('input', {
    type: 'range',
    min: spec.min,
    max: spec.max,
    step: spec.step,
    value: spec.value,
    'aria-label': spec.label,
  }) as HTMLInputElement;

  const emit = (): void => {
    const raw = Number(input.value);
    onChange(spec.transform ? spec.transform(raw) : raw);
    readout.textContent = spec.display(spec.transform ? spec.transform(raw) : raw);
  };

  input.addEventListener('input', emit);

  const root = el('div', { class: 'control' }, [
    el('div', { class: 'control-head' }, [el('span', { class: 'control-label' }, [spec.label]), readout]),
    input,
    spec.hint ? el('p', { class: 'control-hint' }, [spec.hint]) : el('span', {}),
  ]);

  return {
    root,
    set(value: number): void {
      const raw = spec.transform ? invertTransform(spec, spec.transform(value)) : value;
      input.value = String(raw);
      readout.textContent = spec.display(value);
    },
  };
}

/**
 * Numeric inverse for a monotone transform, needed so `set` can drive a
 * transformed slider. Falls back to a bisection when no closed form is known.
 */
function invertTransform(spec: SliderSpec, target: number): number {
  const guess = Math.round(((target - spec.min) / (spec.max - spec.min)) * (spec.max - spec.min) + spec.min);
  let lo = spec.min;
  let hi = spec.max;
  const at = (raw: number): number => (spec.transform ? spec.transform(raw) : raw);
  const forward = at(target);
  const ascending = forward >= at(lo);
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const value = at(mid);
    if (Math.abs(value - target) < 1e-12) return mid;
    if (ascending ? value < target : value > target) lo = mid;
    else hi = mid;
  }
  return Number.isFinite(guess) ? guess : (lo + hi) / 2;
}

/** Segmented button group; exactly one option is active. */
export function segmented<T extends string>(
  label: string,
  options: ReadonlyArray<{ value: T; label: string }>,
  initial: T,
  onChange: (value: T) => void,
): { root: HTMLElement; set: (value: T) => void } {
  const buttons = new Map<T, HTMLButtonElement>();
  const group = el('div', { class: 'segmented', role: 'radiogroup', 'aria-label': label });

  const activate = (value: T): void => {
    for (const [key, button] of buttons) {
      const active = key === value;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-checked', String(active));
    }
  };

  for (const option of options) {
    const button = el('button', {
      type: 'button',
      role: 'radio',
      class: 'segment',
      'aria-checked': String(option.value === initial),
    }, [option.label]);
    button.addEventListener('click', () => {
      activate(option.value);
      onChange(option.value);
    });
    buttons.set(option.value, button);
    group.append(button);
  }

  activate(initial);
  return {
    root: el('div', { class: 'control' }, [
      el('span', { class: 'control-label' }, [label]),
      group,
    ]),
    set: activate,
  };
}

/** Checkbox styled as a plain row. */
export function checkbox(
  label: string,
  initial: boolean,
  onChange: (value: boolean) => void,
): { root: HTMLElement; set: (value: boolean) => void } {
  const input = el('input', { type: 'checkbox', checked: initial }) as HTMLInputElement;
  input.addEventListener('change', () => onChange(input.checked));
  const root = el('label', { class: 'toggle' }, [input, el('span', {}, [label])]);
  return {
    root,
    set(value: boolean): void {
      input.checked = value;
    },
  };
}

/** Highlighted inline figure/equation. */
export function formula(tex: string, caption?: string): HTMLElement {
  return el('figure', { class: 'formula' }, [
    el('div', { class: 'formula-body' }, [tex]),
    caption ? el('figcaption', {}, [caption]) : el('span', {}),
  ]);
}

/** Row of label/value pairs, for numeric readouts. */
export function statGrid(rows: ReadonlyArray<{ label: string; id: string; hint?: string }>): {
  root: HTMLElement;
  values: Record<string, HTMLElement>;
} {
  const values: Record<string, HTMLElement> = {};
  const root = el('div', { class: 'stats' });
  for (const row of rows) {
    const value = el('span', { class: 'stat-value' }, ['—']);
    values[row.id] = value;
    root.append(
      el('div', { class: 'stat' }, [
        el('span', { class: 'stat-label' }, [row.label]),
        value,
        row.hint ? el('span', { class: 'stat-hint' }, [row.hint]) : el('span', {}),
      ]),
    );
  }
  return { root, values };
}