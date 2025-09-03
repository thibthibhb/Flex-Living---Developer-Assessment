import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "../../../lib/db";
import GoogleReviews from "../../(components)/GoogleReviews";
import Navigation from "../../(components)/Navigation";
import PropertySwitcher from "../../(components)/PropertySwitcher";

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  // Fetch all properties for the switcher
  const allProps = await prisma.property.findMany({
    select: { name: true, slug: true },
    orderBy: { name: 'asc' },
  });

  // Fetch the current property by slug
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

  // Fetch approved reviews only
  const reviews = await prisma.review.findMany({
    where: { 
      propertyId: property.id, 
      selection: { approvedForWebsite: true } 
    },
    include: { categories: true },
    orderBy: { submittedAt: 'desc' },
  });

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
        {/* Reviews section */}
        <section className="col-12" style={{ marginBottom: '32px' }}>
          <div className="section-title" style={{ marginBottom: '24px' }}>
            <h2>Guest Reviews</h2>
            <span className="muted">{reviews.length} selected reviews</span>
          </div>
          {reviews.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <h3 style={{ color: 'var(--muted)', margin: '0 0 8px 0', fontWeight: '500' }}>No guest reviews selected yet.</h3>
              <p style={{ color: 'var(--muted)', margin: 0 }}>We're working on curating the best guest experiences to share here.</p>
            </div>
          ) : (
            <div className="review-grid">
              {reviews.map((r) => {
                const effectiveRating = r.ratingOverall ?? (r.categories?.length ? r.categories.reduce((s:number,c:any)=>s+(c.rating??0),0)/r.categories.length : null);
                return (
                  <article key={r.id} className="review-card" role="article">
                    <header className="review-header">
                      <div className="review-rating" style={{ fontSize: '18px', fontWeight: '700' }}>
                        {effectiveRating ? effectiveRating.toFixed(1) : "—"}
                      </div>
                      <div className="review-date" style={{ fontSize: '14px', color: 'var(--muted)' }}>
                        {fmt.format(new Date(r.submittedAt))}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {r.channel || 'Guest'}
                      </div>
                    </header>
                    <p className="review-text" style={{ fontSize: '16px', lineHeight: '1.6', color: 'var(--text)', margin: '16px 0' }}>{r.text}</p>
                    {r.categories?.length ? (
                      <div className="review-cats" style={{ marginTop: '12px' }}>
                        {r.categories.slice(0,4).map((c:any)=>(
                          <span key={c.id} className="pill" style={{ fontSize: '13px', background: 'var(--bg)', color: 'var(--muted)' }}>{c.category}: {c.rating}</span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Google Reviews */}
        {property.googlePlaceId && (
          <GoogleReviews placeId={property.googlePlaceId} lang="fr" />
        )}

        {/* Why stay with Flex info box */}
        <section className="col-12">
          <div className="card" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 12px 0', color: 'var(--primary)', fontSize: '18px', fontWeight: '600' }}>Why stay with The Flex?</h3>
            <p style={{ margin: '0 0 16px 0', color: 'var(--text)', lineHeight: '1.6' }}>
              Every property in our portfolio is personally selected and continuously refined to deliver 
              exceptional hospitality experiences. We focus on the details that matter most to modern travelers.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)' }}>
                <span style={{ color: 'var(--primary)' }}>✓</span>
                <span>Thoughtfully designed spaces</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)' }}>
                <span style={{ color: 'var(--primary)' }}>✓</span>
                <span>Premium amenities</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)' }}>
                <span style={{ color: 'var(--primary)' }}>✓</span>
                <span>24/7 guest support</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)' }}>
                <span style={{ color: 'var(--primary)' }}>✓</span>
                <span>Flexible booking options</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
