export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { normalizeHostaway } from "../../../../lib/normalizers/hostaway";

// Hostaway API base URL (based on common API patterns)
const HOSTAWAY_API_BASE = "https://api.hostaway.com/v1";

/**
 * API route handler for GET /api/reviews/hostaway.
 * 
 * This route attempts to fetch reviews from the Hostaway API using the provided credentials.
 * If the API returns no reviews (as expected in sandbox), falls back to mock data.
 * Supports query parameters: listingId, from, to, channel, limit, cursor
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const listingId = searchParams.get('listingId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const channel = searchParams.get('channel');
  const limit = parseInt(searchParams.get('limit') || '50');
  const cursor = searchParams.get('cursor');

  try {
    // First, try to fetch from Hostaway API with provided credentials
    const apiResult = await fetchFromHostawayAPI({
      listingId,
      from,
      to,
      channel,
      limit,
      cursor
    });

    // If API returns reviews, use them
    if (apiResult.success && apiResult.reviews.length > 0) {
      console.log(`✅ Fetched ${apiResult.reviews.length} reviews from Hostaway API`);
      const normalized = normalizeHostaway({ reviews: apiResult.reviews });
      return NextResponse.json({ 
        reviews: normalized, 
        meta: apiResult.meta,
        source: "hostaway_api" 
      });
    }

    // If API returns no reviews (expected in sandbox), fall back to mock data
    console.log("📄 Hostaway API returned no reviews, using mock data fallback");
    const mockData = await getMockData();
    const normalized = normalizeHostaway(mockData);
    
    // Filter mock data based on query parameters
    let filteredReviews = normalized;
    if (listingId) {
      filteredReviews = normalized.filter(review => review.property.name === listingId || review.property.slug === listingId);
    }
    if (from) {
      const fromDate = new Date(from);
      filteredReviews = filteredReviews.filter(review => new Date(review.submitted_at) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      filteredReviews = filteredReviews.filter(review => new Date(review.submitted_at) <= toDate);
    }
    if (channel) {
      filteredReviews = filteredReviews.filter(review => review.channel === channel);
    }

    // Apply pagination
    const startIndex = cursor ? parseInt(cursor) : 0;
    const endIndex = startIndex + limit;
    const paginatedReviews = filteredReviews.slice(startIndex, endIndex);
    const nextCursor = endIndex < filteredReviews.length ? endIndex.toString() : undefined;

    return NextResponse.json({ 
      reviews: paginatedReviews,
      meta: { 
        total: filteredReviews.length,
        nextCursor 
      },
      source: "mock_data" 
    });

  } catch (err: any) {
    console.error("❌ Error in Hostaway API route:", err.message);
    return NextResponse.json(
      { 
        ok: false, 
        error: "Failed to fetch reviews", 
        details: err?.message || "Unknown error" 
      },
      { status: 500 }
    );
  }
}

/**
 * Attempt to fetch reviews from Hostaway API
 */
async function fetchFromHostawayAPI(params: {
  listingId?: string | null;
  from?: string | null; 
  to?: string | null;
  channel?: string | null;
  limit: number;
  cursor?: string | null;
}) {
  const accountId = process.env.HOSTAWAY_ACCOUNT_ID;
  const apiKey = process.env.HOSTAWAY_API_KEY;

  if (!accountId || !apiKey) {
    console.log("⚠️ Hostaway credentials not configured, skipping API call");
    return { success: false, reviews: [], meta: {} };
  }

  try {
    // Build query parameters
    const queryParams = new URLSearchParams();
    if (params.listingId) queryParams.append('listingId', params.listingId);
    if (params.from) queryParams.append('from', params.from);
    if (params.to) queryParams.append('to', params.to);
    if (params.channel) queryParams.append('channel', params.channel);
    queryParams.append('limit', params.limit.toString());
    if (params.cursor) queryParams.append('cursor', params.cursor);

    // Try common review endpoint patterns
    const possibleEndpoints = [
      `/reviews?${queryParams}`,
      `/accounts/${accountId}/reviews?${queryParams}`,
      `/review?${queryParams}`,
      `/guest-reviews?${queryParams}`
    ];

    for (const endpoint of possibleEndpoints) {
      const url = `${HOSTAWAY_API_BASE}${endpoint}`;
      
      console.log(`🔍 Trying Hostaway endpoint: ${endpoint}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-Hostaway-Account-Id': accountId
        }
      });

      if (response.status === 404) {
        console.log(`📍 Endpoint ${endpoint} not found, trying next...`);
        continue;
      }

      if (response.status === 401 || response.status === 403) {
        console.log(`🔐 Authentication failed for ${endpoint}`);
        continue;
      }

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Success! Found reviews endpoint: ${endpoint}`);
        
        // Handle different possible response formats
        const reviews = data.reviews || data.data || data.result || [];
        const meta = {
          total: data.total || reviews.length,
          nextCursor: data.nextCursor || data.cursor || undefined
        };

        return { success: true, reviews, meta };
      }

      console.log(`❌ Endpoint ${endpoint} returned ${response.status}: ${response.statusText}`);
    }

    console.log("🚫 No working review endpoints found");
    return { success: false, reviews: [], meta: {} };

  } catch (error: any) {
    console.error("🔥 Hostaway API fetch error:", error.message);
    return { success: false, reviews: [], meta: {} };
  }
}

/**
 * Load mock data as fallback
 */
async function getMockData() {
  const filePath = path.join(process.cwd(), "mock_data", "hostaway_reviews.json");
  const file = await fs.readFile(filePath, "utf-8");
  return JSON.parse(file);
}