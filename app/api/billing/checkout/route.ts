import { NextResponse } from "next/server"
import { getAppConfig } from "@/lib/app-config"
import { getPlan, type PlanKey } from "@/lib/plans"
import { getCurrentSession } from "@/lib/workspace-context"

const stripePriceEnv: Partial<Record<PlanKey, string>> = {
  pilot: "STRIPE_PRICE_PILOT",
  program: "STRIPE_PRICE_PROGRAM",
  enterprise: "STRIPE_PRICE_ENTERPRISE",
}

function appUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.RECALLZERO_APP_URL) return process.env.RECALLZERO_APP_URL
  if (process.env.NODE_ENV === "production") return "https://recallzero-app.vercel.app"
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return "http://localhost:3000"
}

export async function POST(request: Request) {
  try {
    const { planKey } = (await request.json()) as { planKey?: PlanKey }
    const plan = getPlan(planKey)
    const config = getAppConfig()
    const baseUrl = appUrl()
    const appSession = await getCurrentSession()
    if (!appSession) {
      return NextResponse.json({ error: "Create or sign in to a workspace before choosing a plan." }, { status: 401 })
    }
    const workspaceId = appSession.workspaceId

    if (plan.key === "free" || plan.key === "enterprise") {
      return NextResponse.json({
        mode: "demo-checkout",
        url: `${baseUrl}/billing/success?plan=${plan.key}&checkout=${plan.key === "enterprise" ? "sales" : "demo"}`,
      })
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const priceEnvName = stripePriceEnv[plan.key]
    const priceId = priceEnvName ? process.env[priceEnvName] : undefined

    if (config.demoMode || !stripeSecretKey || !priceId) {
      return NextResponse.json({
        mode: "demo-checkout",
        url: `${baseUrl}/billing/success?plan=${plan.key}&checkout=demo`,
      })
    }

    const body = new URLSearchParams({
      mode: "subscription",
      success_url: `${baseUrl}/billing/success?plan=${plan.key}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/signup?plan=${plan.key}`,
      client_reference_id: plan.key,
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      "metadata[planKey]": plan.key,
      "subscription_data[metadata][planKey]": plan.key,
    })
    if (workspaceId) {
      body.set("metadata[workspaceId]", workspaceId)
      body.set("subscription_data[metadata][workspaceId]", workspaceId)
    }

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    })

    const session = await response.json()
    if (!response.ok || !session.url) {
      console.error("[recallzero] stripe checkout error", session)
      return NextResponse.json({ error: "Could not start Stripe checkout." }, { status: 502 })
    }

    return NextResponse.json({ mode: "stripe", url: session.url })
  } catch (error) {
    console.error("[recallzero] billing checkout error", error)
    return NextResponse.json({ error: "Could not start checkout." }, { status: 500 })
  }
}
