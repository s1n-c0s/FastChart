import * as React from "react"
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import type { Datum } from "@/types"

export interface StackedChartProps {
  data: Datum[]
  isHorizontal?: boolean
  containerRef?: React.RefObject<HTMLDivElement>
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
            isAnimationActive={false}
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
              />
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
          isAnimationActive={false}
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
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.isHorizontal === nextProps.isHorizontal &&
    prevProps.data.length === nextProps.data.length &&
    prevProps.data.every((item, idx) => 
      item.id === nextProps.data[idx]?.id &&
      item.value === nextProps.data[idx]?.value &&
      item.color === nextProps.data[idx]?.color
    )
  )
})