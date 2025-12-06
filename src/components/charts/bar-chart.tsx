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

export const BarChart = React.memo(function BarChart({
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

  // Calculate dynamic margins based on label lengths
  const maxLabelLength = React.useMemo(() => {
    return Math.max(...data.map(d => d.label.length))
  }, [data])

  // Horizontal mode: bars grow to the right
  if (isHorizontal) {
    const yAxisWidth = Math.min(Math.max(maxLabelLength * 6, 40), 100)
    
    return (
      <div ref={containerRef} className="h-full w-full">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <RechartsBarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 15, bottom: 5, left: 5 }}
            barCategoryGap="15%"
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="number" 
              tickLine={false} 
              axisLine={false}
              style={{ fontSize: '12px' }}
            />
            <YAxis
              dataKey="label"
              type="category"
              tickLine={false}
              axisLine={false}
              width={yAxisWidth}
              style={{ fontSize: '12px' }}
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
            <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={50}>
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
  const xAxisHeight = Math.min(Math.max(maxLabelLength * 4, 30), 60)
  
  return (
    <div ref={containerRef} className="h-full w-full">
      <ChartContainer config={chartConfig} className="h-full w-full">
        <RechartsBarChart
          data={data}
          layout="horizontal"
          margin={{ top: 5, right: 15, bottom: 5, left: 5 }}
          barCategoryGap="15%"
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            height={xAxisHeight}
            style={{ fontSize: '12px' }}
          />
          <YAxis
            type="number"
            tickLine={false}
            axisLine={false}
            width={45}
            style={{ fontSize: '12px' }}
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