import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../lib/db";
import { normalizeHostaway } from "../lib/normalizers/hostaway";

async function main() {
  // Read the mocked Hostaway JSON file
  const filePath = path.join(process.cwd(), "mock_data", "hostaway_reviews.json");
  const file = await fs.readFile(filePath, "utf-8");
  const json = JSON.parse(file);
  
  // Normalize the raw Hostaway data
  const normalized = normalizeHostaway(json);

  for (const r of normalized) {
    // Upsert the review by composite unique key (source + sourceReviewId)
    const review = await prisma.review.upsert({
      where: {
        uniq_source_review: {
          source: "HOSTAWAY",
          sourceReviewId: r.source_review_id,
        },
      },
      update: {
        // fields that can change on re-ingest
        text: r.text,
        ratingOverall: r.rating_overall ?? null,
        submittedAt: new Date(r.submitted_at),
        channel: r.channel ?? "hostaway",
        reviewType: r.review_type, // "guest-to-host" | "host-to-guest"
        status: r.status ?? "published",
      },
      create: {
        source: "HOSTAWAY",
        sourceReviewId: r.source_review_id,
        text: r.text,
        ratingOverall: r.rating_overall ?? null,
        submittedAt: new Date(r.submitted_at),
        channel: r.channel ?? "hostaway",
        reviewType: r.review_type,
        status: r.status ?? "published",
        property: {
          connectOrCreate: {
            where: { slug: r.property.slug },
            create: { slug: r.property.slug, name: r.property.name, hostawayName: r.property.name },
          },
        },
      },
    });

    // Delete existing category ratings to allow idempotent updates
    await prisma.reviewCategoryRating.deleteMany({ where: { reviewId: review.id } });
    const entries = Object.entries(r.categories || {});
    if (entries.length) {
      await prisma.reviewCategoryRating.createMany({
        data: entries.map(([category, rating]) => ({
          reviewId: review.id,
          category,
          rating: Number(rating),
        })),
      });
    }
  }
  console.log(`✅ Ingested ${normalized.length} reviews`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});