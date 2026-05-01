/**
 * Risk Scoring Engine
 *
 * Pure, deterministic, side-effect-free fatigue heuristics. Designed to be
 * called every frame from a render loop (15–30 FPS) with no allocations on
 * the hot path beyond a single number return.
 *
 * Score model (0..100, higher = more fatigued):
 *   eye closure  : 40%   (PERCLOS-style: fraction of time eyes were closed)
 *   blink rate   : 30%   (deviation from a healthy 12–20 blinks/min band)
 *   focus level  : 30%   (1 - focus, where focus is 0..1, higher = more alert)
 *
 * Risk bands:
 *   0–39  Low
 *   40–69 Moderate
 *   70+   High
 */

export type RiskLevel = "low" | "moderate" | "high";

export interface FatigueWeights {
  eyeClosure: number;
  blinkRate: number;
  focus: number;
}

export const DEFAULT_WEIGHTS: FatigueWeights = {
  eyeClosure: 0.4,
  blinkRate: 0.3,
  focus: 0.3,
};

/** Healthy blink rate window in blinks-per-minute. */
const BLINK_HEALTHY_MIN = 12;
const BLINK_HEALTHY_MAX = 20;
/** Outside this window the blink subscore saturates at 100. */
const BLINK_SATURATION_DELTA = 25;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const clamp = (n: number, lo: number, hi: number) =>
  n < lo ? lo : n > hi ? hi : n;

/**
 * Convert a raw blink rate (blinks/min) into a 0..100 fatigue subscore.
 * Both abnormally low (microsleep / staring) and abnormally high (stress,
 * irritation) blink rates push the subscore up.
 */
export function blinkRateSubscore(blinksPerMinute: number): number {
  if (!Number.isFinite(blinksPerMinute) || blinksPerMinute < 0) return 0;
  if (blinksPerMinute >= BLINK_HEALTHY_MIN && blinksPerMinute <= BLINK_HEALTHY_MAX) {
    return 0;
  }
  const delta =
    blinksPerMinute < BLINK_HEALTHY_MIN
      ? BLINK_HEALTHY_MIN - blinksPerMinute
      : blinksPerMinute - BLINK_HEALTHY_MAX;
  return Math.round(clamp(delta / BLINK_SATURATION_DELTA, 0, 1) * 100);
}

/**
 * Convert PERCLOS-style eye-closure ratio (0..1) into a 0..100 subscore.
 * The standard drowsiness threshold is ~0.15 over a rolling window.
 * Below 0.05 we treat as no contribution; above 0.5 saturates.
 */
export function eyeClosureSubscore(closureRatio: number): number {
  const r = clamp01(closureRatio);
  if (r <= 0.05) return 0;
  return Math.round(clamp((r - 0.05) / 0.45, 0, 1) * 100);
}

/** Convert focus (0..1, higher = more focused) to fatigue subscore. */
export function focusSubscore(focusLevel: number): number {
  return Math.round((1 - clamp01(focusLevel)) * 100);
}

/**
 * Calculate a weighted fatigue score in [0..100].
 *
 * @param blinkRate   blinks per minute
 * @param eyeClosure  PERCLOS in [0..1]
 * @param focusLevel  focus in [0..1] (1 = fully focused)
 * @param weights     optional override (must sum to 1)
 */
export function calculateFatigueScore(
  blinkRate: number,
  eyeClosure: number,
  focusLevel: number,
  weights: FatigueWeights = DEFAULT_WEIGHTS,
): number {
  const eye = eyeClosureSubscore(eyeClosure);
  const blink = blinkRateSubscore(blinkRate);
  const focus = focusSubscore(focusLevel);
  const score =
    eye * weights.eyeClosure +
    blink * weights.blinkRate +
    focus * weights.focus;
  return Math.round(clamp(score, 0, 100));
}

/** Map a numeric score to a categorical risk band. */
export function mapRiskLevel(score: number): RiskLevel {
  if (score >= 70) return "high";
  if (score >= 40) return "moderate";
  return "low";
}

/** Human-readable label for the existing UI pills. */
export function riskLabel(level: RiskLevel): string {
  switch (level) {
    case "high":
      return "HIGH RISK";
    case "moderate":
      return "MODERATE RISK";
    default:
      return "LOW RISK";
  }
}
