import assert from 'node:assert/strict';
import {
  C,
  beta,
  dopplerShift,
  energy,
  estimateRelativity,
  formatEstimate,
  fractionOfC,
  kineticEnergy,
  lengthContraction,
  lorentzFactor,
  momentum,
  properTime,
  speedFromBeta,
  timeDilation,
  timeDilationRate,
  velocityAddition,
} from './relativity.js';

let passed = 0;
function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (error) {
    console.error(`FAIL  ${name}\n      ${(error as Error).message}`);
    process.exitCode = 1;
  }
}

const close = (actual: number, expected: number, eps = 1e-9): void =>
  assert.ok(
    Math.abs(actual - expected) <= eps * Math.max(1, Math.abs(expected)),
    `expected ${actual} to be within ${eps} of ${expected}`,
  );

console.log('relativity self-check\n');

check('gamma(0) === 1', () => assert.equal(lorentzFactor(0), 1));
check('beta(0.6c) === 0.6', () => close(beta(0.6 * C), 0.6, 1e-12));
check('gamma(0.6c) === 1.25', () => close(lorentzFactor(0.6 * C), 1.25, 1e-12));
check('gamma(0.8c) === 5/3', () => close(lorentzFactor(0.8 * C), 5 / 3, 1e-12));
check('speedFromBeta round-trips', () => close(speedFromBeta(beta(0.37 * C)) / C, 0.37, 1e-12));
check('fractionOfC(0.123456789c) rounds', () => assert.equal(fractionOfC(0.123_456_789 * C, 4), 0.1235));

check('1s at 0.6c dilates to 1.25s', () => close(timeDilation(1, 0.6 * C), 1.25, 1e-12));
check('properTime inverts timeDilation', () => close(properTime(timeDilation(60, 0.99 * C), 0.99 * C), 60, 1e-9));
check('dilation rate at 0.6c === 0.8', () => close(timeDilationRate(0.6 * C), 0.8, 1e-12));
check('dilation rate * gamma === 1', () => close(timeDilationRate(0.97 * C) * lorentzFactor(0.97 * C), 1, 1e-12));

check('10m at 0.6c contracts to 8m', () => close(lengthContraction(10, 0.6 * C), 8, 1e-12));
check('contraction ratio === 1/gamma', () =>
  close(lengthContraction(123, 0.42 * C) / 123, 1 / lorentzFactor(0.42 * C), 1e-12));

check('0.9c + 0.9c === (1.8/1.81)c (not 1.8c)', () => {
  const result = velocityAddition(0.9 * C, 0.9 * C);
  close(result, (1.8 / 1.81) * C, 1e-12);
  assert.ok(result < C);
});
check('velocity addition is commutative', () =>
  close(velocityAddition(0.3 * C, -0.7 * C), velocityAddition(-0.7 * C, 0.3 * C), 1e-12));
check('velocity addition with rest frame is identity', () =>
  close(velocityAddition(0.42 * C, 0), 0.42 * C, 1e-12));
check('rapidity adds: gamma(u+v) === gammas * (1 + uv/c^2)', () => {
  const u = 0.4 * C;
  const v = 0.55 * C;
  close(
    lorentzFactor(velocityAddition(u, v)),
    lorentzFactor(u) * lorentzFactor(v) * (1 + (u * v) / (C * C)),
    1e-9,
  );
});

