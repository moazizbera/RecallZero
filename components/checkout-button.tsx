"use client"

import { useState } from "react"
import { ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PlanKey } from "@/lib/plans"

export function CheckoutButton({ planKey }: { planKey: PlanKey }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function startCheckout() {
    setLoading(true)
    setError(null)
    try {
      const form = document.querySelector<HTMLFormElement>("form[data-signup-form]")
      const formData = form ? new FormData(form) : null
      const email = String(formData?.get("email") || "").trim()
      const name = String(formData?.get("name") || "").trim()
      const company = String(formData?.get("company") || "").trim()

      if (!email || !email.includes("@")) {
        throw new Error("Enter a valid work email before creating a workspace.")
      }

      const signinResponse = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, company }),
      })
      const signinData = await signinResponse.json()
      if (!signinResponse.ok) {
        throw new Error(signinData.error || "Could not create your workspace session.")
      }

      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey }),
      })
      const data = await response.json()
      if (!response.ok || !data.url) {
        throw new Error(data.error || "Could not start checkout.")
      }
      window.location.assign(data.url)
    } catch (error) {
      console.error("[recallzero] checkout error", error)
      setError(error instanceof Error ? error.message : "Could not start checkout.")
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-2">
      <Button type="button" onClick={startCheckout} disabled={loading} className="w-full gap-1.5">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        {planKey === "free" ? "Create free workspace" : "Continue to secure checkout"}
      </Button>
      {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
    </div>
  )
}
