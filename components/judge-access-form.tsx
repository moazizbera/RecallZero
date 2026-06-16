"use client"

import { useState } from "react"
import { ArrowRight, KeyRound, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function JudgeAccessForm({ requiresCode }: { requiresCode: boolean }) {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const response = await fetch("/api/auth/judge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
    const data = await response.json()
    if (!response.ok) {
      setError(data.error || "Could not open judge workspace.")
      setLoading(false)
      return
    }
    window.location.assign(data.redirectTo || "/brief")
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      {requiresCode && (
        <div className="grid gap-2">
          <Label htmlFor="judge-code">Judge access code</Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="judge-code" value={code} onChange={(event) => setCode(event.target.value)} className="pl-9" autoComplete="one-time-code" required />
          </div>
        </div>
      )}
      {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full gap-1.5">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        Open judge workspace
      </Button>
    </form>
  )
}
