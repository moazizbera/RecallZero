import { NextResponse } from "next/server"
import { CONNECTORS } from "@/lib/connectors"
import { listIncidents } from "@/lib/db"
import { getAppConfig, getProductionReadiness } from "@/lib/app-config"

export async function GET() {
  try {
    const config = getAppConfig()
    const productionReadiness = getProductionReadiness()
    const incidents = await listIncidents()
    const liveConnectors = CONNECTORS.filter((connector) => connector.status === "live").length

    return NextResponse.json({
      ok: true,
      service: "recallzero",
      mode: config.mode,
      storage: config.storage,
      demoSeedingEnabled: config.demoSeedingEnabled,
      productionReady: productionReadiness.ready,
      connectorWebhookProtected: config.connectorWebhookProtected,
      incidents: incidents.length,
      liveConnectors,
      checkedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[recallzero] health error:", error)
    return NextResponse.json(
      {
        ok: false,
        service: "recallzero",
        mode: getAppConfig().mode,
        error: "Health check failed.",
        checkedAt: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
