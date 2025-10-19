import * as React from "react"
import {
  Pie,
  PieChart as RechartsPieChart,
} from "recharts"
import type { Datum } from "@/types"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"

export interface PieChartProps {
  data: Datum[]
  total: number
  containerRef?: React.RefObject<HTMLDivElement>
}

export function PieChart({ data, total, containerRef }: PieChartProps) {
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
      <ChartContainer config={chartConfig}>
        <RechartsPieChart>
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
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            cornerRadius={6}
            strokeWidth={5}
            label={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                return (
                  <>
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-foreground text-2xl font-bold"
                    >
                      {total.toLocaleString()}
                    </text>
                    <text
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 24}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-muted-foreground text-sm"
                    >
                      Total
                    </text>
                  </>
                )
              }
              return null
            }}
          />
          <ChartLegend
            content={({ payload }) => (
              <ChartLegendContent payload={payload} />
            )}
            verticalAlign="bottom"
          />
        </RechartsPieChart>
      </ChartContainer>
    </div>
  )
}