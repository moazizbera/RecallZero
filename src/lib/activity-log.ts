import type { ImportActivity } from "@/lib/recall-repository";

export function formatActivityTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

export function getActivityAccent(action: ImportActivity["action"]) {
  if (action.includes("reset") || action.includes("seed") || action.includes("Reset") || action.includes("Seed")) {
    return {
      badge: "bg-[#f8ece3] text-accent border-[#efcfba]",
      card: "border-[#efcfba] bg-[#fff7f1]",
    };
  }

  if (action.includes("Role")) {
    return {
      badge: "bg-[#e8efe6] text-[#25543a] border-[#bfd2c3]",
      card: "border-[#bfd2c3] bg-[#f5fbf6]",
    };
  }

  return {
    badge: "bg-[#efe7fb] text-[#5b3a8a] border-[#d8c7f0]",
    card: "border-[#d8c7f0] bg-[#faf7ff]",
  };
}