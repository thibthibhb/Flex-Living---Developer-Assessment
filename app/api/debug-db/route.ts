export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";

export async function GET() {
  try {
    const [reviews, properties, selections] = await Promise.all([
      prisma.review.count(),
      prisma.property.count(),
      prisma.selection.count(),
    ]);
    
    return NextResponse.json({
      ok: true,
      counts: { reviews, properties, selections },
      env: {
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
        hasDirectUrl: Boolean(process.env.DIRECT_URL),
        nodeVersion: process.version,
        nodeEnv: process.env.NODE_ENV,
      },
      database: {
        url: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.split('@')[1]?.split('?')[0] || 'masked'}` : 'not set'
      }
    });
  } catch (e: any) {
    return NextResponse.json({ 
      ok: false, 
      error: e.message, 
      stack: process.env.NODE_ENV === 'development' ? e.stack : undefined 
    }, { status: 500 });
  }
}