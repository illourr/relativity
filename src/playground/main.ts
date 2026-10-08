import './styles.css';

import { gammaTable } from './gammatable.js';
import { lightClock } from './lightclock.js';
import { massEnergy } from './massenergy.js';
import { simultaneity } from './simultaneity.js';
import { spacetime } from './spacetime.js';
import { speedLimit } from './speedlimit.js';
import { tripCalculator } from './trip.js';

/** Mount order follows the order the prose introduces the ideas. */
const MODULES: ReadonlyArray<readonly [string, () => HTMLElement]> = [
  ['module-clock', lightClock],
  ['module-gamma', gammaTable],
  ['module-trip', tripCalculator],
  ['module-simultaneity', simultaneity],
  ['module-spacetime', spacetime],
  ['module-wall', speedLimit],
  ['module-mass', massEnergy],
];

function mount(): void {
  for (const [id, factory] of MODULES) {
    const host = document.getElementById(id);
    if (!host) continue;
    try {
      host.replaceChildren(factory());
    } catch (error) {
      // One broken module must not blank the rest of the page; say so loudly
      // instead, so the failure is visible rather than silent.
      const message = error instanceof Error ? error.message : String(error);
      host.append(
        Object.assign(document.createElement('p'), {
          className: 'note note-caution',
          textContent: `This panel failed to load: ${message}`,
        }),
      );
      console.error(`[relativity] failed to mount ${id}`, error);
    }
  }
}

// Scroll-spy for the contents list, so the reader knows where they are.
function markCurrentSection(): void {
  const links = new Map<string, HTMLAnchorElement>();
  for (const anchor of document.querySelectorAll<HTMLAnchorElement>('.contents a')) {
    const href = anchor.getAttribute('href');
    if (href) links.set(href.slice(1), anchor);
  }

  const sections = [...links.keys()]
    .map((id) => document.getElementById(id))
    .filter((node): node is HTMLElement => node !== null);

  let current = '';
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) current = entry.target.id;
      }
      for (const [id, anchor] of links) {
        const active = id === current;
        anchor.style.color = active ? 'var(--ship)' : '';
        anchor.style.borderBottomColor = active ? 'currentColor' : 'transparent';
      }
    },
    { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
  );

  for (const section of sections) observer.observe(section);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    mount();
    markCurrentSection();
  });
} else {
  mount();
  markCurrentSection();
}