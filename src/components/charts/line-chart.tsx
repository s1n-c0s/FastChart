"use client"

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
  // Derive series config from unique IDs (supports multi-series, but we use one)
  const chartConfig = React.useMemo(() => {
    const uniqueIds = Array.from(new Set(data.map(d => d.id)))
    return uniqueIds.reduce((acc, id) => {
      const firstItem = data.find(d => d.id === id)!
      acc[id] = {
        label: firstItem.id.charAt(0).toUpperCase() + firstItem.id.slice(1),
        color: firstItem.color,
      }
      return acc
    }, {} as Record<string, { label: string; color: string }>)
  }, [data])

  // Assume all data belongs to one series (e.g., "desktop")
  const seriesId = data[0]?.id || "value"

  return (
    <div ref={containerRef} className="h-full w-full">
      <ChartContainer config={chartConfig} className="h-full w-full">
        <RechartsLineChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 8, left: 12 }}
          accessibilityLayer
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => value.slice(0, 3)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Line
            type="linear"
            dataKey="value"
            stroke={`var(--color-${seriesId})`}
            strokeWidth={2}
            dot={false}
          />
        </RechartsLineChart>
      </ChartContainer>
    </div>
  )
}