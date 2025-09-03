// Analytics utilities for issue detection and response time tracking

type ReviewWithSelection = {
  id: string;
  text: string;
  submittedAt: Date | string;
  ratingOverall?: number | null;
  categories?: Array<{ category: string; rating: number }>;
  selection?: {
    approvedAt?: Date | string | null;
    approvedForWebsite: boolean;
  } | null;
};

// Issue detection keywords categorized by type
const ISSUE_KEYWORDS = {
  cleanliness: ['dirty', 'unclean', 'messy', 'filthy', 'stained', 'smell', 'odor'],
  maintenance: ['broken', 'damaged', 'repair', 'fix', 'not working', 'faulty', 'leak'],
  noise: ['loud', 'noisy', 'noise', 'sound', 'music', 'party', 'quiet'],
  amenities: ['wifi', 'internet', 'tv', 'air conditioning', 'heating', 'hot water'],
  service: ['rude', 'unhelpful', 'slow response', 'poor service', 'unfriendly'],
  location: ['far', 'distance', 'transport', 'parking', 'access', 'unsafe']
};

export type DetectedIssue = {
  category: string;
  keyword: string;
  frequency: number;
  avgRating: number;
  severity: 'low' | 'medium' | 'high';
  examples: string[];
};

export type ResponseTimeMetrics = {
  avgResponseTime: number | null; // in days
  medianResponseTime: number | null;
  fastestResponse: number | null;
  slowestResponse: number | null;
  responsesByDay: Array<{ day: string; avgTime: number; count: number }>;
  approvalRate: number;
};

// Detect recurring issues in review text
export function detectRecurringIssues(reviews: ReviewWithSelection[]): DetectedIssue[] {
  const issueMap = new Map<string, {
    keyword: string;
    count: number;
    ratings: number[];
    examples: string[];
  }>();

  // Analyze each review for issue keywords
  reviews.forEach(review => {
    const text = review.text.toLowerCase();
    const rating = review.ratingOverall || 0;

    Object.entries(ISSUE_KEYWORDS).forEach(([category, keywords]) => {
      keywords.forEach(keyword => {
        if (text.includes(keyword)) {
          const key = `${category}:${keyword}`;
          const existing = issueMap.get(key) || {
            keyword,
            count: 0,
            ratings: [],
            examples: []
          };
          
          existing.count += 1;
          existing.ratings.push(rating);
          if (existing.examples.length < 3) {
            existing.examples.push(review.text.substring(0, 100) + '...');
          }
          
          issueMap.set(key, existing);
        }
      });
    });
  });

  // Convert to DetectedIssue array and calculate severity
  const issues: DetectedIssue[] = Array.from(issueMap.entries())
    .map(([key, data]) => {
      const [category] = key.split(':');
      const avgRating = data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length;
      const frequency = data.count;
      const totalReviews = reviews.length;
      
      // Determine severity based on frequency and rating
      let severity: 'low' | 'medium' | 'high' = 'low';
      if (frequency / totalReviews > 0.15 && avgRating < 3) severity = 'high';
      else if (frequency / totalReviews > 0.08 || avgRating < 3.5) severity = 'medium';
      
      return {
        category,
        keyword: data.keyword,
        frequency,
        avgRating: Math.round(avgRating * 10) / 10,
        severity,
        examples: data.examples
      };
    })
    .filter(issue => issue.frequency >= 2) // Only show issues mentioned at least twice
    .sort((a, b) => {
      // Sort by severity first, then frequency
      const severityOrder = { high: 3, medium: 2, low: 1 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return b.frequency - a.frequency;
    });

  return issues;
}

// Calculate response time metrics for approved reviews
export function calculateResponseTimeMetrics(reviews: ReviewWithSelection[]): ResponseTimeMetrics {
  const approvedReviews = reviews.filter(r => 
    r.selection?.approvedForWebsite && r.selection?.approvedAt
  );

  if (approvedReviews.length === 0) {
    return {
      avgResponseTime: null,
      medianResponseTime: null,
      fastestResponse: null,
      slowestResponse: null,
      responsesByDay: [],
      approvalRate: 0
    };
  }

  // Calculate response times in days
  const responseTimes = approvedReviews.map(review => {
    const submitted = new Date(review.submittedAt);
    const approved = new Date(review.selection!.approvedAt!);
    return (approved.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24);
  }).sort((a, b) => a - b);

  const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  const medianResponseTime = responseTimes[Math.floor(responseTimes.length / 2)];
  const fastestResponse = responseTimes[0];
  const slowestResponse = responseTimes[responseTimes.length - 1];

  // Group by approval day for trend analysis
  const responsesByDay = approvedReviews.reduce((acc, review) => {
    const day = new Date(review.selection!.approvedAt!).toISOString().split('T')[0];
    const responseTime = (new Date(review.selection!.approvedAt!).getTime() - 
                         new Date(review.submittedAt).getTime()) / (1000 * 60 * 60 * 24);
    
    const existing = acc.find(entry => entry.day === day);
    if (existing) {
      existing.avgTime = (existing.avgTime * existing.count + responseTime) / (existing.count + 1);
      existing.count += 1;
    } else {
      acc.push({ day, avgTime: responseTime, count: 1 });
    }
    
    return acc;
  }, [] as Array<{ day: string; avgTime: number; count: number }>);

  const approvalRate = Math.round((approvedReviews.length / reviews.length) * 100);

  return {
    avgResponseTime: Math.round(avgResponseTime * 10) / 10,
    medianResponseTime: Math.round(medianResponseTime * 10) / 10,
    fastestResponse: Math.round(fastestResponse * 10) / 10,
    slowestResponse: Math.round(slowestResponse * 10) / 10,
    responsesByDay: responsesByDay.sort((a, b) => a.day.localeCompare(b.day)),
    approvalRate
  };
}

// Helper function to get color for trend indicators
export function getTrendColor(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up': return 'var(--success)';
    case 'down': return 'var(--warn)';
    case 'stable': return 'var(--muted)';
  }
}

// Helper function to get severity color
export function getSeverityColor(severity: 'low' | 'medium' | 'high'): string {
  switch (severity) {
    case 'high': return '#EF4444'; // red
    case 'medium': return '#F59E0B'; // amber  
    case 'low': return '#10B981'; // green
  }
}