/**
 * The sums behind the free run tools. Plain functions, no UI, all times in seconds,
 * distances in kilometres, pace in seconds per kilometre.
 */

export const RACES = [
  { id: '5k', label: '5K', km: 5 },
  { id: '10k', label: '10K', km: 10 },
  { id: 'half', label: 'Half marathon', km: 21.0975 },
  { id: 'marathon', label: 'Marathon', km: 42.195 },
] as const;
export type RaceId = (typeof RACES)[number]['id'];

/** Riegel's exponent: time grows a little faster than distance. */
export const RIEGEL_EXPONENT = 1.06;

export const toSeconds = (h: number, m: number, s: number): number => h * 3600 + m * 60 + s;

/** 1:23:45 or 23:45. Rounds to the nearest second. */
export function formatDuration(totalSeconds: number): string {
  const t = Math.round(totalSeconds);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** 5:12 per km. */
export const formatPace = (secPerKm: number): string => formatDuration(secPerKm);

export const paceFrom = (seconds: number, km: number): number => seconds / km;
export const timeFrom = (pace: number, km: number): number => pace * km;
export const distanceFrom = (pace: number, seconds: number): number => seconds / pace;

/** Speed in km/h for a pace in seconds per km. */
export const speedKmh = (pace: number): number => 3600 / pace;

/** Predict the time for `toKm` from a result of `seconds` over `fromKm` (Riegel). */
export function predictTime(seconds: number, fromKm: number, toKm: number): number {
  return seconds * Math.pow(toKm / fromKm, RIEGEL_EXPONENT);
}

export interface PaceRange { low: number; high: number }
export interface TrainingPaces { easy: PaceRange; tempo: PaceRange; interval: PaceRange }

/**
 * Rule-of-thumb training paces from one race result. They are starting points, not prescriptions.
 *   easy:     10K pace plus 60 to 90 s/km
 *   tempo:    10K pace plus 10 to 20 s/km (about an hour's effort)
 *   interval: about 5K pace
 */
export function trainingPaces(seconds: number, raceKm: number): TrainingPaces {
  const p10 = paceFrom(predictTime(seconds, raceKm, 10), 10);
  const p5 = paceFrom(predictTime(seconds, raceKm, 5), 5);
  return {
    easy: { low: p10 + 60, high: p10 + 90 },
    tempo: { low: p10 + 10, high: p10 + 20 },
    interval: { low: p5, high: p5 + 5 },
  };
}
