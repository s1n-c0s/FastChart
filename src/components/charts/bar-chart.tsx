import * as React from "react"
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
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
    <div ref={containerRef} className="h-full w-full">
      <ChartContainer
        config={chartConfig}
        className="h-full w-full"
      >
        <RechartsBarChart
          data={data}
          layout={isHorizontal ? "horizontal" : "vertical"}
          margin={{ top: 8, right: 16, bottom: isHorizontal ? 8 : 24, left: isHorizontal ? 16 : 8 }}
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
                width={60}
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
          >
            {data.map((item) => (
              <Cell key={item.id} fill={item.color} />
            ))}
          </Bar>
          {children}
        </RechartsBarChart>
      </ChartContainer>
    </div>
  )
}