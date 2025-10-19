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
    <div ref={containerRef} className="h-full w-full">
      <ChartContainer
        config={chartConfig}
        className="h-full w-full"
      >
        <RechartsLineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
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
            type="monotone"
            dataKey="value"
            stroke="#8884d8"
            strokeWidth={2}
            dot={{ fill: "#8884d8", strokeWidth: 2 }}
          />
        </RechartsLineChart>
      </ChartContainer>
    </div>
  )
}