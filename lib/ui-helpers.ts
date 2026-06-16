import type { ConfidenceBand, Posture } from "./types"

export function postureLabel(posture: Posture): string {
  switch (posture) {
    case "ACTIVATE":
      return "Activate"
    case "HOLD":
      return "Hold"
    case "REJECT":
      return "Reject"
  }
}

export function postureDescription(posture: Posture): string {
  switch (posture) {
    case "ACTIVATE":
      return "Initiate recall / containment now"
    case "HOLD":
      return "Gather evidence before acting"
    case "REJECT":
      return "No recall warranted"
  }
}

/** Tailwind classes for the posture chip/badge. */
export function postureClasses(posture: Posture): string {
  switch (posture) {
    case "ACTIVATE":
      return "bg-destructive/15 text-destructive border-destructive/40"
    case "HOLD":
      return "bg-warning/15 text-warning border-warning/40"
    case "REJECT":
      return "bg-success/15 text-success border-success/40"
  }
}

/** Solid accent color (for bars, dots). */
export function postureAccent(posture: Posture): string {
  switch (posture) {
    case "ACTIVATE":
      return "bg-destructive"
    case "HOLD":
      return "bg-warning"
    case "REJECT":
      return "bg-success"
  }
}

export function confidenceLabel(c: ConfidenceBand): string {
  return c.charAt(0) + c.slice(1).toLowerCase()
}

export function severityLabel(s: "A" | "B" | "C" | "D"): string {
  const map = { A: "Severity A — Critical", B: "Severity B — High", C: "Severity C — Moderate", D: "Severity D — Low" }
  return map[s]
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.round(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}
