"use client"

import { useState } from "react"
import { Check, Copy, KeyRound, Loader2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={copy} className="gap-1.5">
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : label}
    </Button>
  )
}

export function RotateWebhookSecretButton() {
  const [loading, setLoading] = useState(false)
  const [secret, setSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function rotate() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/webhook-secret", { method: "POST" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not rotate secret.")
      setSecret(data.secret)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not rotate secret.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-secondary/30 p-3">
      <Button type="button" onClick={rotate} disabled={loading} className="w-fit gap-1.5">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
        Rotate webhook secret
      </Button>
      {secret && (
        <div className="grid gap-2 rounded-lg border border-warning/35 bg-warning/10 p-3">
          <div className="flex items-start gap-2">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Copy this now. RecallZero stores only a hash and will not show this secret again.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-md border border-border bg-background px-2 py-1.5 text-xs">{secret}</code>
            <CopyButton value={secret} label="Copy secret" />
          </div>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
