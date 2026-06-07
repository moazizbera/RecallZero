import { NextResponse } from "next/server";

import { importGeneratedIncidentsFromSourceCsv } from "@/lib/recall-repository";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          persistenceMode: "fallback",
          parsedCount: 0,
          importedCount: 0,
          message: "Attach a CSV file in the 'file' field.",
          fileName: "unknown.csv",
          previewIncidents: [],
        },
        { status: 400 },
      );
    }

    const csvText = await file.text();
    const result = await importGeneratedIncidentsFromSourceCsv(csvText, file.name);

    return NextResponse.json(result, {
      status: result.ok ? 200 : 400,
    });
  } catch (error) {
    console.error("Failed to generate incidents from source CSV.", error);

    return NextResponse.json(
      {
        ok: false,
        persistenceMode: "fallback",
        parsedCount: 0,
        importedCount: 0,
        message: "Unexpected error while generating incidents from source data.",
        fileName: "unknown.csv",
        previewIncidents: [],
      },
      { status: 500 },
    );
  }
}