export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import fs from "node:fs/promises";
import path from "node:path";
import { normalizeHostaway } from "../../../lib/normalizers/hostaway";

export async function POST(request: Request) {
  if (process.env.ENABLE_SEED !== "1") {
    return NextResponse.json({ ok: false, error: "Seeding disabled" }, { status: 403 });
  }
  
  const token = new URL(request.url).searchParams.get("token");
  if (!token || token !== process.env.SEED_TOKEN) {
    return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });
  }

  try {
    // Check if already seeded
    const count = await prisma.review.count();
    if (count > 0) {
      return NextResponse.json({ ok: true, message: "Already seeded", count });
    }

    // Read the mock Hostaway data
    const filePath = path.join(process.cwd(), "mock_data", "hostaway_reviews.json");
    const file = await fs.readFile(filePath, "utf-8");
    const json = JSON.parse(file);
    const normalized = normalizeHostaway(json);

    // Create properties first
    const propertyNames = Array.from(new Set(normalized.map((r: any) => r.property_name)));
    
    for (const propertyName of propertyNames) {
      await prisma.property.upsert({
        where: { name: propertyName },
        update: {},
        create: {
          name: propertyName,
          slug: propertyName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          hostawayName: propertyName,
        }
      });
    }

    // Get property mappings
    const properties = await prisma.property.findMany();
    const propertyMap = new Map(properties.map(p => [p.name, p.id]));

    // Insert reviews
    let insertedCount = 0;
    for (const review of normalized) {
      const propertyId = propertyMap.get(review.property_name);
      if (!propertyId) continue;

      const createdReview = await prisma.review.create({
        data: {
          source: review.source,
          sourceReviewId: review.id || `hostaway-${Date.now()}-${Math.random()}`,
          propertyId: propertyId,
          reviewType: review.review_type || 'guest-to-host',
          channel: review.channel || 'hostaway',
          ratingOverall: review.rating_overall,
          text: review.text || '',
          submittedAt: new Date(review.submitted_at || Date.now()),
          guestName: review.guest_name || 'Anonymous',
          status: 'published',
        }
      });

      // Add categories if they exist
      if (review.categories && Array.isArray(review.categories)) {
        for (const cat of review.categories) {
          if (cat.category && typeof cat.rating === 'number') {
            await prisma.reviewCategoryRating.create({
              data: {
                reviewId: createdReview.id,
                category: cat.category,
                rating: cat.rating,
              }
            });
          }
        }
      }

      insertedCount++;
    }

    const finalCount = await prisma.review.count();
    return NextResponse.json({ 
      ok: true, 
      message: "Database seeded successfully", 
      inserted: insertedCount,
      totalReviews: finalCount 
    });

  } catch (error: any) {
    return NextResponse.json({ 
      ok: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}