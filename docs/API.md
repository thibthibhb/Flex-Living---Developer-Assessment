# API Behaviors

## GET /api/reviews/hostaway
Returns normalized reviews from Hostaway (mock fixtures in sandbox), sortable and filterable.

**Query**
- `listingId` (string), `from` (ISO), `to` (ISO), `channel`
- pagination: `limit`, `cursor`

**Response**
```json
{ "reviews": [NormalizedReview], "meta": { "nextCursor": "..." } }
```

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