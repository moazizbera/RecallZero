import { NextResponse } from "next/server";

import { importCsvDataset, type CsvDataset } from "@/lib/recall-repository";

const allowedDatasets = new Set<CsvDataset>(["incidents", "locations", "tasks"]);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const dataset = formData.get("dataset");
    const file = formData.get("file");

    if (typeof dataset !== "string" || !allowedDatasets.has(dataset as CsvDataset)) {
      return NextResponse.json(
        {
          ok: false,
          persistenceMode: "fallback",
          importedRows: 0,
          message: "Choose a valid dataset type before importing.",
        },
        { status: 400 },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          persistenceMode: "fallback",
          importedRows: 0,
          message: "Attach a CSV file before starting the import.",
        },
        { status: 400 },
      );
    }

    const content = await file.text();
    const result = await importCsvDataset(dataset as CsvDataset, content);

    return NextResponse.json(result, {
      status: result.ok ? 200 : 400,
    });
  } catch (error) {
    console.error("Failed to import CSV dataset.", error);

    return NextResponse.json(
      {
        ok: false,
        persistenceMode: "fallback",
        importedRows: 0,
        message: "Unexpected error while importing CSV data.",
      },
      { status: 500 },
    );
  }
}