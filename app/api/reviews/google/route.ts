export const runtime = 'nodejs';

import { NextResponse } from "next/server";

// Tiny in-process cache (avoids repeated calls in dev; NOT persistent)
const cache = new Map<string, { at: number; ttl: number; payload: any }>();
const TTL_SECONDS = 600; // 10 min

type NormalizedGoogleReview = {
  source: "GOOGLE";
  channel: "google";
  rating_overall: number | null;   // 1..5
  text: string;
  guest_name: string;
  submitted_at: string | null;     // ISO
  profile_photo_url: string | null;
  relative_time: string | null;
};

function normalize(r: any): NormalizedGoogleReview {
  return {
    source: "GOOGLE",
    channel: "google",
    rating_overall: r?.rating ?? null,
    text: r?.originalText?.text || r?.text || "",
    guest_name: r?.authorAttribution?.displayName || "Google user",
    submitted_at: r?.publishTime ? new Date(r.publishTime).toISOString() : null,
    profile_photo_url: r?.authorAttribution?.photoUri || null,
    relative_time: r?.relativePublishTimeDescription || null,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get("placeId");   // required to request
  const lang = searchParams.get("lang") || "fr"; // default lang

  if (!placeId) {
    return NextResponse.json({ status: "skipped", reason: "missing placeId" });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    // No key? Return a graceful "skipped" payload (so UI doesn't break)
    return NextResponse.json({ status: "skipped", reason: "missing GOOGLE_MAPS_API_KEY" });
  }

  const cacheKey = `${placeId}:${lang}`;
  const hit = cache.get(cacheKey);
  const now = Date.now() / 1000;
  if (hit && now - hit.at < hit.ttl) {
    return NextResponse.json(hit.payload);
  }

  // Places (New) Place Details endpoint
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=${encodeURIComponent(lang)}`;

  // Ask only for what we need (required Field Mask)
  const fieldMask = ["displayName", "rating", "userRatingCount", "googleMapsUri", "reviews"].join(",");

  const resp = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
    },
    cache: "no-store",
  });

  if (!resp.ok) {
    const text = await resp.text();
    return NextResponse.json({ status: "error", http: resp.status, detail: text }, { status: resp.status });
  }

  const data = await resp.json();
  const reviews = Array.isArray(data.reviews) ? data.reviews.map(normalize) : [];

  const payload = {
    status: "ok",
    meta: {
      source: "GOOGLE" as const,
      place_name: data?.displayName?.text ?? null,
      rating: data?.rating ?? null,               // aggregate (1..5)
      ratings_count: data?.userRatingCount ?? 0,  // #ratings
      maps_url: data?.googleMapsUri ?? null,
    },
    data: reviews, // up to 5; Google decides relevance
  };

  cache.set(cacheKey, { at: now, ttl: TTL_SECONDS, payload });
  return NextResponse.json(payload);
}