export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { normalizeHostaway } from "../../../../lib/normalizers/hostaway";

/**
 * API route handler for GET /api/reviews/hostaway.
 *
 * This route reads the mock Hostaway reviews JSON from the local
 * filesystem, normalizes it into a consistent shape, and returns it as
 * JSON. If an error occurs during reading or normalization, an error
 * response is returned.
 */
export async function GET() {
  try {
    // Determine the file path to the mock Hostaway data. Using process.cwd()
    // ensures we resolve relative to the project root when running in Next.
    const filePath = path.join(process.cwd(), "mock_data", "hostaway_reviews.json");
    const file = await fs.readFile(filePath, "utf-8");
    const json = JSON.parse(file);
    const normalized = normalizeHostaway(json);
    return NextResponse.json({ status: "ok", data: normalized });
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", message: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}