"use client"

import { useMemo } from "react"
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Decision } from "@/lib/types"

const chartConfig: ChartConfig = {
  exposure: {
    label: "Projected exposure",
    color: "var(--chart-3)",
  },
}

/** Parse the high end of an exposure string like "$22.1M–$110.4M" into a number (in millions). */
function parseExposureCeiling(estimate: string): number {
  const matches = estimate.match(/([\d.]+)\s*([MBK])/gi)
  if (!matches || matches.length === 0) return 10
  const last = matches[matches.length - 1]
  const num = Number.parseFloat(last)
  const unit = last.slice(-1).toUpperCase()
  if (Number.isNaN(num)) return 10
  if (unit === "B") return num * 1000
  if (unit === "K") return num / 1000
  return num
}

function trajectoryShape(trajectory: Decision["delayRisk"]["trajectory"]) {
  // Returns a growth exponent: how aggressively exposure compounds with delay.
  switch (trajectory) {
    case "critical":
      return 2.4
    case "rising":
      return 1.6
    default:
      return 1.05
  }
}

export function DelayRiskChart({ decision }: { decision: Decision }) {
  const { delayRisk, exposureEstimate } = decision

  const data = useMemo(() => {
    const ceiling = parseExposureCeiling(exposureEstimate)
    const exponent = trajectoryShape(delayRisk.trajectory)
    const horizon = Math.max(delayRisk.hoursUntilCritical * 2, 24)
    const points = 9
    const step = horizon / (points - 1)

    return Array.from({ length: points }, (_, i) => {
      const hour = Math.round(i * step)
      // Exposure starts at a floor and compounds toward the ceiling based on trajectory.
      const progress = horizon === 0 ? 1 : hour / horizon
      const floor = ceiling * 0.18
      const exposure = floor + (ceiling - floor) * Math.pow(progress, 1 / exponent)
      return {
        hour: `${hour}h`,
        hourNum: hour,
        exposure: Number(exposure.toFixed(1)),
      }
    })
  }, [exposureEstimate, delayRisk.trajectory, delayRisk.hoursUntilCritical])

  const trajCls =
    delayRisk.trajectory === "critical"
      ? "text-destructive"
      : delayRisk.trajectory === "rising"
        ? "text-warning"
        : "text-success"

  // Find the data point closest to hoursUntilCritical for the reference line.
  const criticalLabel = `${delayRisk.hoursUntilCritical}h`
  const closest = data.reduce((prev, curr) =>
    Math.abs(curr.hourNum - delayRisk.hoursUntilCritical) <
    Math.abs(prev.hourNum - delayRisk.hoursUntilCritical)
      ? curr
      : prev,
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Clock className={cn("h-4 w-4", trajCls)} />
          How delay changes the risk
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ChartContainer config={chartConfig} className="h-[180px] w-full">
          <AreaChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="exposureFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-exposure)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--color-exposure)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="hour"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={11}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              fontSize={11}
              width={44}
              tickFormatter={(v) => `$${v}M`}
            />
            <ChartTooltip
              cursor={{ stroke: "var(--border)" }}
              content={
                <ChartTooltipContent
                  formatter={(value) => [`$${value}M projected exposure`, ""]}
                  labelFormatter={(label) => `After ${label} of delay`}
                />
              }
            />
            {closest && (
              <ReferenceLine
                x={closest.hour}
                stroke="var(--destructive)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Critical · ${criticalLabel}`,
                  position: "insideTopRight",
                  fill: "var(--destructive)",
                  fontSize: 10,
                }}
              />
            )}
            <Area
              dataKey="exposure"
              type="monotone"
              stroke="var(--color-exposure)"
              strokeWidth={2}
              fill="url(#exposureFill)"
            />
          </AreaChart>
        </ChartContainer>
        <p className="text-sm leading-relaxed text-muted-foreground">{delayRisk.narrative}</p>
      </CardContent>
    </Card>
  )
}
