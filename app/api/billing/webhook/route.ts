import { createHmac, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { updateWorkspaceBilling } from "@/lib/db"
import type { PlanKey } from "@/lib/plans"

function verifyStripeSignature(payload: string, signature: string, secret: string) {
  const parts = Object.fromEntries(
    signature.split(",").map((part) => {
      const [key, value] = part.split("=")
      return [key, value]
    }),
  )
  const timestamp = parts.t
  const expectedSignature = parts.v1
  if (!timestamp || !expectedSignature) return false

  const signedPayload = `${timestamp}.${payload}`
  const computed = createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex")
  const expectedBuffer = Buffer.from(expectedSignature, "hex")
  const computedBuffer = Buffer.from(computed, "hex")

  return expectedBuffer.length === computedBuffer.length && timingSafeEqual(expectedBuffer, computedBuffer)
}

export async function POST(request: Request) {
  const payload = await request.text()
  const signature = request.headers.get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (webhookSecret) {
    if (!signature || !verifyStripeSignature(payload, signature, webhookSecret)) {
      return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 })
    }
  }

  const event = JSON.parse(payload) as { type?: string; data?: { object?: Record<string, unknown> } }
  const object = event.data?.object || {}
  const metadata = (object.metadata || {}) as Record<string, unknown>
  const planKey = typeof metadata.planKey === "string" ? (metadata.planKey as PlanKey) : undefined
  const workspaceId = typeof metadata.workspaceId === "string" ? metadata.workspaceId : undefined

  switch (event.type) {
    case "checkout.session.completed":
      await updateWorkspaceBilling({ planKey, billingStatus: "active", workspaceId })
      break
    case "customer.subscription.updated":
      await updateWorkspaceBilling({ planKey, billingStatus: "active", workspaceId })
      break
    case "customer.subscription.deleted":
      await updateWorkspaceBilling({ planKey, billingStatus: "canceled", workspaceId })
      break
    case "invoice.payment_failed":
      await updateWorkspaceBilling({ planKey, billingStatus: "past_due", workspaceId })
      break
    default:
      console.info("[recallzero] billing event ignored", event.type)
  }

  return NextResponse.json({ received: true, type: event.type })
}
