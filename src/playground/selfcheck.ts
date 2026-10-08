import { el, frag } from './ui.js';

/**
 * A short diagnostic, not a quiz.
 *
 * Two reasons this exists in this shape. First, the Relativity Concept
 * Inventory (Aslanides & Savage) found that students score around 51% correct
 * while reporting 66% confidence, with the gap largest on simultaneity — they
 * are wrong *and* sure. Second, the same work shows the two lowest-scoring
 * concepts are relativity of simultaneity and velocity composition, and that
 * "what you see" confusions persist even after instruction.
 *
 * So each item asks for a confidence rating alongside the answer. A wrong
 * answer marked "sure" is a different classroom problem from a wrong answer
 * marked "guessing", and the feedback says which one you are looking at.
 */

interface Item {
  id: string;
  question: string;
  options: readonly { label: string; correct: boolean; feedback: string }[];
}

const ITEMS: readonly Item[] = [
  {
    id: 'asymmetry',
    question:
      'You are watching a clock on a ship pass by at high speed. Your own clock, compared to ' +
      'the ship’s, runs:',
    options: [
      {
        label: 'Normally. Only the moving clock is affected.',
        correct: false,
        feedback:
          'This is the asymmetry misconception, and it is the most common one in the literature. ' +
          'It treats one frame as the genuine one. Relativity says every observer measures every ' +
          'other clock as slow — including yours, from the ship.',
      },
      {
        label: 'Slowly. Every observer measures every other clock as slow.',
        correct: true,
        feedback:
          'Right, and note the symmetry: it applies to you exactly as it applies to the ship.',
      },
    ],
  },
  {
    id: 'simultaneity',
    question:
      'Two lamps flash at either end of the moving ship at the same instant according to Ana, ' +
      'standing on the ground. According to you, riding the ship:',
    options: [
      {
        label: 'Also at the same instant. They flashed together, so they flashed together.',
        correct: false,
        feedback:
          'This is absolute simultaneity, the single lowest-scoring concept on the RCI. Two ' +
          'events that are simultaneous for one observer are generally not for another, and this ' +
          'is what makes the twin paradox work.',
      },
      {
        label: 'Not together. The lamp at the front flashes first.',
        correct: true,
        feedback:
          'Correct — and it is a consequence of light having the same speed for everyone, not a ' +
          'separate assumption. If light always travels at c, "at the same moment" cannot be ' +
          'shared across moving frames.',
      },
      {
        label: 'I would need to know how far away the flashes were to say.',
        correct: false,
        feedback:
          'Careful — that is the answer to "when does the light reach my eye", which is a ' +
          'different question. The flashes happened at a definite place and time. The question ' +
          'here is when they happened, not when you found out.',
      },
    ],
  },
  {
    id: 'contraction',
    question:
      'A rod is one light-second long at rest. It is moving past you at 0.9c. Using a ruler ' +
      'sitting at rest beside you, you measure it as:',
    options: [
      {
        label: '0.44 light-seconds — shorter than its rest length.',
        correct: true,
        feedback:
          'Right: 1/γ at 0.9c, and γ = 2.29. Note that this is a measurement with a ruler, not ' +
          'something you saw. Looking at a moving rod does not show you a squashed rod.',
      },
      {
        label: 'One light-second. Length is length however fast it moves.',
        correct: false,
        feedback:
          'Classical. RCI results put length contraction among the best-understood relativity ' +
          'concepts, so if this felt obvious, it is worth being careful — the catch is in the ' +
          'next question.',
      },
      {
        label: 'More than one, because it is stretched by its own motion.',
        correct: false,
        feedback: 'The sign is wrong. Moving objects are measured shorter, never longer.',
      },
    ],
  },
  {
    id: 'see-vs-measure',
    question:
      'Which of these is something an observer actually sees happen to a fast-moving clock?',
    options: [
      {
        label: 'The clock running slow.',
        correct: false,
        feedback:
          'This is the "invisibility" misconception. Nobody sees a dilated clock. What happens is ' +
          'that light takes longer to reach your eye, so you receive it at a Doppler-shifted ' +
          'rate — which is a different effect with a different formula.',
      },
      {
        label: 'A run of flashes arriving at a rate shifted by the Doppler effect.',
        correct: true,
        feedback:
          'Correct. What you see and what you measure are different things, and the equations ' +
          'in every textbook describe the measurement. Hughes & Kersting call these the ' +
          'world-picture and the world-map.',
      },
      {
        label: 'A shorter clock.',
        correct: false,
        feedback: 'You do not see a squashed clock either. Same misconception as the first option.',
      },
    ],
  },
  {
    id: 'why-younger',
    question:
      'You return from a fast round trip younger than Ana. The reason is that:',
    options: [
      {
        label: 'You were moving faster.',
        correct: false,
        feedback:
          'Close, but it does not identify the asymmetry. Going fast alone does nothing — ' +
          'symmetry means going fast and staying out forever leaves you with no reunion to ' +
          'compare clocks at.',
      },
      {
        label: 'You turned around.',
        correct: true,
        feedback:
          'Right. You cannot get younger by going fast; only by going fast and coming back. ' +
          'Coming back means switching reference frames, and that is the whole content of the ' +
          'paradox. It is also why the equation has no answer for a one-way trip.',
      },
      {
        label: 'You were farther from Earth.',
        correct: false,
        feedback:
          'No. Distance does nothing to clocks — sitting still four light-years away, you would ' +
          'age normally. The trip distance is scenery; the turnaround is the physics.',
      },
    ],
  },
  {
    id: 'velocity-add',
    question:
      'Two ships each travelling at 0.9c relative to Earth, in the same direction. Earth sees ' +
      'them close together. How fast does each ship see the other approaching?',
    options: [
      {
        label: '1.8c.',
        correct: false,
        feedback:
          'The Galilean answer, and the one that breaks causality. If speeds added like this, a ' +
          'faster-than-light object could be made by two slow ones, which cannot be.',
      },
      {
        label: 'About 0.994c.',
        correct: true,
        feedback:
          'Correct. Speeds compose like angles, not like distances, so the composition of two ' +
          'sub-light speeds is always sub-light. This is the same algebra that makes γ appear.',
      },
      {
        label: '0.9c, the same, by symmetry.',
        correct: false,
        feedback:
          'Not this pair. Two ships at equal speed in the same direction genuinely see each other ' +
          'as stationary relative to one another — but neither is at rest in the Earth frame, so ' +
          'that reading does not give you 0.9c.',
      },
    ],
  },
];

