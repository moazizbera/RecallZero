import { NextResponse } from "next/server"
import { CONNECTORS, CONNECTOR_SIGNALS } from "@/lib/connectors"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params
  const def = CONNECTORS.find((c) => c.key === key)
  if (!def) {
    return NextResponse.json({ error: "Unknown connector." }, { status: 404 })
  }
  const signal = CONNECTOR_SIGNALS[key]
  if (!signal) {
    return NextResponse.json(
      { connector: def, signal: null, message: "No live feed wired for this connector yet." },
      { status: 200 },
    )
  }
  return NextResponse.json({ connector: def, signal })
}
