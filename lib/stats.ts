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

/** Issue spike detection */
export type IssueSpike = {
  category: string;
  count_now: number;
  base_avg: number;
  lift: number;
  severity: 'low' | 'medium' | 'high';
};

export function detectIssueSpikes(
  recent7d: { categories: CategoryRating[] }[],
  baseline: { categories: CategoryRating[] }[]
): IssueSpike[] {
  // Count low ratings (<7) by category in recent 7d
  const recentLowRatings = new Map<string, number>();
  for (const review of recent7d) {
    for (const cat of review.categories || []) {
      if (cat.rating < 7) { // Issues are ratings below 7
        recentLowRatings.set(cat.category, (recentLowRatings.get(cat.category) || 0) + 1);
      }
    }
  }
  
  // Count low ratings by category in baseline (per week average)
  const baselineLowRatings = new Map<string, number>();
  const baselineWeeks = Math.max(1, Math.ceil(baseline.length / 7)); // Rough weeks estimate
  
  for (const review of baseline) {
    for (const cat of review.categories || []) {
      if (cat.rating < 7) {
        baselineLowRatings.set(cat.category, (baselineLowRatings.get(cat.category) || 0) + 1);
      }
    }
  }
  
  const spikes: IssueSpike[] = [];
  
  for (const [category, nowCount] of recentLowRatings.entries()) {
    const baselineTotal = baselineLowRatings.get(category) || 0;
    const baseAvg = baselineTotal / baselineWeeks;
    
    // Only flag if we have meaningful baseline data and significant increase
    if (baseAvg >= 1 && nowCount > 0) {
      const lift = nowCount / baseAvg;
      if (lift >= 1.5) { // At least 50% increase
        const severity = lift >= 3 ? 'high' : lift >= 2 ? 'medium' : 'low';
        spikes.push({
          category,
          count_now: nowCount,
          base_avg: Math.round(baseAvg * 10) / 10, // Round to 1 decimal
          lift,
          severity
        });
      }
    } else if (baseAvg < 1 && nowCount >= 3) {
      // New issues with no baseline but multiple occurrences
      spikes.push({
        category,
        count_now: nowCount,
        base_avg: 0,
        lift: Infinity,
        severity: 'medium'
      });
    }
  }
  
  // Sort by lift (highest first)
  return spikes.sort((a, b) => {
    if (b.lift === Infinity && a.lift !== Infinity) return 1;
    if (a.lift === Infinity && b.lift !== Infinity) return -1;
    if (a.lift === Infinity && b.lift === Infinity) return b.count_now - a.count_now;
    return b.lift - a.lift;
  }).slice(0, 8); // Top 8 issues
}
