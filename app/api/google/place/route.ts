// app/api/google/place/route.ts
import { NextResponse } from "next/server"
import { fetchGoogleSummaryAndReviews } from "@/lib/google"

export const runtime = "nodejs"

export async function GET(req: Request) {
  if (!process.env.NEXT_PUBLIC_GOOGLE_ENABLED)
    return NextResponse.json({ ok: false, disabled: true }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const placeId = searchParams.get("placeId") || ""
  const limit = Number(searchParams.get("limit") || 5)
  const language = searchParams.get("lang") || "en"

  if (!placeId) {
    return NextResponse.json({ ok: false, error: "Missing placeId" }, { status: 400 })
  }

  try {
    const data = await fetchGoogleSummaryAndReviews(placeId, { language, limit })
    return NextResponse.json({ ok: true, ...data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}