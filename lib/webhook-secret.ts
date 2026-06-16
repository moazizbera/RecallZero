import { createHash, randomBytes, timingSafeEqual } from "node:crypto"

export function createWebhookSecret() {
  return `rz_whsec_${randomBytes(24).toString("base64url")}`
}

export function hashWebhookSecret(secret: string) {
  return createHash("sha256").update(secret, "utf8").digest("hex")
}

export function secretPreview(secret: string) {
  return `${secret.slice(0, 10)}...${secret.slice(-4)}`
}

export function verifyWebhookSecret(secret: string, expectedHash?: string) {
  if (!expectedHash) return false
  const actual = Buffer.from(hashWebhookSecret(secret), "hex")
  const expected = Buffer.from(expectedHash, "hex")
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
