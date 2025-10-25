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

  // Horizontal mode: bars grow to the right
  if (isHorizontal) {
    return (
      <div ref={containerRef} className="h-full w-full">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <RechartsBarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 20, bottom: -5, left: -30 }}
            barCategoryGap="15%"
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <YAxis
              dataKey="label"
              type="category"
              tickLine={false}
              axisLine={false}
              width={60}
            />
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
            <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={60}>
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

  // Vertical mode: bars grow upward
  return (
    <div ref={containerRef} className="h-full w-full">
      <ChartContainer config={chartConfig} className="h-full w-full">
        <RechartsBarChart
          data={data}
          layout="horizontal"
          margin={{ top: 10, right: 10, bottom: 30, left: 10 }}
          barCategoryGap="15%"
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            height={40}
          />
          <YAxis
            type="number"
            tickLine={false}
            axisLine={false}
            width={50}
          />
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
            radius={[6, 6, 0, 0]}
            maxBarSize={80}
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