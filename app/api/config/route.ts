import { NextResponse } from "next/server"
import { getAppConfig, getProductionReadiness } from "@/lib/app-config"

export async function GET() {
  const config = getAppConfig()
  const productionReadiness = getProductionReadiness()

  return NextResponse.json({
    service: "recallzero",
    mode: config.mode,
    demoMode: config.demoMode,
    productionMode: config.productionMode,
    demoSeedingEnabled: config.demoSeedingEnabled,
    signInEnabled: config.signInEnabled,
    authProvider: config.authProvider,
    authConfigured: config.authConfigured,
    sessionConfigured: config.sessionConfigured,
    billingProvider: config.billingProvider,
    billingConfigured: config.billingConfigured,
    connectorWebhookProtected: config.connectorWebhookProtected,
    storage: config.storage,
    productionReadiness,
  })
}
