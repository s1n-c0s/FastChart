import * as React from "react"
import {
  Bar,
  BarChart as RechartsBarChart,
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

export interface BarChartProps {
  data: Datum[]
  isHorizontal?: boolean
  containerRef?: React.RefObject<HTMLDivElement>
  children?: React.ReactNode
}

export function BarChart({
  data,
  isHorizontal = true,
  containerRef,
  children,
}: BarChartProps) {
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
    <div ref={containerRef} className="h-[380px]">
      <ChartContainer
        config={chartConfig}
        className="w-full [&_.recharts-cartesian-grid-horizontal]:stroke-border [&_.recharts-cartesian-grid-vertical]:stroke-border"
      >
        <RechartsBarChart
          data={data}
          layout={isHorizontal ? "horizontal" : "vertical"}
        >
          <CartesianGrid strokeDasharray="3 3" />
          {isHorizontal ? (
            <>
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
            </>
          ) : (
            <>
              <XAxis type="number" tickLine={false} axisLine={false} />
              <YAxis
                dataKey="label"
                type="category"
                tickLine={false}
                axisLine={false}
              />
            </>
          )}
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
          <Bar
            dataKey="value"
            radius={isHorizontal ? [6, 6, 0, 0] : [0, 6, 6, 0]}
            fill="var(--color-primary)"
          />
          {children}
        </RechartsBarChart>
      </ChartContainer>
    </div>
  )
}