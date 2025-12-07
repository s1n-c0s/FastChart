import * as React from "react"
import {
  Line,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  LabelList,
  Area,
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
  showLabels?: boolean
  showGradientArea?: boolean
}

export const LineChart = React.memo(function LineChart({ data, containerRef, showLabels = false, showGradientArea = false }: LineChartProps) {
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
  const lineColor = data[0]?.color || "#3b82f6"
  const gradientId = React.useMemo(() => `gradient-${seriesId}`, [seriesId])

  return (
    <div ref={containerRef} className="h-full w-full">
      <ChartContainer config={chartConfig} className="h-full w-full">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 8, left: 12 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.5} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0.05} />
            </linearGradient>
          </defs>
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
          {showGradientArea && (
            <Area
              type="linear"
              dataKey="value"
              fill={`url(#${gradientId})`}
              stroke="none"
              isAnimationActive={false}
              connectNulls={false}
            />
          )}
          <Line
            type="linear"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          >
            {showLabels && (
              <LabelList
                dataKey="value"
                position="top"
                offset={8}
                className="fill-foreground"
                fontSize={12}
                formatter={(value: number) => value.toLocaleString()}
              />
            )}
          </Line>
        </ComposedChart>
      </ChartContainer>
    </div>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.showLabels === nextProps.showLabels &&
    prevProps.showGradientArea === nextProps.showGradientArea &&
    prevProps.data.length === nextProps.data.length &&
    prevProps.data.every((item, idx) => 
      item.id === nextProps.data[idx]?.id &&
      item.value === nextProps.data[idx]?.value
    )
  )
})
