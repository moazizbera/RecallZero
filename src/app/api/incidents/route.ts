import { NextResponse } from "next/server";

import { getIncidents } from "@/lib/recall-repository";

export async function GET() {
  const incidents = await getIncidents();

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      incidents,
    },
    { status: 200 },
  );
}