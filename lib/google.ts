// lib/google.ts
type GoogleReview = {
  id: string
  source: "google"
  channel: "google"
  rating: number
  text: string
  date: Date
  language?: string
  authorName?: string
  authorPhotoUrl?: string
  relativeTime?: string
  readOnly: true
  link?: string
}

type GoogleSummary = {
  name: string
  rating?: number
  userRatingsTotal?: number
  url?: string
}

const GOOGLE_DETAILS_URL =
  "https://maps.googleapis.com/maps/api/place/details/json"

export async function fetchGoogleSummaryAndReviews(placeId: string, {
  language = "en",
  limit = 5
}: { language?: string; limit?: number } = {}): Promise<{ summary: GoogleSummary, reviews: GoogleReview[] }> {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return { summary: { name: "" }, reviews: [] }
  }

  const fields = [
    "name",
    "url",
    "rating",
    "user_ratings_total",
    "reviews",
    "editorial_summary" // optional
  ].join(",")

  const url = `${GOOGLE_DETAILS_URL}?place_id=${encodeURIComponent(placeId)}&fields=${encodeURIComponent(fields)}&reviews_no_translations=false&language=${encodeURIComponent(language)}&key=${process.env.GOOGLE_MAPS_API_KEY}`

  const res = await fetch(url, {
    // cache daily to respect quotas
    next: { revalidate: 60 * 60 * 24 }
  })
  if (!res.ok) throw new Error(`Google Places error ${res.status}`)
  const json = await res.json()

  if (json.status !== "OK") {
    // Typical statuses: ZERO_RESULTS, INVALID_REQUEST, OVER_QUERY_LIMIT, etc.
    return { summary: { name: "" }, reviews: [] }
  }

  const result = json.result ?? {}
  const summary: GoogleSummary = {
    name: result.name ?? "",
    rating: typeof result.rating === "number" ? result.rating : undefined,
    userRatingsTotal: typeof result.user_ratings_total === "number" ? result.user_ratings_total : undefined,
    url: result.url ?? undefined
  }

  const rawReviews: any[] = Array.isArray(result.reviews) ? result.reviews : []
  const reviews: GoogleReview[] = rawReviews
    .slice(0, limit)
    .map((r) => ({
      id: `google:${placeId}:${r.time ?? r.author_url ?? Math.random().toString(36).slice(2)}`,
      source: "google",
      channel: "google",
      rating: Number(r.rating) || 0,
      text: String(r.text || ""),
      date: r.time ? new Date(Number(r.time) * 1000) : new Date(),
      language: r.language ?? undefined,
      authorName: r.author_name ?? undefined,
      authorPhotoUrl: r.profile_photo_url ?? undefined,
      relativeTime: r.relative_time_description ?? undefined,
      readOnly: true,
      link: r.author_url ?? summary.url
    }))

  return { summary, reviews }
}