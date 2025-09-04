# Flex Living — Reviews Dashboard

> Manager-friendly dashboard to ingest, normalize and curate guest reviews with analytics and Google Reviews integration.

**🌐 Live Demo: https://flex-living-gray.vercel.app/**

## Quick Start

```bash
pnpm i
cp .env.example .env
# Add your DATABASE_URL, DIRECT_URL, and optional GOOGLE_MAPS_API_KEY
pnpm prisma migrate deploy
pnpm db:seed   # optional
pnpm dev
```

**Environment Variables:**
```bash
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require&pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://user:pass@host/db?sslmode=require
GOOGLE_MAPS_API_KEY=your_api_key # optional
NEXT_PUBLIC_GOOGLE_ENABLED=1
```

## What's Included

- **Manager Dashboard** (`/`) - Filter, approve/unapprove reviews with analytics
- **Property Pages** (`/properties/[slug]`) - Public view of approved reviews only
- **Analytics** (`/analytics`) - KPIs, trends, and insights
- **API Routes** - Hostaway integration, Google Places proxy, review management

## Key Features

✅ **Hostaway Integration** (mocked with realistic data)  
✅ **Google Reviews** via Places API (server-side, cached)  
✅ **Review Approval System** with security validation  
✅ **Advanced Filtering** (property, rating, text, categories, dates)  
✅ **Analytics Dashboard** with WoW deltas and sparklines  
✅ **Responsive Design** with mobile-optimized filters  

## Tech Stack

- **Next.js 15** + TypeScript + App Router
- **Prisma** + **Neon PostgreSQL**
- **Google Places API** + **Zod validation**
- **CSS tokens** + **Server-side SVG sparklines**

---

📖 **For detailed technical documentation, architecture decisions, and API behaviors, see [PROJECT_ASSESSMENT.md](./PROJECT_ASSESSMENT.md)**