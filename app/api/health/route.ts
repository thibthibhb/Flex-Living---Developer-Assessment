export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    ok: true, 
    timestamp: new Date().toISOString(),
    message: "Health check successful"
  });
}