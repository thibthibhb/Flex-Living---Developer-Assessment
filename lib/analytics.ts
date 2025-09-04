// lib/analytics.ts
import { prisma } from "./db";

export async function kpisLastNDays(days = 30, propertySlug?: string) {
  const since = new Date(Date.now() - days * 86400000);
  
  const where: any = {
    submittedAt: { gte: since },
    status: 'published'
  };
  
  if (propertySlug) {
    where.property = { slug: propertySlug };
  }

  const rows = await prisma.review.findMany({
    where,
    select: { 
      ratingOverall: true, 
      selection: true,
      categories: true
    }
  });

  const count = rows.length;
  
  // Calculate average rating (overall or from categories)
  const ratings = rows.map(r => {
    if (r.ratingOverall) return r.ratingOverall;
    if (r.categories?.length) {
      return r.categories.reduce((sum, cat) => sum + (cat.rating || 0), 0) / r.categories.length;
    }
    return null;
  }).filter(r => r !== null) as number[];
  
  const avg = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;
  const positive = ratings.length ? ratings.filter(r => r >= 8).length / ratings.length : 0;
  const approved = count ? rows.filter(r => r.selection?.approvedForWebsite).length / count : 0;
  
  return { count, avg, positive, approved };
}

export async function kpisWoW(days = 30, propertySlug?: string) {
  const now = Date.now();
  const aStart = new Date(now - days * 86400000);
  const bStart = new Date(now - 2 * days * 86400000);

  const baseWhere: any = { status: 'published' };
  if (propertySlug) {
    baseWhere.property = { slug: propertySlug };
  }

  const [A, B] = await Promise.all([
    prisma.review.findMany({
      where: { 
        ...baseWhere,
        submittedAt: { gte: aStart }
      },
      select: { ratingOverall: true, selection: true, categories: true }
    }),
    prisma.review.findMany({
      where: { 
        ...baseWhere,
        submittedAt: { gte: bStart, lt: aStart }
      },
      select: { ratingOverall: true, selection: true, categories: true }
    })
  ]);

  const mk = (xs: any[]) => {
    const count = xs.length;
    const ratings = xs.map(r => {
      if (r.ratingOverall) return r.ratingOverall;
      if (r.categories?.length) {
        return r.categories.reduce((sum: number, cat: any) => sum + (cat.rating || 0), 0) / r.categories.length;
      }
      return null;
    }).filter(r => r !== null) as number[];
    
    const avg = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;
    const positive = ratings.length ? ratings.filter(r => r >= 8).length / ratings.length : 0;
    const approved = count ? xs.filter(r => r.selection?.approvedForWebsite).length / count : 0;
    return { count, avg, positive, approved };
  };
  
  return { current: mk(A), prev: mk(B) };
}

export async function countsByDay(days = 30, propertySlug?: string) {
  const dates: string[] = [];
  const start = new Date(Date.now() - (days - 1) * 86400000);
  
  for (let i = 0; i < days; i++) {
    dates.push(new Date(+start + i * 86400000).toISOString().slice(0, 10));
  }

  const where: any = {
    status: 'published',
    submittedAt: { gte: start }
  };
  
  if (propertySlug) {
    where.property = { slug: propertySlug };
  }

  const rows = await prisma.review.findMany({
    where,
    select: { submittedAt: true }
  });

  // Group by date
  const map = new Map<string, number>();
  rows.forEach(r => {
    const dateStr = r.submittedAt.toISOString().slice(0, 10);
    map.set(dateStr, (map.get(dateStr) || 0) + 1);
  });

  return dates.map(d => map.get(d) ?? 0);
}

export function movingAverage(arr: number[], window = 7) {
  if (window <= 1 || arr.length === 0) return arr.slice();
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

export async function topCategories(days = 90, limit = 6, propertySlug?: string) {
  const since = new Date(Date.now() - days * 86400000);
  
  const where: any = {
    status: 'published',
    submittedAt: { gte: since }
  };
  
  if (propertySlug) {
    where.property = { slug: propertySlug };
  }

  const reviews = await prisma.review.findMany({
    where,
    include: { categories: true }
  });

  // Count categories
  const categoryCount = new Map<string, number>();
  reviews.forEach(review => {
    review.categories.forEach(cat => {
      categoryCount.set(cat.category, (categoryCount.get(cat.category) || 0) + 1);
    });
  });

  // Sort and limit
  return Array.from(categoryCount.entries())
    .map(([category, c]) => ({ category, c }))
    .sort((a, b) => b.c - a.c)
    .slice(0, limit);
}