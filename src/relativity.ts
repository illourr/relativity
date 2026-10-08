/**
 * Special-relativity kinematics and dynamics.
 *
 * Everything here assumes flat spacetime, inertial frames, and a Lorentzian
 * metric. Two conventions are used throughout:
 *
 *   - `properX` is the value measured in the frame comoving with the object
 *     (proper time, proper length, rest mass).
 *   - `observedX` is the value measured by an observer in the lab frame.
 */

/** Speed of light in vacuum, exactly 299_792_458 m/s (SI definition). */
export const C = 299_792_458;

const DEFAULT_TOLERANCE = 1e-9;

function assertFinite(value: number, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number, received ${String(value)}`);
  }
  return value;
}

/**
 * Validates that `speed` is a finite number strictly inside the light cone.
 * Positions on or beyond the light cone are unreachable for massive bodies.
 */
function assertSubLuminal(speed: number, tolerance = DEFAULT_TOLERANCE): number {
  assertFinite(speed, 'speed');
  const magnitude = Math.abs(speed);
  if (magnitude >= C) {
    throw new RangeError(
      `speed ${speed} m/s is not sub-luminal (c = ${C} m/s); ` +
        'relativistic formulas are undefined at or above c',
    );
  }
  if (magnitude > C * (1 - tolerance)) {
    // 1 - beta**2 underflows to 0 well before this point, which would make the
    // Lorentz factor infinite rather than merely large.
    throw new RangeError(
      `speed ${speed} m/s is within ${tolerance * 100}% of c; ` +
        'gamma exceeds what double precision can represent',
    );
  }
  return speed;
}

/** Dimensionless speed, v/c. */
export function beta(speed: number): number {
  return assertSubLuminal(speed) / C;
}

/**
 * Lorentz factor gamma = 1 / sqrt(1 - beta^2).
 *
 * gamma = 1 at rest and grows without bound as v approaches c.
 */
export function lorentzFactor(speed: number): number {
  const b = beta(speed);
  return 1 / Math.sqrt(1 - b * b);
}

/** Speed v = beta * c, for a given dimensionless beta in (-1, 1). */
export function speedFromBeta(b: number): number {
  assertFinite(b, 'beta');
  if (Math.abs(b) >= 1) {
    throw new RangeError(`beta ${b} must lie strictly between -1 and 1`);
  }
  return b * C;
}

/** Speed as a fraction of c, rounded for display. */
export function fractionOfC(speed: number, digits = 6): number {
  return Number(beta(speed).toFixed(digits));
}

/**
 * Time dilation: how much coordinate time passes in the lab frame while a
 * moving clock accumulates `properSeconds` on its own clock.
 *
 * The moving clock runs slow, so observed >= proper.
 */
export function timeDilation(properSeconds: number, speed: number): number {
  assertFinite(properSeconds, 'properSeconds');
  if (properSeconds < 0) {
    throw new RangeError(`properSeconds must be non-negative, received ${properSeconds}`);
  }
  return properSeconds * lorentzFactor(speed);
}

/**
 * Inverse time dilation: the time a moving clock shows after `observedSeconds`
 * of lab time has elapsed.
 */
export function properTime(observedSeconds: number, speed: number): number {
  assertFinite(observedSeconds, 'observedSeconds');
  if (observedSeconds < 0) {
    throw new RangeError(`observedSeconds must be non-negative, received ${observedSeconds}`);
  }
  return observedSeconds / lorentzFactor(speed);
}

/**
 * Length contraction: the length a lab observer measures for an object whose
 * proper (rest-frame) length is `properMeters`.
 *
 * Contraction happens along the direction of motion only.
 */
export function lengthContraction(properMeters: number, speed: number): number {
  assertFinite(properMeters, 'properMeters');
  if (properMeters < 0) {
    throw new RangeError(`properMeters must be non-negative, received ${properMeters}`);
  }
  return properMeters / lorentzFactor(speed);
}

/**
 * Einstein velocity addition for collinear motion.
 *
 * If an object moves at `u` in a frame that itself moves at `v` relative to the
 * lab, its lab velocity is (u + v) / (1 + u*v/c^2). Both inputs share a sign
 * convention: positive is the same direction.
 *
 * For u = v = 0.9c the result is ~0.9945c, not the 1.8c a Galilean sum gives.
 */
export function velocityAddition(u: number, v: number): number {
  assertSubLuminal(u);
  assertSubLuminal(v);
  return (u + v) / (1 + (u * v) / (C * C));
}

/**
 * Time-dilation rate: d(proper time)/d(lab time) = 1/gamma = sqrt(1 - beta^2).
 * Useful as a multiplier for slowing down an animation or clock.
 */
export function timeDilationRate(speed: number): number {
  const b = beta(speed);
  return Math.sqrt(1 - b * b);
}

/** Relativistic momentum, p = gamma * m * v. */
export function momentum(restMassKg: number, speed: number): number {
  assertFinite(restMassKg, 'restMassKg');
  if (restMassKg < 0) {
    throw new RangeError(`restMassKg must be non-negative, received ${restMassKg}`);
  }
  return lorentzFactor(speed) * restMassKg * speed;
}

/** Total relativistic energy, E = gamma * m * c^2. */
export function energy(restMassKg: number, speed: number): number {
  assertFinite(restMassKg, 'restMassKg');
  if (restMassKg < 0) {
    throw new RangeError(`restMassKg must be non-negative, received ${restMassKg}`);
  }
  return lorentzFactor(speed) * restMassKg * C * C;
}

/**
 * Kinetic energy, K = E - m*c^2.
 *
 * Unlike the Newtonian (m*v^2)/2, this grows without bound as v approaches c,
 * which is why no massive object ever reaches light speed.
 */
export function kineticEnergy(restMassKg: number, speed: number): number {
  assertFinite(restMassKg, 'restMassKg');
  if (restMassKg < 0) {
    throw new RangeError(`restMassKg must be non-negative, received ${restMassKg}`);
  }
  return (lorentzFactor(speed) - 1) * restMassKg * C * C;
}

/**
 * Relativistic Doppler shift for longitudinal motion.
 *
 * @param emittedHz  frequency measured in the source's rest frame
 * @param speed      signed radial velocity of the source as seen by the observer;
 *                   positive means receding (redshift), negative means approaching
 */
export function dopplerShift(emittedHz: number, speed: number): number {
  assertFinite(emittedHz, 'emittedHz');
  if (emittedHz < 0) {
    throw new RangeError(`emittedHz must be non-negative, received ${emittedHz}`);
  }
  assertSubLuminal(speed);
  const b = speed / C;
  return emittedHz * Math.sqrt((1 - b) / (1 + b));
}

export interface RelativityEstimateInput {
  /** Speed of the moving object in m/s. */
  speed: number;
  /** Elapsed time on a clock comoving with the object, in seconds. */
  properSeconds?: number;
  /** Rest-frame length along the direction of motion, in meters. */
  properMeters?: number;
  /** Rest mass in kilograms. */
  restMassKg?: number;
}

export interface RelativityEstimate {
  speed: number;
  beta: number;
  gamma: number;
  /** m/s, plus or minus per axis */
  velocity: { x: number; y: number; z: number };
  /** light-years per year, a convenient unit for interstellar velocities */
  lightYearsPerYear: number;
  timeDilation?: {
    properSeconds: number;
    observedSeconds: number;
    rate: number;
  };
  lengthContraction?: {
    properMeters: number;
    observedMeters: number;
    ratio: number;
  };
  dynamics?: {
    restMassKg: number;
    energyJoules: number;
    kineticEnergyJoules: number;
    momentumKgs: number;
  };
}

const M_PER_LIGHT_YEAR = 9.460_730_472_580_8e15;
const SECONDS_PER_YEAR = 31_557_600;

/**
 * One-shot summary of the relativistic quantities at a given speed. Optional
 * inputs add sections to the result; omitted inputs are simply left out.
 */
export function estimateRelativity(input: RelativityEstimateInput): RelativityEstimate {
  const { speed } = input;
  const gamma = lorentzFactor(speed);
  const b = beta(speed);

  const estimate: RelativityEstimate = {
    speed,
    beta: b,
    gamma,
    velocity: { x: speed, y: 0, z: 0 },
    lightYearsPerYear: speed / (M_PER_LIGHT_YEAR / SECONDS_PER_YEAR),
  };

  if (input.properSeconds !== undefined) {
    estimate.timeDilation = {
      properSeconds: input.properSeconds,
      observedSeconds: timeDilation(input.properSeconds, speed),
      rate: timeDilationRate(speed),
    };
  }

  if (input.properMeters !== undefined) {
    estimate.lengthContraction = {
      properMeters: input.properMeters,
      observedMeters: lengthContraction(input.properMeters, speed),
      ratio: 1 / gamma,
    };
  }

  if (input.restMassKg !== undefined) {
    estimate.dynamics = {
      restMassKg: input.restMassKg,
      energyJoules: energy(input.restMassKg, speed),
      kineticEnergyJoules: kineticEnergy(input.restMassKg, speed),
      momentumKgs: momentum(input.restMassKg, speed),
    };
  }

  return estimate;
}

/** Renders a compact multi-line summary suitable for a console or a log line. */
export function formatEstimate(estimate: RelativityEstimate): string {
  const pct = (estimate.beta * 100).toFixed(4);
  const lines = [
    `speed     ${estimate.speed.toLocaleString('en-US', { maximumFractionDigits: 0 })} m/s ` +
      `(${pct}% of c, ${estimate.lightYearsPerYear.toFixed(3)} ly/yr)`,
    `gamma     ${estimate.gamma.toFixed(6)}`,
  ];

  const td = estimate.timeDilation;
  if (td) {
    lines.push(
      `time      ${td.properSeconds} s on board -> ` +
        `${td.observedSeconds.toFixed(3)} s on the clock at rest (rate ${td.rate.toFixed(6)})`,
    );
  }

  const lc = estimate.lengthContraction;
  if (lc) {
    lines.push(
      `length    ${lc.properMeters} m proper -> ` +
        `${lc.observedMeters.toFixed(4)} m observed (${(lc.ratio * 100).toFixed(4)}%)`,
    );
  }

  const dyn = estimate.dynamics;
  if (dyn) {
    lines.push(
      `mass      ${dyn.restMassKg} kg -> E ${dyn.energyJoules.toExponential(4)} J, ` +
        `K ${dyn.kineticEnergyJoules.toExponential(4)} J, p ${dyn.momentumKgs.toExponential(4)} kg m/s`,
    );
  }

  return lines.join('\n');
}