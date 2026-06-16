export type RecallZeroMode = "demo" | "production"

const validModes: RecallZeroMode[] = ["demo", "production"]

export function getRecallZeroMode(): RecallZeroMode {
  const configured = process.env.RECALLZERO_MODE || process.env.NEXT_PUBLIC_RECALLZERO_MODE || "demo"
  return validModes.includes(configured as RecallZeroMode) ? (configured as RecallZeroMode) : "demo"
}

export function getAppConfig() {
  const mode = getRecallZeroMode()
  const demoMode = mode === "demo"
  const authProvider = process.env.RECALLZERO_AUTH_PROVIDER || "not-configured"
  const sessionConfigured = Boolean(process.env.RECALLZERO_SESSION_SECRET)
  const connectorWebhookProtected = Boolean(process.env.RECALLZERO_CONNECTOR_WEBHOOK_SECRET)

  return {
    mode,
    demoMode,
    productionMode: mode === "production",
    demoSeedingEnabled: demoMode && process.env.RECALLZERO_DEMO_SEEDING !== "false",
    storage: "dynamodb",
    signInEnabled: process.env.RECALLZERO_SIGNIN_ENABLED !== "false",
    authProvider,
    authConfigured: authProvider !== "not-configured",
    sessionConfigured,
    billingProvider: process.env.RECALLZERO_BILLING_PROVIDER || "stripe",
    billingConfigured: Boolean(
      process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_PRICE_PILOT && process.env.STRIPE_PRICE_PROGRAM,
    ),
    connectorWebhookProtected,
    requiredProductionEnv: ["AWS_REGION", "DYNAMODB_TABLE_NAME"],
    credentialMode: process.env.AWS_ROLE_ARN
      ? "oidc-role"
      : process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? "access-key"
        : "not-configured",
  }
}

export function getProductionReadiness() {
  const config = getAppConfig()
  const missing = config.requiredProductionEnv.filter((name) => !process.env[name])
  if (config.credentialMode === "not-configured") {
    missing.push("AWS_ROLE_ARN or AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY")
  }
  if (config.productionMode && !config.authConfigured) {
    missing.push("RECALLZERO_AUTH_PROVIDER")
  }
  if (config.productionMode && !config.sessionConfigured) {
    missing.push("RECALLZERO_SESSION_SECRET")
  }
  if (config.productionMode && !config.billingConfigured) {
    missing.push("STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET/STRIPE_PRICE_PILOT/STRIPE_PRICE_PROGRAM")
  }
  if (config.productionMode && !config.connectorWebhookProtected) {
    missing.push("RECALLZERO_CONNECTOR_WEBHOOK_SECRET")
  }

  return {
    ready: missing.length === 0,
    missing,
    credentialMode: config.credentialMode,
    sessionConfigured: config.sessionConfigured,
    billingConfigured: config.billingConfigured,
    connectorWebhookProtected: config.connectorWebhookProtected,
  }
}
