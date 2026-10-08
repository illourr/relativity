import { el } from './ui.js';

/**
 * Predict–Observe–Explain, compressed.
 *
 * POE is the workhorse of physics-ed research: students commit to an answer
 * *before* the animation runs, then confront it with what actually happens.
 * Marzari et al. adopt it as their default precisely because alternate
 * conceptions are abundant, and the prediction is what surfaces them. Scherr's
 * tutorials use the same elicit–confront–resolve spine.
 *
 * Predicting badly here is the point, not a failure. The prompt says so.
 */

export interface PredictionOption {
  label: string;
  /** Whether this answer is the one the visualisation will demonstrate. */
  correct: boolean;
  /** Shown after the reveal, whether or not they picked this one. */
  why: string;
}

export interface PredictionSpec {
  question: string;
  options: readonly PredictionOption[];
  /** Shown after the reveal. */
  takeaway: string;
}

export interface PredictionPrompt {
  root: HTMLElement;
  /** Swap the prompt for the reveal once the student commits. */
  reveal: () => void;
}

/**
 * Builds a two-stage prompt: options first, explanation after. Stays collapsed
 * until `reveal` is called, so it never leaks the answer by being on screen.
 */
export function predictionPrompt(spec: PredictionSpec): PredictionPrompt {
  const options = el('div', { class: 'poe-options' });
  const buttons: HTMLButtonElement[] = [];

  const revealBlock = el('div', { class: 'poe-reveal', hidden: true });
  let answered = false;
  let chosenIndex = -1;

  for (const [index, option] of spec.options.entries()) {
    const button = el('button', { type: 'button', class: 'poe-option' }, [
      el('span', { class: 'poe-mark' }, ['○']),
      el('span', { class: 'poe-text' }, [option.label]),
    ]) as HTMLButtonElement;
    button.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      chosenIndex = index;
      reveal();
      // Mark the chosen answer and the correct one distinctly.
      button.classList.add(option.correct ? 'is-correct' : 'is-wrong');
      const mark = button.querySelector('.poe-mark');
      if (mark) mark.textContent = option.correct ? '✓' : '✕';
      for (const [i, other] of spec.options.entries()) {
        if (!other.correct) continue;
        if (i === spec.options.indexOf(option)) continue;
        const btn = buttons[i];
        if (btn) btn.classList.add('is-correct');
        const m = btn?.querySelector('.poe-mark');
        if (m) m.textContent = '✓';
      }
      for (const b of buttons) b.disabled = true;
      // Always show the reasoning for the correct answer.
      const correctBtn = buttons[spec.options.findIndex((o) => o.correct)];
      correctBtn?.classList.add('is-revealed');
    });
    buttons.push(button);
    options.append(button);
  }

  // Declared before use below via hoisting of the const closure.
  const reveal = (): void => {
    const chosen = chosenIndex >= 0 ? spec.options[chosenIndex] : undefined;
    const correctIndex = spec.options.findIndex((o) => o.correct);
    const correct = correctIndex >= 0 ? spec.options[correctIndex] : undefined;

    const parts: HTMLElement[] = [];
    // Show the student's own reasoning first if it was the wrong one. Saying
    // "Right..." to someone who just answered incorrectly is its own small
    // failure, and it hides the misconception they are actually holding.
    if (chosen && !chosen.correct) {
      parts.push(
        el('p', { class: 'poe-chosen-why' }, [
          el('span', { class: 'poe-badge' }, ['You said']),
          chosen.why,
        ]),
      );
    }
    if (correct && correct !== chosen) {
      parts.push(
        el('p', { class: 'poe-why' }, [
          el('span', { class: 'poe-badge poe-badge-correct' }, ['Actually']),
          correct.why,
        ]),
      );
    }
    parts.push(el('p', { class: 'poe-takeaway' }, [spec.takeaway]));
    revealBlock.replaceChildren(...parts);
    revealBlock.hidden = false;
  };

  const root = el('div', { class: 'poe' }, [
    el('p', { class: 'poe-question' }, [spec.question]),
    options,
    el('p', { class: 'poe-hint' }, [
      'No idea? That is the most common starting point — the usual wrong answer is the interesting one.',
    ]),
    revealBlock,
  ]);

  return { root, reveal };
}