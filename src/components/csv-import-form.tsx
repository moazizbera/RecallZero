"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type CsvDataset = "incidents" | "locations" | "tasks";

type CsvImportResponse = {
  ok: boolean;
  persistenceMode: "database" | "fallback";
  storageLabel: string;
  importedRows: number;
  message: string;
};

const datasetOptions: Array<{
  value: CsvDataset;
  label: string;
  help: string;
}> = [
  {
    value: "incidents",
    label: "Incidents CSV",
    help: "Use one row per incident with supplier, lot, severity, and impact columns.",
  },
  {
    value: "locations",
    label: "Locations CSV",
    help: "Attach impacted sites and owners to existing incident IDs.",
  },
  {
    value: "tasks",
    label: "Tasks CSV",
    help: "Import cross-functional action queues for existing incidents.",
  },
];

export function CsvImportForm() {
  const router = useRouter();
  const [dataset, setDataset] = useState<CsvDataset>("incidents");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"success" | "error">("success");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setTone("error");
      setMessage("Choose a CSV file before starting the import.");
      return;
    }

    const formData = new FormData();
    formData.append("dataset", dataset);
    formData.append("file", file);

    try {
      const response = await fetch("/api/import/csv", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as CsvImportResponse;
      setTone(result.ok ? "success" : "error");
      setMessage(result.message);

      if (result.ok) {
        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      setTone("error");
      setMessage("Unable to upload the CSV file right now.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-[1.5rem] border border-line bg-white/70 p-5">
      <div className="grid gap-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
            CSV import
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
            Upload operational datasets
          </h3>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-foreground">Dataset type</span>
          <select
            value={dataset}
            onChange={(event) => setDataset(event.target.value as CsvDataset)}
            className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-foreground outline-none"
          >
            {datasetOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-sm text-muted">
            {datasetOptions.find((option) => option.value === dataset)?.help}
          </p>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-foreground">CSV file</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="rounded-2xl border border-dashed border-line bg-surface px-4 py-5 text-sm text-muted file:mr-4 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Importing CSV..." : "Import CSV dataset"}
        </button>

        {message ? (
          <p className={tone === "success" ? "text-sm text-[#1f6b45]" : "text-sm text-accent"}>
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}