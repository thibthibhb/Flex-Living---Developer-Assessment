# API Behaviors

## GET /api/reviews/hostaway
**Real Hostaway API integration** with intelligent fallback to mock data.

**Authentication & Discovery**
- Uses provided credentials (Account ID: 61148, API Key from environment)
- Automatically discovers review endpoints by testing common patterns
- Handles authentication failures and missing endpoints gracefully

**Query Parameters**
- `listingId` (string): Filter by specific property
- `from`/`to` (ISO dates): Date range filtering  
- `channel` (string): Filter by review channel
- `limit` (number): Results per page (default 50)
- `cursor` (string): Pagination cursor

**Response**
```json
{
  "reviews": [NormalizedReview],
  "meta": { 
    "total": 44,
    "nextCursor": "42" 
  },
  "source": "hostaway_api" | "mock_data"
}
```

**Behavior**
1. **API First**: Attempts real Hostaway API calls with multiple endpoint patterns
2. **Sandbox Aware**: When sandbox returns empty (expected), falls back to mock data  
3. **Error Resilient**: Handles 404, 401, 403, timeouts without breaking
4. **Smart Filtering**: Applies query filters to both API and mock responses
5. **Console Logging**: Detailed logs show endpoint discovery process

### NormalizedReview
```ts
type NormalizedReview = {
  id: string;
  listingId: string;
  source: "hostaway";
  channel: string | null;
  type: "guest-to-host" | "host-to-guest" | string;
  status: "published" | "removed";
  rating: number | null;
  text: string;
  categories: { category: string; rating: number|null }[];
  date: string;        // ISO
  guestName?: string;
  approved: boolean;   // default false
  raw?: unknown;
}
```

## GET /api/google/place?placeId=
Server-only proxy to Google Places Details. Returns a `summary` and up to 5 `reviews`. Cached for 24h. We **don't** persist Google review text.