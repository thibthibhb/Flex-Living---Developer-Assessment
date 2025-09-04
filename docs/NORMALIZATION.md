# Normalization rules

- Map upstream fields → normalized keys.
- Categories → lower_snake_case; keep per-category rating if provided.
- Dedupe key: `listingId + date + text`.
- Status mapping: upstream `published/removed` → same.
- Default `approved=false`.
- Parse dates to ISO in UTC.

**Example (from Hostaway):**
Input snippet:
```json
{
  "id": 7453,
  "type": "host-to-guest",
  "status": "published",
  "rating": null,
  "publicReview": "…",
  "reviewCategory": [{"category":"cleanliness","rating":10}],
  "submittedAt": "2020-08-21 22:45:14",
  "guestName": "Shane F.",
  "listingName": "2B N1 A - 29 Shoreditch Heights"
}
```
Output snippet:
```json
{
  "id": "hostaway:7453",
  "listingId": "2B N1 A - 29 Shoreditch Heights",
  "source": "hostaway",
  "channel": null,
  "type": "host-to-guest",
  "status": "published",
  "rating": null,
  "text": "…",
  "categories": [{"category":"cleanliness","rating":10}],
  "date": "2020-08-21T22:45:14Z",
  "guestName": "Shane F.",
  "approved": false
}
```