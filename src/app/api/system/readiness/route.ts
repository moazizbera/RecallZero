import { NextResponse } from "next/server";

import { getBackendReadiness } from "@/lib/recall-repository";

export async function GET() {
  const readiness = getBackendReadiness();

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      readiness,
    },
    { status: 200 },
  );
}