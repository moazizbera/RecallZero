"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type SourceImportResponse = {
  ok: boolean;
  persistenceMode: "database" | "fallback";
  parsedCount: number;
  importedCount: number;
  message: string;
  fileName: string;
  previewIncidents: Array<{
    id: string;
    title: string;
    severity: "Severity A" | "Severity B" | "Severity C";
    supplier: string;
    supplierLot: string;
    affectedOrders: number;
    affectedLocations: number;
    impactedRevenue: number;
    taskCount: number;
  }>;
};

export function SourceGenerationCard() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"success" | "error">("success");
  const [previewIncidents, setPreviewIncidents] = useState<SourceImportResponse["previewIncidents"]>([]);
  const [isPending, startTransition] = useTransition();

  const handleImport = async () => {
    if (!file) {
      setTone("error");
      setMessage("Choose a source CSV file before generating incidents.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/import/source", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as SourceImportResponse;
      setTone(result.ok ? "success" : "error");
      setMessage(result.message);
      setPreviewIncidents(result.previewIncidents ?? []);

      if (result.ok) {
        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      setTone("error");
      setMessage("Unable to generate incidents from the uploaded source file.");
      setPreviewIncidents([]);
    }
  };

  return (
    <div className="rounded-[1.6rem] border border-line bg-white/80 p-5">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">
        Source-driven generation
      </p>
      <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
        Generate incidents from supplier and order exposure data
      </h3>
      <p className="mt-3 text-sm leading-6 text-muted">
        Upload one CSV containing supplier lot exposure, impacted orders, regions,
        and revenue risk. RecallZero converts the rows into incidents, locations,
        tasks, and timeline events automatically.
      </p>

      <div className="mt-5 rounded-[1.3rem] border border-dashed border-line bg-surface p-4">
        <label className="flex cursor-pointer flex-col gap-2 text-sm text-muted">
          <span className="font-semibold text-foreground">Select source CSV file</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="block w-full text-sm text-muted file:mr-4 file:rounded-full file:border-0 file:bg-[#efe3d3] file:px-4 file:py-2 file:font-semibold file:text-foreground hover:file:bg-[#e5d5c3]"
          />
          <span>{file ? `Selected: ${file.name}` : "No source file selected yet."}</span>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleImport}
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Generating incidents..." : "Generate incidents from source CSV"}
        </button>
        <a
          href="/templates/source-incident-template.csv"
          className="inline-flex items-center justify-center rounded-full border border-line bg-white/70 px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-strong"
        >
          Download source template
        </a>
      </div>

      {message ? (
        <p className={tone === "success" ? "mt-4 text-sm text-[#1f6b45]" : "mt-4 text-sm text-accent"}>
          {message}
        </p>
      ) : null}

      {previewIncidents.length > 0 ? (
        <div className="mt-6 grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
              Generated incident preview
            </p>
            <p className="text-xs text-muted">
              {previewIncidents.length} generated from the uploaded source file
            </p>
          </div>

          {previewIncidents.map((incident) => (
            <div
              key={incident.id}
              className="rounded-[1.3rem] border border-line bg-surface px-4 py-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                    {incident.id}
                  </p>
                  <h4 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">
                    {incident.title}
                  </h4>
                  <p className="mt-1 text-sm text-muted">
                    {incident.supplier} · {incident.supplierLot}
                  </p>
                </div>
                <span className="rounded-full bg-[#f8ece3] px-3 py-1 text-xs font-semibold text-accent">
                  {incident.severity}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {[
                  ["Orders", `${incident.affectedOrders}`],
                  ["Locations", `${incident.affectedLocations}`],
                  ["Revenue risk", `$${incident.impactedRevenue.toLocaleString()}`],
                  ["Tasks", `${incident.taskCount}`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-line bg-white/70 p-3">
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                      {label}
                    </p>
                    <p className="mt-2 text-base font-semibold text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}