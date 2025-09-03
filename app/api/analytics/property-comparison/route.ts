export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';

type PropertyAnalytics = {
  id: number;
  name: string;
  slug: string;
  totalReviews: number;
  avgRating: number | null;
  approvedCount: number;
  approvalRate: number;
  avgResponseTime: number | null; // days
  topIssues: Array<{ category: string; count: number; avgRating: number }>;
  recentTrend: 'up' | 'down' | 'stable';
  last30Days: {
    reviews: number;
    avgRating: number | null;
  };
};

function calculateEffectiveRating(review: any): number | null {
  if (review.ratingOverall) return review.ratingOverall;
  if (review.categories && review.categories.length > 0) {
    const sum = review.categories.reduce((acc: number, cat: any) => acc + (cat.rating || 0), 0);
    return sum / review.categories.length;
  }
  return null;
}

function calculateTrend(reviews: any[]): 'up' | 'down' | 'stable' {
  if (reviews.length < 4) return 'stable';
  
  const recent = reviews.slice(0, Math.floor(reviews.length / 2));
  const older = reviews.slice(Math.floor(reviews.length / 2));
  
  const recentAvg = recent.reduce((sum, r) => {
    const rating = calculateEffectiveRating(r);
    return rating ? sum + rating : sum;
  }, 0) / recent.filter(r => calculateEffectiveRating(r)).length;
  
  const olderAvg = older.reduce((sum, r) => {
    const rating = calculateEffectiveRating(r);
    return rating ? sum + rating : sum;
  }, 0) / older.filter(r => calculateEffectiveRating(r)).length;
  
  if (isNaN(recentAvg) || isNaN(olderAvg)) return 'stable';
  
  const difference = recentAvg - olderAvg;
  if (difference > 0.3) return 'up';
  if (difference < -0.3) return 'down';
  return 'stable';
}

export async function GET() {
  try {
    // Fetch all properties with their reviews and selections
    const properties = await prisma.property.findMany({
      include: {
        reviews: {
          include: {
            categories: true,
            selection: true,
          },
          orderBy: { submittedAt: 'desc' }
        }
      }
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const analytics: PropertyAnalytics[] = properties.map(property => {
      const reviews = property.reviews;
      const approvedReviews = reviews.filter(r => r.selection?.approvedForWebsite);
      const recent30Days = reviews.filter(r => new Date(r.submittedAt) >= thirtyDaysAgo);

      // Calculate average rating
      const ratingsWithValues = reviews
        .map(r => calculateEffectiveRating(r))
        .filter(r => r !== null) as number[];
      const avgRating = ratingsWithValues.length > 0 
        ? ratingsWithValues.reduce((sum, rating) => sum + rating, 0) / ratingsWithValues.length 
        : null;

      // Calculate recent average
      const recent30Ratings = recent30Days
        .map(r => calculateEffectiveRating(r))
        .filter(r => r !== null) as number[];
      const recent30AvgRating = recent30Ratings.length > 0
        ? recent30Ratings.reduce((sum, rating) => sum + rating, 0) / recent30Ratings.length
        : null;

      // Calculate average response time (approval time)
      const approvedWithDates = approvedReviews.filter(r => r.selection?.approvedAt);
      const avgResponseTime = approvedWithDates.length > 0
        ? approvedWithDates.reduce((sum, review) => {
            const submitted = new Date(review.submittedAt);
            const approved = new Date(review.selection!.approvedAt!);
            const diffDays = (approved.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24);
            return sum + diffDays;
          }, 0) / approvedWithDates.length
        : null;

      // Calculate top issues from categories
      const categoryCount = new Map<string, { count: number; totalRating: number }>();
      reviews.forEach(review => {
        review.categories?.forEach(cat => {
          const existing = categoryCount.get(cat.category) || { count: 0, totalRating: 0 };
          categoryCount.set(cat.category, {
            count: existing.count + 1,
            totalRating: existing.totalRating + (cat.rating || 0)
          });
        });
      });

      const topIssues = Array.from(categoryCount.entries())
        .map(([category, data]) => ({
          category,
          count: data.count,
          avgRating: data.totalRating / data.count
        }))
        .sort((a, b) => a.avgRating - b.avgRating) // Lowest ratings first (issues)
        .slice(0, 5);

      return {
        id: property.id,
        name: property.name,
        slug: property.slug,
        totalReviews: reviews.length,
        avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        approvedCount: approvedReviews.length,
        approvalRate: reviews.length > 0 ? Math.round((approvedReviews.length / reviews.length) * 100) : 0,
        avgResponseTime: avgResponseTime ? Math.round(avgResponseTime * 10) / 10 : null,
        topIssues,
        recentTrend: calculateTrend(reviews),
        last30Days: {
          reviews: recent30Days.length,
          avgRating: recent30AvgRating ? Math.round(recent30AvgRating * 10) / 10 : null
        }
      };
    });

    // Sort by total reviews descending
    analytics.sort((a, b) => b.totalReviews - a.totalReviews);

    return NextResponse.json({
      status: 'success',
      data: analytics,
      meta: {
        totalProperties: analytics.length,
        totalReviews: analytics.reduce((sum, p) => sum + p.totalReviews, 0),
        avgApprovalRate: Math.round(
          analytics.reduce((sum, p) => sum + p.approvalRate, 0) / analytics.length
        ),
        generatedAt: now.toISOString()
      }
    });

  } catch (error) {
    console.error('Property comparison analytics error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to generate property analytics' },
      { status: 500 }
    );
  }
}