import { NextResponse } from "next/server";

import { getDashboardSnapshot } from "@/lib/recall-repository";

export async function GET() {
  const snapshot = await getDashboardSnapshot();

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      snapshot,
    },
    { status: 200 },
  );
}