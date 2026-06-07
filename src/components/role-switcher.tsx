"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type DashboardRole = "executive" | "ops" | "compliance" | "store";

const roleOptions: Array<{ value: DashboardRole; label: string }> = [
  { value: "executive", label: "Executive" },
  { value: "ops", label: "Operations" },
  { value: "compliance", label: "Compliance" },
  { value: "store", label: "Store Manager" },
];

export function RoleSwitcher({ currentRole }: { currentRole: DashboardRole }) {
  const router = useRouter();
  const [role, setRole] = useState<DashboardRole>(currentRole);
  const [isPending, startTransition] = useTransition();

  const handleChange = async (nextRole: DashboardRole) => {
    setRole(nextRole);

    await fetch("/api/session/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole }),
    });

    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="rounded-[1.4rem] border border-line bg-white/80 p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
        Active role
      </p>
      <div className="mt-3 grid gap-2">
        {roleOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => void handleChange(option.value)}
            disabled={isPending}
            className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-colors ${role === option.value ? "bg-accent text-white" : "bg-surface text-foreground hover:bg-surface-strong"} disabled:opacity-70`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}