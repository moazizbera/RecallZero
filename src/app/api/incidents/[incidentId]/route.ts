import { NextResponse } from "next/server";

import { getIncidentById } from "@/lib/recall-repository";

type RouteContext = {
  params: Promise<{
    incidentId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { incidentId } = await context.params;
  const incident = await getIncidentById(incidentId);

  if (!incident) {
    return NextResponse.json(
      { error: `Incident ${incidentId} was not found.` },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      incident,
    },
    { status: 200 },
  );
}