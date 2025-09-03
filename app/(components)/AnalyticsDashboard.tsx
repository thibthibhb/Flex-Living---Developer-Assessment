// Analytics dashboard component showing property comparison and insights

import Link from 'next/link';
import { detectRecurringIssues, calculateResponseTimeMetrics, getTrendColor, getSeverityColor } from '../../lib/analytics';

type PropertyAnalytics = {
  id: number;
  name: string;
  slug: string;
  totalReviews: number;
  avgRating: number | null;
  approvedCount: number;
  approvalRate: number;
  avgResponseTime: number | null;
  topIssues: Array<{ category: string; count: number; avgRating: number }>;
  recentTrend: 'up' | 'down' | 'stable';
  last30Days: {
    reviews: number;
    avgRating: number | null;
  };
};

type Props = {
  analytics: PropertyAnalytics[];
  allReviews: any[]; // For issue detection
};

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  const color = getTrendColor(trend);
  switch (trend) {
    case 'up':
      return <span style={{ color }}>↗</span>;
    case 'down':
      return <span style={{ color }}>↘</span>;
    case 'stable':
      return <span style={{ color }}>→</span>;
  }
}

export default function AnalyticsDashboard({ analytics, allReviews }: Props) {
  const detectedIssues = detectRecurringIssues(allReviews);
  const responseMetrics = calculateResponseTimeMetrics(allReviews);

  // Calculate fleet-wide metrics
  const fleetMetrics = {
    totalProperties: analytics.length,
    totalReviews: analytics.reduce((sum, p) => sum + p.totalReviews, 0),
    avgRating: analytics.filter(p => p.avgRating).length > 0 
      ? analytics.reduce((sum, p) => sum + (p.avgRating || 0), 0) / analytics.filter(p => p.avgRating).length 
      : null,
    avgApprovalRate: analytics.reduce((sum, p) => sum + p.approvalRate, 0) / analytics.length,
    avgResponseTime: analytics.filter(p => p.avgResponseTime).length > 0
      ? analytics.reduce((sum, p) => sum + (p.avgResponseTime || 0), 0) / analytics.filter(p => p.avgResponseTime).length
      : null
  };

  return (
    <div style={{ marginBottom: '32px' }}>
      {/* Fleet Overview */}
      <section className="col-12 card" style={{ marginBottom: 24 }}>
        <div className="section-title">
          <h2>Analytics Overview</h2>
          <span className="muted">Fleet performance & insights</span>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div className="kpi">
            <h4>Fleet Rating</h4>
            <div className="v">{fleetMetrics.avgRating ? fleetMetrics.avgRating.toFixed(1) : '—'}</div>
          </div>
          <div className="kpi">
            <h4>Approval Rate</h4>
            <div className="v">{Math.round(fleetMetrics.avgApprovalRate)}%</div>
          </div>
          <div className="kpi">
            <h4>Avg Response Time</h4>
            <div className="v">{fleetMetrics.avgResponseTime ? `${fleetMetrics.avgResponseTime.toFixed(1)}d` : '—'}</div>
          </div>
          <div className="kpi">
            <h4>Active Issues</h4>
            <div className="v" style={{ color: detectedIssues.filter(i => i.severity === 'high').length > 0 ? '#EF4444' : 'var(--text)' }}>
              {detectedIssues.filter(i => i.severity === 'high').length}
            </div>
          </div>
        </div>

        {/* Issue Alerts */}
        {detectedIssues.length > 0 && (
          <div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>🚨 Recurring Issues Detected</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {detectedIssues.slice(0, 5).map((issue, i) => (
                <div 
                  key={i} 
                  className="pill" 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: getSeverityColor(issue.severity) + '20',
                    borderColor: getSeverityColor(issue.severity) + '40'
                  }}
                >
                  <span>
                    <strong>{issue.category}:</strong> "{issue.keyword}" 
                    <span className="muted"> × {issue.frequency}</span>
                  </span>
                  <span style={{ 
                    color: getSeverityColor(issue.severity), 
                    fontSize: '12px', 
                    fontWeight: '600',
                    textTransform: 'uppercase'
                  }}>
                    {issue.severity} • ★{issue.avgRating}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Property Comparison Table */}
      <section className="col-12 card">
        <div className="section-title">
          <h2>Property Performance</h2>
          <span className="muted">Comparative analytics across all properties</span>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: '800px' }}>
            <thead>
              <tr>
                <th scope="col">Property</th>
                <th scope="col">Reviews</th>
                <th scope="col">Rating</th>
                <th scope="col">Trend</th>
                <th scope="col">Approval Rate</th>
                <th scope="col">Response Time</th>
                <th scope="col">Top Issues</th>
                <th scope="col">Last 30d</th>
              </tr>
            </thead>
            <tbody>
              {analytics.map((property) => (
                <tr key={property.id}>
                  <td>
                    <Link 
                      href={`/properties/${property.slug}`} 
                      style={{ fontWeight: '600', textDecoration: 'none' }}
                    >
                      {property.name}
                    </Link>
                  </td>
                  <td>{property.totalReviews}</td>
                  <td>
                    <span style={{ fontWeight: '600' }}>
                      {property.avgRating ? property.avgRating.toFixed(1) : '—'}
                    </span>
                  </td>
                  <td>
                    <TrendIcon trend={property.recentTrend} />
                  </td>
                  <td>
                    <span className="pill" style={{ 
                      background: property.approvalRate >= 80 ? '#10B98120' : 
                                 property.approvalRate >= 60 ? '#F59E0B20' : '#EF444420',
                      color: property.approvalRate >= 80 ? '#10B981' : 
                             property.approvalRate >= 60 ? '#F59E0B' : '#EF4444'
                    }}>
                      {property.approvalRate}%
                    </span>
                  </td>
                  <td>
                    {property.avgResponseTime ? `${property.avgResponseTime}d` : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {property.topIssues.slice(0, 2).map((issue, i) => (
                        <span 
                          key={i} 
                          className="pill" 
                          style={{ 
                            fontSize: '11px', 
                            background: issue.avgRating < 3 ? '#EF444420' : '#F59E0B20',
                            color: issue.avgRating < 3 ? '#EF4444' : '#F59E0B'
                          }}
                        >
                          {issue.category}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '13px' }}>
                      <div>{property.last30Days.reviews} reviews</div>
                      <div className="muted">
                        ★{property.last30Days.avgRating ? property.last30Days.avgRating.toFixed(1) : '—'}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Response Time Insights */}
        {responseMetrics.avgResponseTime && (
          <div style={{ marginTop: 24, padding: 16, background: 'var(--bg)', borderRadius: 'var(--radius)' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>📊 Response Time Analysis</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
              <div>
                <div className="muted">Average</div>
                <div style={{ fontWeight: '600' }}>{responseMetrics.avgResponseTime}d</div>
              </div>
              <div>
                <div className="muted">Median</div>
                <div style={{ fontWeight: '600' }}>{responseMetrics.medianResponseTime}d</div>
              </div>
              <div>
                <div className="muted">Fastest</div>
                <div style={{ fontWeight: '600', color: 'var(--success)' }}>{responseMetrics.fastestResponse}d</div>
              </div>
              <div>
                <div className="muted">Slowest</div>
                <div style={{ fontWeight: '600', color: 'var(--warn)' }}>{responseMetrics.slowestResponse}d</div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}