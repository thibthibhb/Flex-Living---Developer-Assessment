# Flex Living Reviews Dashboard - Technical Documentation

## Tech Stack

### Core Framework
- **Next.js 15** with App Router - Modern React framework with server-side rendering, optimized routing, and built-in API routes
- **TypeScript** - Full type safety across frontend, backend, and database layers with strict mode enabled
- **React 18** with Concurrent Features - useTransition for smooth UI interactions, loading states, and error boundaries

### Database & Data Layer
- **Prisma ORM** - Type-safe database client with schema migrations, relationship management, and query optimization
- **Neon PostgreSQL** - Cloud-native PostgreSQL with connection pooling (`pgbouncer=true`) for production scalability
- **Zod** - Runtime schema validation for API inputs, data normalization, and type coercion

### Styling & UI
- **CSS Custom Properties** - Design token system (`--primary`, `--surface`, `--border`) for consistent theming
- **Server-Side SVG Sparklines** - Performance-optimized data visualizations without client-side JavaScript
- **Responsive Design** - Mobile-first approach with collapsible filter panels and grid layouts

### External Integrations
- **Google Places API (New)** - Real-time review fetching with 24-hour caching and graceful fallbacks
- **Hostaway API** - Mock implementation with production-ready normalization pipeline and deduplication

## Key Design and Logic Decisions

### 1. Data Architecture
**Decision**: Normalized database schema with separate `Review`, `Property`, `ReviewCategoryRating`, and `Selection` tables.

**Rationale**: 
- **Flexibility**: Supports arbitrary review categories without schema changes
- **Source Independence**: Can handle reviews from multiple platforms (Hostaway, Google, future sources)
- **Manager Control**: Approval system (`Selection` table) completely decoupled from review data
- **Data Integrity**: Composite unique constraints prevent duplicate reviews across sources

```sql
Review (id, source, propertyId, text, ratingOverall, status, submittedAt)
ReviewCategoryRating (reviewId, category, rating)  -- One-to-many
Selection (reviewId, approvedForWebsite)           -- Manager decisions
```

### 2. Review Normalization Strategy
**Decision**: Transform all external review formats into a consistent internal schema before database storage.

**Implementation**:
- **Hostaway**: `publicReview` → `text`, `reviewCategory` → `categories` array
- **Google**: `text` → `text`, `rating` → `ratingOverall`, author attribution preserved
- **Effective Rating**: When `ratingOverall` is null, calculate average from category ratings
- **Deduplication**: Hash-based on `listingId + date + text` to prevent duplicates

**Benefits**: Single query interface, consistent UI rendering, easy to add new review sources.

### 3. Manager Dashboard UX
**Decision**: Default to "published" status filter with progressive disclosure of advanced options.

**Logic**:
- **Manager Cognitive Load**: 80% of daily tasks focus on published, actionable reviews
- **Progressive Disclosure**: "Show more" reveals advanced filters (categories, date ranges, sorting)
- **Visual Hierarchy**: Status badges (🟢 Published, 🔴 Removed), color-coded ratings, muted removed reviews
- **Security First**: Disabled approval buttons for non-published reviews with explanatory tooltips

### 4. Analytics Implementation
**Decision**: Server-side analytics calculations with pre-computed KPIs and trend detection.

**Approach**:
- **WoW Deltas**: Compare current 30d period vs previous 30d for trend arrows (▲/▼)
- **Sparklines**: Moving averages of daily review counts with SVG rendering
- **Issue Detection**: Statistical analysis comparing recent 7d vs 90d baseline for category problems
- **Non-Clickable Cards**: Analytics for insights only, no confusing navigation to filtered views

### 5. Performance Optimizations
**Decision**: Minimize client-side JavaScript and prioritize server-side rendering.

**Strategies**:
- **Server Components**: Analytics page, property pages, and main dashboard use SSR
- **Database Indexing**: Compound indexes on `(propertyId, status, submittedAt)` for common queries
- **Caching**: Google API responses cached for 24h, Prisma connection pooling
- **React Transitions**: useTransition for filter updates without blocking UI

