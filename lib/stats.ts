// lib/stats.ts
export type CategoryRating = { category: string; rating: number };
export type ReviewForStats = {
  ratingOverall: number | null;
  categories: CategoryRating[];
  submittedAt?: Date | string;
};

export const POSITIVE_THRESHOLD = 8;

/** Rating to use for stats: overall if present, else avg(categories), else null */
export function derivedRating(r: ReviewForStats): number | null {
  if (r.ratingOverall != null) return r.ratingOverall;
  const cats = r.categories || [];
  if (!cats.length) return null;
  const sum = cats.reduce((s, c) => s + (c.rating ?? 0), 0);
  const avg = sum / cats.length;
  return Number.isFinite(avg) ? avg : null;
}

/** KPI pack: avg rating, count, % positive per the 8+ rule (only among reviews with a computable rating). */
export function kpisFor(revs: ReviewForStats[]) {
  const values = revs.map(derivedRating).filter((v): v is number => v != null);
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const posPct = values.length
    ? Math.round(
        (values.filter((v) => v >= POSITIVE_THRESHOLD).length / values.length) * 100
      )
    : null;
  return { avg, count: revs.length, posPct };
}

/** Counts per day for a trailing window, by UTC date. */
export function countsByDay(
  revs: { submittedAt: Date | string }[],
  days: number
): number[] {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const keys: string[] = [];
  const map = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    keys.push(key);
    map.set(key, 0);
  }

  for (const r of revs) {
    const key = new Date(r.submittedAt!).toISOString().slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
  }

  return keys.map((k) => map.get(k) || 0);
}

export function movingAverage(arr: number[], window = 7): number[] {
  if (arr.length === 0) return [];
  if (window <= 1) return arr.slice();
  const out: number[] = [];
  let sum = 0;
  const q: number[] = [];
  for (const v of arr) {
    q.push(v);
    sum += v;
    if (q.length > window) sum -= q.shift()!;
    out.push(sum / q.length);
  }
  return out;
}

export function cumulative(arr: number[]): number[] {
  let running = 0;
  return arr.map(v => (running += v));
}

/** Group sequential values into fixed-size buckets and sum each bucket */
export function bucketCounts(arr: number[], size = 7): number[] {
  if (size <= 1) return arr.slice();
  const out: number[] = [];
  for (let i = 0; i < arr.length; i += size) {
    let sum = 0;
    for (let j = i; j < Math.min(i + size, arr.length); j++) sum += arr[j];
    out.push(sum);
  }
  return out;
}

/** Calculate WoW (week-over-week) delta with directional indicator */
export type WoWDelta = {
  value: number;
  direction: 'up' | 'down' | 'flat';
  percentChange: number | null;
  color: 'green' | 'red' | 'gray';
};

export function calculateWoWDelta(current: number | null, previous: number | null): WoWDelta | null {
  if (current === null || previous === null || previous === 0) {
    return null;
  }
  
  const percentChange = ((current - previous) / Math.abs(previous)) * 100;
  const direction = Math.abs(percentChange) < 1 ? 'flat' : percentChange > 0 ? 'up' : 'down';
  const color = direction === 'up' ? 'green' : direction === 'down' ? 'red' : 'gray';
  
  return {
    value: current - previous,
    direction,
    percentChange: Math.round(percentChange * 10) / 10, // Round to 1 decimal
    color
  };
}

/** Enhanced KPIs with WoW deltas */
export function kpisWithDeltas(current: ReviewForStats[], previous: ReviewForStats[]) {
  const currentKPIs = kpisFor(current);
  const previousKPIs = kpisFor(previous);
  
  return {
    avg: currentKPIs.avg,
    avgDelta: calculateWoWDelta(currentKPIs.avg, previousKPIs.avg),
    count: currentKPIs.count,
    countDelta: calculateWoWDelta(currentKPIs.count, previousKPIs.count),
    posPct: currentKPIs.posPct,
    posPctDelta: calculateWoWDelta(currentKPIs.posPct, previousKPIs.posPct),
  };
}
