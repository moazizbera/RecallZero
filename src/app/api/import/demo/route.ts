import { NextResponse } from "next/server";

import { seedDemoData } from "@/lib/recall-repository";

export async function POST() {
  try {
    const result = await seedDemoData();

    return NextResponse.json(result, {
      status: result.ok ? 200 : 400,
    });
  } catch (error) {
    console.error("Failed to seed demo data.", error);

    return NextResponse.json(
      {
        ok: false,
        persistenceMode: "fallback",
        incidentCount: 0,
        message: "Unexpected error while seeding demo data.",
      },
      { status: 500 },
    );
  }
}