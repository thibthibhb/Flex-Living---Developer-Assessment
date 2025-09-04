export const runtime = "nodejs";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "../../../lib/db";
import { fetchGoogleSummaryAndReviews } from "../../../lib/google";
import Navigation from "../../(components)/Navigation";
import PropertySwitcher from "../../(components)/PropertySwitcher";

// Helper component for displaying reviews
function ReviewCard({ r }: { r: any }) {
  // handle both Flex and Google shapes
  const isGoogle = r.source === "google"
  const rating = r.rating
  const when = r.date ? new Date(r.date) : undefined
  
  return (
    <div className="card" style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ fontWeight: 600 }}>
          {isGoogle ? (r.authorName ?? "Google User") : (r.guestName ?? "Guest")}
        </div>
        <div style={{ fontVariantNumeric: "tabular-nums", fontSize: '18px', fontWeight: '700' }}>
          {rating?.toFixed ? rating.toFixed(1) : rating} ★
        </div>
      </div>
      <p style={{ margin: '12px 0', fontSize: '16px', lineHeight: '1.6' }}>{r.text}</p>
      <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '12px' }}>
        {isGoogle ? "Google" : "Flex"} • {when ? when.toLocaleDateString() : ""}
        {isGoogle && r.relativeTime ? ` • ${r.relativeTime}` : ""}
        {isGoogle && r.link ? (
          <> • <a className="link" href={r.link} target="_blank" rel="noreferrer">View</a></>
        ) : null}
      </div>
    </div>
  )
}

export default async function PropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ show?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const slug = resolvedParams.slug;

  // Fetch all properties for the switcher
  const allProps = await prisma.property.findMany({
    select: { name: true, slug: true },
    orderBy: { name: 'asc' },
  });

  // Fetch the current property by slug with Google fields
  const property = await prisma.property.findUnique({ 
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      googlePlaceId: true,
    },
  });

  if (!property) return notFound();

  // Get all properties for navigation (full objects)
  const allProperties = await prisma.property.findMany({ orderBy: { name: "asc" } });

  // Fetch Google data if place ID exists and Google is enabled
  let google = { 
    summary: null as null | { name: string; rating?: number; userRatingsTotal?: number; url?: string }, 
    reviews: [] as any[] 
  }

  if (property?.googlePlaceId && process.env.NEXT_PUBLIC_GOOGLE_ENABLED) {
    try {
      google = await fetchGoogleSummaryAndReviews(property.googlePlaceId, { language: "en", limit: 5 })
    } catch { 
      /* swallow errors; page should still render */ 
    }
  }

  // Fetch Flex-approved reviews for this property
  const flexReviews = await prisma.review.findMany({
    where: { 
      propertyId: property.id, 
      selection: { approvedForWebsite: true },
      status: "published"
    },
    include: { categories: true },
    orderBy: { submittedAt: 'desc' },
    take: 20
  });

  // Transform flex reviews to match the ReviewCard interface
  const normalizedFlexReviews = flexReviews.map(r => ({
    id: r.id,
    source: "flex",
    channel: r.channel || "flex",
    rating: r.ratingOverall ?? (r.categories?.length ? r.categories.reduce((s: number, c: any) => s + (c.rating ?? 0), 0) / r.categories.length : null),
    text: r.text,
    date: r.submittedAt,
    guestName: r.guestName,
    readOnly: false
  }));

  const fmt = new Intl.DateTimeFormat("fr-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="grid">
      {/* Navigation */}
      <div className="col-12" style={{ marginBottom: 0 }}>
        <Navigation properties={allProperties} currentPath={`/properties/${property.slug}`} />
      </div>
      
      {/* Hero */}
      <section className="col-12 hero">
        <div style={{ marginBottom: '20px' }}>
          <PropertySwitcher items={allProps} current={slug} />
        </div>
        <h1 className="hero h1">{property.name}</h1>
        <p className="hero-sub" style={{ fontSize: '18px', color: 'var(--muted)', margin: 0 }}>
          Authentic guest experiences, thoughtfully selected by our managers
        </p>
      </section>

      <main role="main">
        {/* Reviews section with Google badge */}
        <section className="col-12" style={{ marginBottom: '32px' }}>
          {/* Header row with Google badge if available */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <h2>Guest Reviews</h2>
            {google.summary?.rating ? (
              <a 
                className="badge" 
                href={google.summary?.url ?? "#"} 
                target="_blank" 
                rel="noreferrer" 
                title="View on Google"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  border: '1px solid rgba(0,0,0,.08)',
                  background: '#fff',
                  boxShadow: '0 1px 2px rgba(0,0,0,.04)',
                  fontSize: '12px',
                  textDecoration: 'none',
                  color: 'inherit'
                }}
              >
                Google {google.summary.rating.toFixed(1)} ★ · {google.summary.userRatingsTotal ?? 0}
              </a>
            ) : null}
          </div>

          {/* Toggle */}
          <form method="GET" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input 
                type="radio" 
                name="show" 
                value="all" 
                defaultChecked={resolvedSearchParams?.show !== "flex" && resolvedSearchParams?.show !== "google"} 
              /> 
              All
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input 
                type="radio" 
                name="show" 
                value="flex" 
                defaultChecked={resolvedSearchParams?.show === "flex"} 
              /> 
              Flex-approved
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input 
                type="radio" 
                name="show" 
                value="google" 
                defaultChecked={resolvedSearchParams?.show === "google"} 
                disabled={!google.reviews.length}
              /> 
              Google
            </label>
            <button 
              className="btn ghost" 
              type="submit" 
              style={{ padding: '4px 12px', fontSize: '14px' }}
            >
              Apply
            </button>
          </form>

          {/* Reviews List */}
          {(() => {
            const show = (resolvedSearchParams?.show ?? "all") as "all" | "flex" | "google"
            const g = google.reviews
            const f = normalizedFlexReviews
            const combined = show === "all" 
              ? [...f, ...g].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) 
              : show === "flex" ? f : g
              
            if (!combined.length) {
              return (
                <div 
                  className="empty"
                  style={{
                    border: '1px solid rgba(0,0,0,.06)',
                    background: '#fff',
                    padding: '48px 28px',
                    borderRadius: '12px',
                    textAlign: 'center',
                    color: 'var(--muted)'
                  }}
                >
                  <h3>No guest reviews selected yet.</h3>
                  <p>Approve reviews in the dashboard or connect a Google Place ID for this property.</p>
                </div>
              )
            }
            return (
              <div className="review-grid">
                {combined.map((r) => <ReviewCard key={r.id} r={r} />)}
              </div>
            )
          })()}
        </section>

      </main>
    </div>
  );
}