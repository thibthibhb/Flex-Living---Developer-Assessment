export const runtime = "nodejs";
export const revalidate = 300; // Cache for 5 minutes

// app/analytics/page.tsx
// Dedicated analytics dashboard page

import Link from "next/link";
import { prisma } from "../../lib/db";
import AnalyticsDashboard from "../(components)/AnalyticsDashboard";
import RefreshButton from "../(components)/RefreshButton";
import Navigation from "../(components)/Navigation";

// Fetch analytics data server-side directly from database
async function getAnalyticsData() {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch properties with optimized queries
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

    const analytics = properties.map(property => {
      const reviews = property.reviews;
      const approvedReviews = reviews.filter(r => r.selection?.approvedForWebsite);
      const recent30Days = reviews.filter(r => new Date(r.submittedAt) >= thirtyDaysAgo);

      // Calculate average rating
      const ratingsWithValues = reviews
        .map(r => r.ratingOverall || (r.categories?.length > 0 
          ? r.categories.reduce((sum, cat) => sum + (cat.rating || 0), 0) / r.categories.length 
          : null))
        .filter(r => r !== null) as number[];
      const avgRating = ratingsWithValues.length > 0 
        ? ratingsWithValues.reduce((sum, rating) => sum + rating, 0) / ratingsWithValues.length 
        : null;

      return {
        id: property.id,
        name: property.name,
        slug: property.slug,
        totalReviews: reviews.length,
        avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        approvedCount: approvedReviews.length,
        approvalRate: reviews.length > 0 ? Math.round((approvedReviews.length / reviews.length) * 100) : 0,
        last30Days: {
          reviews: recent30Days.length,
          avgRating: recent30Days.length > 0 ? Math.round(avgRating! * 10) / 10 : null
        }
      };
    }).sort((a, b) => b.totalReviews - a.totalReviews);

    // Get recent reviews for display
    const allReviews = await prisma.review.findMany({
      include: { categories: true, selection: true, property: true },
      orderBy: { submittedAt: 'desc' },
      take: 50 // Reduced for performance
    });

    return { analytics, allReviews };
  } catch (error) {
    console.error('Analytics data fetch failed:', error);
    return { analytics: [], allReviews: [] };
  }
}

export default async function AnalyticsPage() {
  const { analytics, allReviews } = await getAnalyticsData();
  
  // Get properties for navigation
  const properties = await prisma.property.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="grid">
      {/* Navigation */}
      <div className="col-12" style={{ marginBottom: 0 }}>
        <Navigation properties={properties} currentPath="/analytics" />
      </div>

      {/* Header */}
      <header className="col-12" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, letterSpacing: "-.01em" }}>
              Advanced Analytics
            </h1>
            <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>
              Property performance insights, issue detection & response metrics
            </p>
          </div>
        </div>
      </header>

      {/* Analytics Dashboard */}
      <section className="col-12 card">
        <h2 style={{ marginTop: 0, marginBottom: 16 }}>Property Analytics Overview</h2>
        {analytics.length > 0 ? (
          <div>
            <p>Found {analytics.length} properties with analytics data:</p>
            <div style={{ display: 'grid', gap: '16px', marginTop: '24px' }}>
              {analytics.map(property => (
                <div key={property.id} style={{ 
                  padding: '16px', 
                  border: '1px solid var(--border)', 
                  borderRadius: '8px',
                  background: 'var(--bg)'
                }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>{property.name}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', fontSize: '14px' }}>
                    <div>
                      <strong>Reviews:</strong> {property.totalReviews}
                    </div>
                    <div>
                      <strong>Avg Rating:</strong> {property.avgRating?.toFixed(1) || 'N/A'}
                    </div>
                    <div>
                      <strong>Approved:</strong> {property.approvedCount} ({property.approvalRate}%)
                    </div>
                    <div>
                      <strong>Last 30 Days:</strong> {property.last30Days.reviews} reviews
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <p style={{ color: 'var(--muted)', margin: 0 }}>
              No analytics data available. Analytics will show once review data is processed.
            </p>
            <p style={{ color: 'var(--muted)', margin: '8px 0 0 0', fontSize: '14px' }}>
              Debug: {allReviews.length} total reviews found
            </p>
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section className="col-12 card">
        <h2 style={{ marginTop: 0, marginBottom: 16 }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/" className="btn ghost">
            Review Dashboard
          </Link>
          <button className="btn ghost" disabled>
            Export Data (Coming Soon)
          </button>
          <RefreshButton />
        </div>
      </section>
    </div>
  );
}