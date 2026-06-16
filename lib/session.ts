import { createHmac, timingSafeEqual } from "node:crypto"

export const SESSION_COOKIE = "recallzero_session"

export interface AppSession {
  email: string
  name: string
  workspaceId: string
  role: "admin" | "operator" | "reviewer" | "viewer"
  createdAt: number
}

function sessionSecret() {
  return process.env.RECALLZERO_SESSION_SECRET || "recallzero-demo-session-secret"
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url")
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8")
}

function sign(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload, "utf8").digest("base64url")
}

export function createSessionToken(session: AppSession) {
  const payload = base64UrlEncode(JSON.stringify(session))
  return `${payload}.${sign(payload)}`
}

export function parseSessionToken(token?: string): AppSession | null {
  if (!token) return null
  const [payload, signature] = token.split(".")
  if (!payload || !signature) return null

  const expected = sign(payload)
  const expectedBuffer = Buffer.from(expected)
  const signatureBuffer = Buffer.from(signature)
  if (expectedBuffer.length !== signatureBuffer.length || !timingSafeEqual(expectedBuffer, signatureBuffer)) {
    return null
  }

  try {
    return JSON.parse(base64UrlDecode(payload)) as AppSession
  } catch {
    return null
  }
}

export function workspaceIdFromEmail(email: string) {
  const domain = email.split("@")[1] || "demo.local"
  return domain.replace(/[^a-z0-9]/gi, "-").toLowerCase()
}
