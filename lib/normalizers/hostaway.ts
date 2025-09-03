import { z } from "zod";

// Define the schema of the raw Hostaway review for validation.
export const HostawayReview = z.object({
  id: z.number(),
  type: z.string(),
  status: z.string().nullable().optional(),
  rating: z.number().nullable().optional(),
  publicReview: z.string().nullable().optional(),
  reviewCategory: z
    .array(z.object({ category: z.string(), rating: z.number() }))
    .default([]),
  submittedAt: z.string(),
  guestName: z.string().nullable().optional(),
  listingName: z.string(),
});

// Response shape from Hostaway API.
export const HostawayResponse = z.object({
  status: z.string(),
  result: z.array(HostawayReview),
});

// Shape of the normalized review for our app.
export type NormalizedReview = {
  source: "HOSTAWAY";
  property: { name: string; slug: string };
  review_type: string;
  channel: string | null;
  rating_overall: number | null;
  categories: Record<string, number>;
  text: string;
  guest_name: string | null;
  submitted_at: string;
  source_review_id: string;
  status: string | null;
};

/**
 * Convert a string into a URL-friendly slug. This is used for property
 * slugs in the Next.js router.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/**
 * Normalize Hostaway review data into the shape expected by our dashboard.
 *
 * This function performs the following conversions:
 *  - listingName → property name and slug
 *  - id → source_review_id
 *  - rating → rating_overall
 *  - reviewCategory array → categories object keyed by category name
 *  - publicReview → text
 *  - submittedAt → ISO formatted date string
 *  - guestName → guest_name
 *  - type → review_type
 *  - status → status
 *  - Always set channel to "hostaway"
 */
export function normalizeHostaway(json: unknown): NormalizedReview[] {
  const parsed = HostawayResponse.parse(json);
  return parsed.result.map((r) => ({
    source: "HOSTAWAY" as const,
    property: {
      name: r.listingName,
      slug: slugify(r.listingName),
    },
    review_type: r.type,
    channel: "hostaway",
    rating_overall: r.rating ?? null,
    categories: Object.fromEntries(
      (r.reviewCategory || []).map((c) => [c.category, c.rating])
    ),
    text: r.publicReview ?? "",
    guest_name: r.guestName ?? null,
    submitted_at: new Date(r.submittedAt.replace(" ", "T")).toISOString(),
    source_review_id: String(r.id),
    status: r.status ?? null,
  }));
}