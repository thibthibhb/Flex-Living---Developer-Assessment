export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";

/**
 * POST /api/selection
 *
 * Payload: { reviewId: string; approved: boolean }
 *
 * This endpoint allows a manager to approve or unapprove a review for display
 * on the public website. Approval status is stored in the `Selection` model.
 * 
 * SECURITY: Only published reviews can be approved for the website.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reviewId, approved } = body;

    // Validate payload types
    if (typeof reviewId !== "string" || typeof approved !== "boolean") {
      return NextResponse.json(
        { status: "error", message: "Invalid payload" },
        { status: 400 }
      );
    }

    // Check if review exists and get its status
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, status: true },
    });

    if (!review) {
      return NextResponse.json(
        { status: "error", message: "Review not found" },
        { status: 404 }
      );
    }

    // 🚫 SECURITY: Only allow approving PUBLISHED reviews
    if (review.status !== "published" && approved === true) {
      return NextResponse.json(
        { status: "error", message: "Only published reviews can be approved" },
        { status: 422 }
      );
    }

    const now = new Date();
    const selection = await prisma.selection.upsert({
      where: { reviewId },
      update: {
        approvedForWebsite: approved,
        approvedAt: approved ? now : null,
        approvedBy: "manager",
      },
      create: {
        reviewId,
        approvedForWebsite: approved,
        approvedAt: approved ? now : null,
        approvedBy: "manager",
      },
    });

    return NextResponse.json({ status: "ok", data: selection });
  } catch (e: any) {
    return NextResponse.json(
      { status: "error", message: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}