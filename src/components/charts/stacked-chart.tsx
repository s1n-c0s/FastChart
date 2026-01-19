import * as React from "react"
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  RadialBar,
  RadialBarChart,
  PolarRadiusAxis,
  Label as RechartsLabel,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { Datum } from "@/types"

export interface StackedChartProps {
  data: Datum[]
  isHorizontal?: boolean
  containerRef?: React.RefObject<HTMLDivElement>
  showLabels?: boolean
  showRadial?: boolean
  isFullscreen?: boolean
}

interface StackedTooltipProps {
  active?: boolean
  payload?: Array<{ 
    name?: string
    value: number
    fill?: string
  } & Record<string, unknown>>
}

const StackedTooltip = React.memo(function StackedTooltip({ active, payload }: StackedTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="bg-background border border-border rounded-lg p-2 text-xs shadow-xl">
      <div className="font-medium mb-1">Details</div>
      <div className="flex flex-col gap-0.5">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.fill }}
              />
              <span>{entry.name}</span>
            </div>
            <span className="font-mono">{Math.round(entry.value * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
});

StackedTooltip.displayName = "StackedTooltip";

export const StackedChart = React.memo(function StackedChart({
  data,
  isHorizontal = true,
  containerRef,
  showLabels = false,
  showRadial = false,
  isFullscreen = false,
}: StackedChartProps) {
  // Transform data for stacked chart
  const stackedData = React.useMemo(() => {
    const total = data.reduce((sum, d) => sum + Math.max(0, d.value || 0), 0)
    return [
      {
        name: "All",
        ...data.reduce((acc, d) => ({
          ...acc,
          [d.label]: Math.max(0, d.value || 0) / (total || 1)
        }), {})
      }
    ]
  }, [data])

  // Transform data for radial chart
  const radialData = React.useMemo(() => {
    const total = data.reduce((sum, d) => sum + Math.max(0, d.value || 0), 0)
    return [
      data.reduce((acc, d) => ({
        ...acc,
        [d.label]: Math.max(0, d.value || 0) / (total || 1)
      }), {})
    ]
  }, [data])

  // Build chart config for radial
  const chartConfig = React.useMemo(() => {
    return data.reduce((acc, d) => ({
      ...acc,
      [d.label]: {
        label: d.label,
        color: d.color,
      }
    }), {}) as ChartConfig
  }, [data])

  // Calculate total for radial chart
  const totalValue = React.useMemo(() => {
    return data.reduce((sum, d) => sum + Math.max(0, d.value || 0), 0)
  }, [data])

  // Render radial chart
  if (showRadial) {
    const innerRadius = isFullscreen ? 300 : 150
    const outerRadius = isFullscreen ? 600 : 350
    
    return (
      <div ref={containerRef} className="h-full w-full flex items-center justify-center overflow-hidden">
        <div className="flex items-center justify-center w-full h-full max-w-full max-h-full">
          <ChartContainer config={chartConfig} className="w-full h-full">
            <RadialBarChart
              data={radialData}
              endAngle={180}
              innerRadius={innerRadius}
              outerRadius={outerRadius}
            >
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <RechartsLabel
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    const textSize = isFullscreen ? 80 : 32
                    const labelSize = isFullscreen ? 24 : 16
                    const offsetY = isFullscreen ? -24 : -16
                    
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + offsetY}
                          style={{ fontSize: `${textSize}px`, fontWeight: 'bold', fill: 'currentColor' }}
                        >
                          {totalValue.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 8}
                          style={{ fontSize: `${labelSize}px`, fill: 'var(--muted-foreground)' }}
                        >
                          Total
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </PolarRadiusAxis>
            {data.map((d) => (
              <RadialBar
                key={d.id}
                dataKey={d.label}
                stackId="a"
                cornerRadius={5}
                fill={d.color}
                className="stroke-transparent stroke-2"
              />
            ))}
          </RadialBarChart>
          </ChartContainer>
        </div>
      </div>
    )
  }

  // Horizontal mode: bars grow to the right
  if (isHorizontal) {
    return (
      <div ref={containerRef} className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart
            data={stackedData}
            stackOffset="expand"
            layout="vertical"
            margin={{ top: 5, right: 15, bottom: 5, left: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <YAxis
              type="category"
              dataKey="name"
              tickLine={false}
              axisLine={false}
              width={50}
              style={{ fontSize: '12px' }}
            />
            <XAxis
              type="number"
              domain={[0, 1]}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              tickLine={false}
              axisLine={false}
              style={{ fontSize: '12px' }}
            />
            <Tooltip content={<StackedTooltip />} />
            {data.map((d) => (
              <Bar 
                key={d.id} 
                dataKey={d.label} 
                stackId="stacked" 
                fill={d.color} 
                name={d.label}
                isAnimationActive={false}
              >
                {showLabels && (
                  <LabelList
                    dataKey={d.label}
                    position="right"
                    offset={8}
                    className="fill-foreground"
                    fontSize={12}
                    formatter={(value: number) => `${(value * 100).toFixed(0)}%`}
                  />
                )}
              </Bar>
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // Vertical mode: bars grow upward
  return (
    <div ref={containerRef} className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={stackedData}
          stackOffset="expand"
          layout="horizontal"
          margin={{ top: 5, right: 15, bottom: 5, left: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            height={40}
            style={{ fontSize: '12px' }}
          />
          <YAxis
            type="number"
            domain={[0, 1]}
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            tickLine={false}
            axisLine={false}
            width={50}
            style={{ fontSize: '12px' }}
          />
          <Tooltip content={<StackedTooltip />} />
          {data.map((d) => (
            <Bar 
              key={d.id} 
              dataKey={d.label} 
              stackId="stacked" 
              fill={d.color} 
              name={d.label}
              isAnimationActive={false}
            >
              {showLabels && (
                <LabelList
                  dataKey={d.label}
                  position="top"
                  offset={8}
                  className="fill-foreground"
                  fontSize={12}
                  formatter={(value: number) => `${(value * 100).toFixed(0)}%`}
                />
              )}
            </Bar>
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.isHorizontal === nextProps.isHorizontal &&
    prevProps.showLabels === nextProps.showLabels &&
    prevProps.showRadial === nextProps.showRadial &&
    prevProps.isFullscreen === nextProps.isFullscreen &&
    prevProps.data.length === nextProps.data.length &&
    prevProps.data.every((item, idx) => 
      item.id === nextProps.data[idx]?.id &&
      item.value === nextProps.data[idx]?.value &&
      item.color === nextProps.data[idx]?.color
    )
  )
})