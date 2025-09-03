// app/analytics/page.tsx
// Dedicated analytics dashboard page

import Link from "next/link";
import { prisma } from "../../lib/db";
import AnalyticsDashboard from "../(components)/AnalyticsDashboard";
import RefreshButton from "../(components)/RefreshButton";
import Navigation from "../(components)/Navigation";

// Fetch analytics data server-side
async function getAnalyticsData() {
  try {
    // Use internal API call for consistency
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3004';
    const analyticsResponse = await fetch(`${baseUrl}/api/analytics/property-comparison`, {
      cache: 'no-store'
    });
    
    let analytics = [];
    if (analyticsResponse.ok) {
      const data = await analyticsResponse.json();
      analytics = data.data || [];
    }

    // Get all reviews for issue detection
    const allReviews = await prisma.review.findMany({
      include: { categories: true, selection: true },
      orderBy: { submittedAt: 'desc' },
      take: 500 // Limit for performance
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
      {analytics.length > 0 ? (
        <AnalyticsDashboard analytics={analytics} allReviews={allReviews} />
      ) : (
        <section className="col-12 card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <h2 style={{ color: 'var(--muted)', margin: '0 0 16px 0', fontWeight: '500' }}>
            No analytics data available
          </h2>
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            Analytics data will appear here once reviews are available and processed.
          </p>
        </section>
      )}

      {/* Quick Actions */}
      <section className="col-12 card">
        <h2 style={{ marginTop: 0, marginBottom: 16 }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/" className="btn ghost">
            Review Dashboard
          </Link>
          <Link href="/api/analytics/property-comparison" className="btn ghost">
            Export Data (JSON)
          </Link>
          <RefreshButton />
        </div>
      </section>
    </div>
  );
}