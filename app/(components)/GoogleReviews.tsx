// app/(components)/GoogleReviews.tsx
// Server component – fetches from our internal API and renders cards.

type Props = { placeId: string; lang?: string };

async function fetchGoogle(placeId: string, lang = "fr") {
  const r = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/reviews/google?placeId=${encodeURIComponent(placeId)}&lang=${encodeURIComponent(lang)}`,
    { cache: "no-store" }
  );
  return r.json();
}

export default async function GoogleReviews({ placeId, lang = "fr" }: Props) {
  if (!placeId) return null;
  const res = await fetchGoogle(placeId, lang);

  return (
    <section className="card" aria-labelledby="google-reviews-h">
      <div className="section-title">
        <h2 id="google-reviews-h" style={{ marginTop: 0 }}>
          Google Reviews
        </h2>
        {res?.meta?.rating != null && (
          <span className="muted">
            {res.meta.rating.toFixed(1)} / 5 • {res.meta.ratings_count} ratings
          </span>
        )}
      </div>

      {res?.status === "skipped" && (
        <p className="muted">Google reviews unavailable (no API key configured).</p>
      )}

      {res?.status === "ok" && Array.isArray(res.data) && res.data.length > 0 ? (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 16 }}>
          {res.data.map((rv: any, i: number) => (
            <li key={i} className="card" style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                {rv.profile_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={rv.profile_photo_url} alt="" width={24} height={24} style={{ borderRadius: 999 }} />
                ) : (
                  <div style={{ width: 24, height: 24, borderRadius: 999, background: "#E5E7EB" }} />
                )}
                <strong>{rv.guest_name}</strong>
                <span className="muted">• {rv.relative_time ?? ""}</span>
                <span className="pill" aria-label={`Rating ${rv.rating_overall ?? "—"} out of 5`}>
                  ★ {rv.rating_overall ?? "—"}
                </span>
              </div>
              <p style={{ margin: 0 }}>{rv.text}</p>
            </li>
          ))}
        </ul>
      ) : res?.status === "ok" ? (
        <p className="muted">No Google reviews to show.</p>
      ) : null}

      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <a
          href={res?.meta?.maps_url ?? "https://maps.google.com"}
          target="_blank"
          rel="noopener noreferrer"
          className="muted"
        >
          View on Google Maps
        </a>
        <span aria-hidden="true" className="muted">•</span>
        <span className="muted">Powered by Google</span>
      </div>
    </section>
  );
}