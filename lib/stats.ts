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