type Confidence = 1 | 2 | 3;

export function selfCheck(): HTMLElement {
  const responses = new Map<string, { choice: number; confidence: Confidence }>();
  const summary = el('div', { class: 'selfcheck-summary' });
  const list = el('div', { class: 'selfcheck-list' });

  function renderSummary(): void {
    const answered = [...responses.values()];
    if (answered.length === 0) {
      summary.replaceChildren(
        el('p', { class: 'selfcheck-idle' }, [
          'Six questions. Answer first, rate your confidence second — the second part matters ' +
            'more than it looks.',
        ]),
      );
      return;
    }
    const score = answered.filter(isCorrect).length;
    const confidentWrong = answered.filter(
      (r) => !isCorrect(r) && r.confidence === 3,
    ).length;

    summary.replaceChildren(
      el('p', { class: 'selfcheck-score' }, [
        `${score} of ${answered.length} correct`,
        answered.length < ITEMS.length
          ? el('span', { class: 'selfcheck-partial' }, [` · ${ITEMS.length - answered.length} to go`])
          : el('span', {}),
      ]),
      answered.length === ITEMS.length && confidentWrong > 0
        ? el('p', { class: 'selfcheck-warn' }, [
            `${confidentWrong} answered wrongly with high confidence. In this topic that is the `,
            'pattern worth chasing — the intuition feels solid precisely where it is wrong. ' +
            'Re-read the ones you marked sure.',
          ])
        : answered.length === ITEMS.length
          ? el('p', { class: 'selfcheck-ok' }, [
              'Worth reading the feedback on anything you got right by luck.',
            ])
          : el('span', {}),
    );
  }

  function findEntry(response: { choice: number; confidence: Confidence }): { item: Item } | null {
    for (const [id, value] of responses) {
      if (value === response) {
        const item = ITEMS.find((i) => i.id === id);
        return item ? { item } : null;
      }
    }
    return null;
  }

  function isCorrect(response: { choice: number; confidence: Confidence }): boolean {
    const entry = findEntry(response);
    if (!entry) return false;
    return entry.item.options[response.choice]?.correct === true;
  }

  for (const item of ITEMS) {
    const feedback = el('div', { class: 'selfcheck-feedback', hidden: true });
    const confidenceRow = el('div', { class: 'selfcheck-confidence', hidden: true }, [
      el('span', { class: 'selfcheck-confidence-label' }, ['How sure were you?']),
    ]);
    const optionButtons: HTMLButtonElement[] = [];

    const choose = (index: number): void => {
      responses.set(item.id, { choice: index, confidence: responses.get(item.id)?.confidence ?? 2 });
      for (const [i, b] of optionButtons.entries()) {
        b.disabled = true;
        const option = item.options[i];
        if (option?.correct) b.classList.add('is-correct');
        else if (i === index) b.classList.add('is-wrong');
      }
      const chosen = item.options[index];
      feedback.replaceChildren(el('p', {}, [chosen?.feedback ?? '']));
      feedback.hidden = false;
      confidenceRow.hidden = false;
      renderSummary();
    };

    for (const [index, option] of item.options.entries()) {
      const button = el('button', { type: 'button', class: 'selfcheck-option' }, [
        el('span', { class: 'poe-mark' }, ['○']),
        el('span', {}, [option.label]),
      ]) as HTMLButtonElement;
      button.addEventListener('click', () => choose(index));
      optionButtons.push(button);
    }

    const confidenceButtons: HTMLButtonElement[] = [];
    for (const [level, text] of [
      [1, 'Guessing'],
      [2, 'Fairly sure'],
      [3, 'Sure'],
    ] as const) {
      const button = el('button', { type: 'button', class: 'poe-option' }, [
        el('span', { class: 'poe-mark' }, ['○']),
        el('span', {}, [text]),
      ]) as HTMLButtonElement;
      button.addEventListener('click', () => {
        const current = responses.get(item.id);
        if (!current) return;
        responses.set(item.id, { ...current, confidence: level });
        for (const [i, b] of confidenceButtons.entries()) {
          b.classList.toggle('is-correct', i + 1 === level);
          const mark = b.querySelector('.poe-mark');
          if (mark) mark.textContent = i + 1 === level ? '✓' : '○';
        }
        renderSummary();
      });
      confidenceButtons.push(button);
      confidenceRow.append(button);
    }

    list.append(
      el('div', { class: 'selfcheck-item' }, [
        el('p', { class: 'selfcheck-question' }, [item.question]),
        el('div', { class: 'selfcheck-options' }, optionButtons),
        confidenceRow,
        feedback,
      ]),
    );
  }

  renderSummary();

  return el('section', { class: 'selfcheck' }, [
    el('h3', { class: 'selfcheck-heading' }, ['Check yourself before the rest']),
    el('p', { class: 'selfcheck-intro' }, [
      frag([
        'These six are the questions that physics-education research finds students get wrong ' +
          'most often — including after instruction. Pick an answer, then pick a confidence ' +
          'level. ',
        el('span', {}, [
          'Research on this topic finds students average about 51% correct while reporting 66% ' +
            'confidence, and the gap is widest on simultaneity.',
        ]),
      ]),
    ]),
    summary,
    list,
  ]);
}