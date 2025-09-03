# Flex Living – Reviews Dashboard (Assessment)

This project implements a simple reviews dashboard for Flex Living as described in the assessment PDF. It integrates with a mocked Hostaway reviews API, normalises and stores the data using Prisma, provides a manager-facing dashboard to filter and approve reviews, and exposes a property page to display only the approved reviews.

## Features

- **Hostaway integration (mocked)**: The API route `GET /api/reviews/hostaway` reads mock data from `mock_data/hostaway_reviews.json`, normalises it into a consistent shape using Zod and returns the result as JSON.
- **Data persistence with Prisma**: SQLite is used as a lightweight database for local development. The schema models properties, reviews, category ratings and manager selections.
- **Ingest script**: `pnpm ingest:hostaway` ingests the mocked reviews into the database. It upserts properties and reviews, and populates category ratings.
- **Manager dashboard**: Accessible at `/`, this page lists reviews with filtering by property, minimum rating and search text. Managers can approve or unapprove reviews for display using a toggle.
- **Property details**: The route `/properties/[slug]` mimics a property details page and shows only the reviews approved by managers. Each page links back to the dashboard.
- **Minimal styling**: Basic CSS is provided via `styles/globals.css` to keep the UI clean and functional.

## Setup

Ensure you have Node.js and pnpm installed. Then run the following:

```bash
pnpm install
cp .env.example .env # Add any missing environment variables as needed
pnpm prisma:generate
pnpm prisma:migrate
pnpm ingest:hostaway
pnpm dev
```

The application will be available at <http://localhost:3000>.

## Directory Structure

- `app/` – Next.js App Router pages and API routes.
  - `api/reviews/hostaway/route.ts` – API to return normalised Hostaway reviews.
  - `api/selection/route.ts` – API to toggle review approval.
  - `page.tsx` – Manager dashboard.
  - `properties/[slug]/page.tsx` – Property details page showing approved reviews.
- `lib/` – Shared utilities.
  - `db.ts` – Prisma client instantiation.
  - `normalizers/hostaway.ts` – Hostaway data validation and normalisation.
- `prisma/` – Prisma schema.
- `scripts/` – Data ingestion script.
- `mock_data/` – Mocked Hostaway reviews JSON.
- `styles/` – Global CSS.

## Notes

The Hostaway API described in the assessment PDF is sandboxed and contains no reviews. For this assessment, a mocked JSON response is provided and should be used to simulate review ingestion. Should you choose to explore Google Reviews integration, you can add a `GOOGLE_PLACES_API_KEY` to your `.env` file and implement a similar normalisation and ingestion flow for Google reviews.