import * as React from "react"
import {
  Line,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  LabelList,
  Area,
  ResponsiveContainer,
  Tooltip
} from "recharts"
import type { Datum } from "@/types"
import {
  ChartContainer,
} from "@/components/ui/chart"

export interface LineChartProps {
  data: Datum[]
  containerRef?: React.Ref<HTMLDivElement>
  showLabels?: boolean
  showGradientArea?: boolean
  lineColor?: string
}

interface LineChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  lineColor?: string;
}

const LineChartTooltip = ({ active, payload, label, lineColor }: LineChartTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  const item = payload[0];
  if (!item) return null;
  
  const data = item.payload || {};
  const displayLabel = data.label || label || 'Item';
  const displayColor = lineColor || data.color || item.color || item.stroke || '#8884d8';
  const displayValue = data.value !== undefined ? data.value : (item.value || 0);

  return (
    <div className="bg-background border border-border rounded-lg p-3 text-sm shadow-xl flex flex-col gap-1 min-w-[140px]">
      <div className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">{displayLabel}</div>
      <div className="flex items-center justify-between gap-4 mt-1.5">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: displayColor }}
          />
          <span className="font-medium">Value</span>
        </div>
        <span className="font-mono font-bold text-base">{Number(displayValue).toLocaleString()}</span>
      </div>
    </div>
  );
};

export const LineChart = React.memo(function LineChart({ 
  data, 
  containerRef, 
  showLabels = false, 
  showGradientArea = false,
  lineColor: customLineColor
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
  const lineColor = customLineColor || data[0]?.color || "#3b82f6"
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
                tickMargin={10}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={35}
              />
              <Tooltip
                cursor={{ stroke: lineColor, strokeWidth: 1, strokeDasharray: "4 4", opacity: 0.5 }}
                content={<LineChartTooltip lineColor={lineColor} />}
              />
              {showGradientArea && (
                <Area
                  type="linear"
                  dataKey="value"
                  fill={`url(#${gradientId})`}
                  stroke="none"
                  isAnimationActive={true}
                />
              )}
              <Line
                type="linear"
                dataKey="value"
                stroke={lineColor}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2, fill: lineColor }}
                activeDot={{ r: 6, fill: lineColor }}
                isAnimationActive={true}
              >
                {showLabels && (
                  <LabelList
                    dataKey="value"
                    position="top"
                    offset={8}
                    className="fill-foreground"
                    fontSize={12}
                    formatter={(value: number) => (value || 0).toLocaleString()}
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
    prevProps.lineColor === nextProps.lineColor &&
    prevProps.data === nextProps.data
  )
})