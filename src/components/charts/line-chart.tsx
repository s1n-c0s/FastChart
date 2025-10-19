import * as React from "react"
import {
  Line,
  LineChart as RechartsLineChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import type { Datum } from "@/types"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export interface LineChartProps {
  data: Datum[]
  containerRef?: React.RefObject<HTMLDivElement>
}

export function LineChart({ data, containerRef }: LineChartProps) {
  const chartConfig = React.useMemo(() => {
    return data.reduce((acc, item) => {
      acc[item.id] = {
        label: item.label,
        color: item.color,
      }
      return acc
    }, {} as Record<string, { label: string; color: string }>)
  }, [data])

  return (
    <div ref={containerRef} className="h-[320px]">
      <ChartContainer
        config={chartConfig}
        className="w-full [&_.recharts-cartesian-grid-horizontal]:stroke-border [&_.recharts-cartesian-grid-vertical]:stroke-border"
      >
        <RechartsLineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <ChartTooltip
            content={({ active, payload }) => (
              <ChartTooltipContent
                active={active}
                payload={payload}
                formatter={(value) => (
                  <span>{Number(value).toLocaleString()}</span>
                )}
              />
            )}
          />
          <Line
            type="linear"
            dataKey="value"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={false}
          />
        </RechartsLineChart>
      </ChartContainer>
    </div>
  )
}