## API Behaviors

### `/api/reviews/hostaway`
**Purpose**: Mock Hostaway integration for development and testing.

**Behavior**:
- Reads from `mock_data/hostaway_reviews.json` (34 realistic reviews across 5 properties)
- Normalizes Hostaway format to internal schema with Zod validation
- Supports query parameters: `listingId`, `from`, `to`, `channel`, `limit`, `cursor`
- Returns paginated response with `nextCursor` for large datasets
- **Error Handling**: 400 for invalid parameters, 500 for processing errors

**Sample Response**:
```json
{
  "reviews": [{
    "id": "hostaway:7453",
    "listingId": "2B N1 A - 29 Shoreditch Heights",
    "source": "hostaway",
    "status": "published",
    "text": "Excellent stay with modern amenities...",
    "categories": [{"category": "cleanliness", "rating": 10}],
    "date": "2020-08-21T22:45:14Z"
  }],
  "meta": { "nextCursor": "eyJ0aW1lc3RhbXAiOiIyMDIwLTA4LTIx..." }
}
```

### `/api/google/place`
**Purpose**: Server-side proxy for Google Places API with caching and error handling.

**Behavior**:
- Requires `placeId` query parameter, optional `limit` (default 5) and `lang` (default "en")
- Uses Google Places API (New) with field masking: `displayName,rating,userRatingCount,reviews`
- **Caching**: 24-hour TTL to respect API quotas and improve performance
- **Graceful Fallbacks**: Returns `{ disabled: true }` when `NEXT_PUBLIC_GOOGLE_ENABLED` is false
- **Error Handling**: 400 for missing placeId, 403 when disabled, 500 for API errors

**Sample Response**:
```json
{
  "ok": true,
  "summary": {
    "name": "Flex Living Shoreditch Heights",
    "rating": 4.2,
    "userRatingCount": 127
  },
  "reviews": [{
    "text": "Great location in Shoreditch...",
    "rating": 5,
    "relativePublishTimeDescription": "2 months ago",
    "authorAttribution": {
      "displayName": "Sarah M.",
      "photoUri": "https://lh3.googleusercontent.com/..."
    }
  }]
}
```

### `/api/selection`
**Purpose**: Manager approval system with security validation.

**Behavior**:
- **POST**: Toggle review approval status (`approvedForWebsite: boolean`)
- **Security Validation**: Server-side check ensures only `status: 'published'` reviews can be approved
- **Type Safety**: Validates `reviewId` format and existence in database
- **Error Responses**: 
  - 422 for attempting to approve non-published reviews
  - 404 for non-existent reviews
  - 400 for invalid request format

### Internal Analytics APIs
**Purpose**: Dashboard KPI calculations and trend analysis.

**`/api/analytics/property-comparison`**:
- Aggregates review metrics across all properties
- Calculates 30d/90d averages, approval rates, rating distributions
- Returns formatted data for dashboard consumption
- **Caching**: 5-minute revalidation with `export const revalidate = 300`

**Key Design Principle**: All analytics computed server-side for consistency and performance, with minimal client-side JavaScript for interactions only.

## Security & Production Considerations

### Data Validation
- **Input Sanitization**: All user inputs validated with Zod schemas
- **SQL Injection Prevention**: Prisma ORM with parameterized queries
- **Type Safety**: TypeScript strict mode eliminates runtime type errors

### Performance
- **Database**: Connection pooling, compound indexes, query optimization
- **Caching**: Multi-layer caching (Google API, Prisma, Next.js)
- **Bundle Size**: Server-side rendering minimizes client JavaScript

### Monitoring
- **Error Boundaries**: React error boundaries for graceful failure handling
- **API Error Logging**: Structured error responses for debugging
- **Performance Metrics**: useTransition provides loading states for user feedback

This architecture provides a scalable, maintainable foundation suitable for production deployment with enterprise-grade security and user experience standards.