check('E = mc^2 at rest for 1kg', () => close(energy(1, 0), 8.987_551_787_368_176_4e16, 1e-15));
check('K = 0 at rest', () => assert.equal(kineticEnergy(1000, 0), 0));
check('p = 0 at rest', () => assert.equal(momentum(1000, 0), 0));
check('K(1kg, 0.6c) === 0.25 mc^2', () => close(kineticEnergy(1, 0.6 * C), 0.25 * C * C, 1e-12));
check('K grows faster than Newtonian past 0.866c', () => {
  const v = 0.95 * C;
  const classical = 0.5 * v * v;
  assert.ok(kineticEnergy(1, v) > classical);
});
check('p === gamma*m*v', () => close(momentum(2.5, 0.3 * C), lorentzFactor(0.3 * C) * 2.5 * 0.3 * C, 1e-12));
check('E^2 === (pc)^2 + (mc^2)^2', () => {
  const m = 1.7;
  const v = 0.88 * C;
  const lhs = energy(m, v) ** 2;
  const rhs = (momentum(m, v) * C) ** 2 + (m * C * C) ** 2;
  close(lhs, rhs, 1e-9);
});

check('doppler(1000Hz, 0) === 1000Hz', () => close(dopplerShift(1000, 0), 1000, 1e-12));
check('doppler at 0.5c receding === 1000/sqrt(3)', () =>
  close(dopplerShift(1000, 0.5 * C), 1000 / Math.sqrt(3), 1e-12));
check('doppler at 0.5c approaching is the exact inverse', () =>
  close(dopplerShift(dopplerShift(1000, 0.5 * C), -0.5 * C), 1000, 1e-12));

check('full estimate assembles every section', () => {
  const estimate = estimateRelativity({
    speed: 0.99 * C,
    properSeconds: 3600,
    properMeters: 100,
    restMassKg: 1,
  });
  close(estimate.gamma, lorentzFactor(0.99 * C), 1e-12);
  close(estimate.velocity.x, 0.99 * C, 1e-12);
  close(estimate.beta, 0.99, 1e-12);
  close(estimate.lightYearsPerYear, 0.99, 1e-9);
  assert.ok(estimate.timeDilation && estimate.lengthContraction && estimate.dynamics);
  close(estimate.timeDilation.observedSeconds, 3600 * lorentzFactor(0.99 * C), 1e-12);
  close(estimate.lengthContraction.observedMeters, 100 / lorentzFactor(0.99 * C), 1e-12);
  assert.ok(estimate.dynamics.energyJoules > estimate.dynamics.kineticEnergyJoules);
  assert.ok(formatEstimate(estimate).split('\n').length === 5);
});

check('sparse input omits absent sections', () => {
  const estimate = estimateRelativity({ speed: 0.5 * C });
  assert.equal(estimate.timeDilation, undefined);
  assert.equal(estimate.lengthContraction, undefined);
  assert.equal(estimate.dynamics, undefined);
});
check('estimateRelativity rejects exactly c', () =>
  assert.throws(() => estimateRelativity({ speed: C }), RangeError));

check('rejects superluminal speed', () =>
  assert.throws(() => lorentzFactor(C), /not sub-luminal/));
check('rejects exactly c', () => assert.throws(() => lorentzFactor(C), RangeError));
check('rejects NaN', () => assert.throws(() => lorentzFactor(Number.NaN), TypeError));
check('rejects infinity', () => assert.throws(() => lorentzFactor(Number.POSITIVE_INFINITY), TypeError));
check('rejects negative proper time', () => assert.throws(() => timeDilation(-1, C), RangeError));
check('rejects negative mass', () => assert.throws(() => energy(-1, 0), RangeError));
check('rejects |beta| >= 1', () => assert.throws(() => speedFromBeta(1), RangeError));
check('rejects gamma overflow near c', () => assert.throws(() => lorentzFactor(C * (1 - 1e-12)), RangeError));
check('accepts gamma at the tolerance edge', () => assert.ok(Number.isFinite(lorentzFactor(C * (1 - 1e-9)))));

console.log(`\n${passed} checks passed`);
console.log('\nsample: 0.99c, 1 hour aboard a 100 m ship, 1 kg mass\n');
console.log(
  formatEstimate(
    estimateRelativity({
      speed: 0.99 * C,
      properSeconds: 3600,
      properMeters: 100,
      restMassKg: 1,
    }),
  ),
);