# Design & Decisions

This document captures the high‑level design and rationale behind the Flex Living reviews dashboard implementation.

## Normalisation

Raw Hostaway reviews are normalised before being ingested or returned from the API. The normalisation performs the following conversions:

- `listingName` → `property.name` and a slugified `property.slug` for URL routing.
- `id` → `source_review_id` (used as part of a composite unique key with the `source` enum).
- `rating` → `rating_overall`; if null, we store `null` and derive an overall score later if needed.
- `reviewCategory[]` → a `categories` object keyed by the category name (`cleanliness`, `communication`, etc.).
- `publicReview` → `text` (the body of the review).
- `submittedAt` → ISO8601 string `submitted_at` for consistent date handling.
- `guestName` → `guest_name` (nullable).
- `type` → `review_type` (e.g. `guest-to-host` or `host-to-guest`).
- Always set `channel` to `"hostaway"` to reflect the source.

These fields are validated using Zod to ensure the raw data conforms to the expected shape.

## Data Model

The Prisma schema defines the following models:

- **Property**: Represents a Flex Living property. It has a unique `name` and `slug`.
- **Review**: Stores individual reviews. Includes fields for `source`, `sourceReviewId` (unique per source), `reviewType`, `channel`, `ratingOverall`, `text`, `submittedAt`, `guestName`, and `status`. It relates back to a `Property` via `propertyId` and to multiple `ReviewCategoryRating` entries.
- **ReviewCategoryRating**: Associates a category (e.g. `cleanliness`) and rating with a `Review`. This allows storing an arbitrary number of category ratings per review.
- **Selection**: Stores manager approval status for each review. Only reviews with `approvedForWebsite` set to true are displayed on the property page.
- **Source** (enum): Defines the allowed sources (`HOSTAWAY`, `GOOGLE`).

Indexes are added on composite keys and foreign keys to optimise queries.

## Ingestion

The ingest script (`scripts/ingest_hostaway.ts`) reads the mocked Hostaway JSON file, normalises each review and then upserts properties and reviews into the database. Category ratings are recreated on each run to keep the ingest idempotent. Using the composite unique key of `source` + `sourceReviewId` ensures that repeated runs update existing reviews rather than inserting duplicates.

## Dashboard

The dashboard page (`app/page.tsx`) is server‑rendered and fetches data directly from the database. It provides:

- Filters by property slug, minimum rating and keyword search on the review text.
- A table listing the most recent 200 reviews with important columns (date, property, text, rating, categories, status).
- A column indicating whether a review is approved, and a button to toggle approval which issues a `POST` request to `/api/selection`.

The page reloads after toggling approval to reflect the updated state.

## Property Page

The property details page (`app/properties/[slug]/page.tsx`) is also server‑rendered. It looks up the property by its slug and then lists only reviews that have been approved by a manager (`Selection.approvedForWebsite = true`). If no reviews are approved, a placeholder message is shown. The design loosely follows the Flex Living site by grouping reviews into cards and displaying a back link to the dashboard.

## Styling

Styling is intentionally minimal. A few utility classes (e.g. `card`, `badge`, `grid`) are defined in `styles/globals.css` to give the pages a clean, modern look without any external dependencies. This can be extended with Tailwind or shadcn/ui in a real project.