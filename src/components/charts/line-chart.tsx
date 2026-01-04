import * as React from "react"
import {
  Line,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  LabelList,
  Area,
  ResponsiveContainer
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

export const LineChart = React.memo(function LineChart({ 
  data, 
  containerRef, 
  showLabels = false, 
  showGradientArea = false 
}: LineChartProps) {
  
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

  const seriesId = data[0]?.id || "value"
  const lineColor = data[0]?.color || "#3b82f6"
  const gradientId = React.useMemo(() => `gradient-${seriesId}`, [seriesId])

  return (
    /* FIX: We force a specific height on mobile (h-[300px]) and h-full for desktop.
       We also use 'min-h-0' and 'overflow-hidden' to break the flexbox resize loop.
    */
    <div 
      ref={containerRef} 
      className="w-full h-[300px] md:h-full relative min-h-0 overflow-hidden"
    >
      <div className="absolute inset-0">
        <ChartContainer 
          config={chartConfig} 
          className="h-full w-full aspect-none" // Force removal of any aspect-ratio classes
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 12, right: 12, bottom: 8, left: 12 }}
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
                tickFormatter={(value) => String(value).slice(0, 3)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={35}
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
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.showLabels === nextProps.showLabels &&
    prevProps.showGradientArea === nextProps.showGradientArea &&
    prevProps.data === nextProps.data
  )
})