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
  Tooltip,
} from "recharts"
import type { Datum } from "@/types"
import { ChartContainer } from "@/components/ui/chart"
import { PRESET_COLORS } from "@/config/constants"

export interface LineChartProps {
  data: Datum[]
  data2?: Datum[] | null
  table1Name?: string
  table2Name?: string
  containerRef?: React.Ref<HTMLDivElement>
  showLabels?: boolean
  showGradientArea?: boolean
  lineColor?: string
  lineColor2?: string
  isFullscreen?: boolean
}

interface LineChartTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
  lineColor?: string
  lineColor2?: string
  isComparison?: boolean
  table1Name?: string
  table2Name?: string
}

const LineChartTooltip = ({
  active,
  payload,
  label,
  lineColor,
  lineColor2,
  isComparison,
  table1Name = "Table 1",
  table2Name = "Table 2",
}: LineChartTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null

  if (isComparison) {
    const row = payload[0]?.payload || {}
    const displayLabel = row.label || label || "Item"
    const val1 = row.value1 !== undefined ? row.value1 : (payload[0]?.value || 0)
    const val2 = row.value2 !== undefined ? row.value2 : (payload[1]?.value || 0)
    const diff = Number(val2) - Number(val1)
    const pctChange = Number(val1) !== 0 ? Math.round((diff / Number(val1)) * 100) : 0

    return (
      <div className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-md p-3 shadow-xl animate-in fade-in zoom-in-95 duration-200 min-w-[160px]">
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">{displayLabel}</span>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: lineColor || "#3b82f6" }} />
              <span className="text-xs text-muted-foreground">{table1Name}</span>
            </div>
            <span className="font-bold text-sm text-foreground">{Number(val1).toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: lineColor2 || "#f59e0b" }} />
              <span className="text-xs text-muted-foreground">{table2Name}</span>
            </div>
            <span className="font-bold text-sm text-foreground">{Number(val2).toLocaleString()}</span>
          </div>
          <div className="pt-1.5 border-t border-border/50 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Diff:</span>
            <span className={`font-semibold ${diff > 0 ? "text-emerald-500" : diff < 0 ? "text-red-500" : "text-muted-foreground"}`}>
              {diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()} ({pctChange > 0 ? `+${pctChange}%` : `${pctChange}%`})
            </span>
          </div>
        </div>
      </div>
    )
  }

  const item = payload[0]
  if (!item) return null

  const d = item.payload || {}
  const displayLabel = d.label || label || 'Item'
  const displayColor = lineColor || d.color || item.color || item.stroke || '#8884d8'
  const displayValue = d.value !== undefined ? d.value : (item.value || 0)

  return (
    <div className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-md p-3 shadow-xl animate-in fade-in zoom-in-95 duration-200 min-w-[140px]">
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">{displayLabel}</span>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: displayColor }} />
          <span className="font-bold text-sm text-foreground">{Number(displayValue).toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

export const LineChart = React.memo(function LineChart({
  data,
  data2,
  table1Name = "Table 1",
  table2Name = "Table 2",
  containerRef,
  showLabels = true,
  showGradientArea = false,
  lineColor: customLineColor,
  lineColor2: customLineColor2,
  isFullscreen = false,
}: LineChartProps) {
  const isComparison = Boolean(data2 && data2.length > 0)

  const lineColor = customLineColor || data[0]?.color || PRESET_COLORS[0]
  const lineColor2 = customLineColor2 || data2?.[0]?.color || PRESET_COLORS[3]

  const comparisonData = React.useMemo(() => {
    if (!isComparison || !data2) return null
    const labelSet = new Set<string>()
    const labels: string[] = []
    data.forEach((d) => {
      if (!labelSet.has(d.label)) {
        labelSet.add(d.label)
        labels.push(d.label)
      }
    })
    data2.forEach((d) => {
      if (!labelSet.has(d.label)) {
        labelSet.add(d.label)
        labels.push(d.label)
      }
    })

    return labels.map((label, idx) => {
      const item1 = data.find((d) => d.label === label)
      const item2 = data2.find((d) => d.label === label)
      const value1 = item1 ? Number(item1.value) || 0 : 0
      const value2 = item2 ? Number(item2.value) || 0 : 0
      return {
        id: `line-${idx}-${label}`,
        label,
        value: value1,
        color: lineColor,
        value1,
        value2,
      }
    })
  }, [data, data2, isComparison])

  const chartConfig = React.useMemo(() => {
    if (isComparison) {
      return {
        value1: { label: table1Name, color: lineColor },
        value2: { label: table2Name, color: lineColor2 },
      }
    }
    const config: Record<string, { label: string; color: string }> = {}
    for (let i = 0; i < data.length; i++) {
      const item = data[i]
      if (!config[item.id]) {
        config[item.id] = {
          label: item.id.charAt(0).toUpperCase() + item.id.slice(1),
          color: item.color,
        }
      }
    }
    return config
  }, [data, isComparison, lineColor, lineColor2, table1Name, table2Name])

  const gradientId1 = React.useMemo(() => `gradient-line-1-${lineColor.replace(/[^a-zA-Z0-9]/g, "")}`, [lineColor])
  const gradientId2 = React.useMemo(() => `gradient-line-2-${lineColor2.replace(/[^a-zA-Z0-9]/g, "")}`, [lineColor2])

  const activeDataset = isComparison && comparisonData ? comparisonData : data
  const isAnimationActive = activeDataset.length <= 25

  const maxDataValue = React.useMemo(() => {
    let max = 0
    for (let i = 0; i < data.length; i++) {
      const v = Number(data[i].value) || 0
      if (v > max) max = v
    }
    if (data2) {
      for (let i = 0; i < data2.length; i++) {
        const v = Number(data2[i].value) || 0
        if (v > max) max = v
      }
    }
    return max
  }, [data, data2])

  const { numericTicks, numericAxisMax } = React.useMemo(() => {
    if (maxDataValue <= 0) {
      return { numericTicks: [0, 2, 4, 6, 8, 10], numericAxisMax: 10 }
    }

    const targetIntervals = 5
    const targetMax = maxDataValue * 1.08
    const rawStep = targetMax / targetIntervals
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
    const normalized = rawStep / magnitude

    let stepMultiplier = 10
    const standardSteps = [1, 2, 2.5, 5, 10]
    for (let i = 0; i < standardSteps.length; i++) {
      if (normalized <= standardSteps[i]) {
        stepMultiplier = standardSteps[i]
        break
      }
    }

    const step = stepMultiplier * magnitude
    const ticks: number[] = []
    let current = 0
    while (current < maxDataValue || (current - maxDataValue) / Math.max(1, current) < 0.05) {
      ticks.push(current)
      current = Math.round((current + step) * 1e6) / 1e6
    }
    ticks.push(current)
    return { numericTicks: ticks, numericAxisMax: ticks[ticks.length - 1] }
  }, [maxDataValue])

  const renderComparisonLegend = () => {
    if (!isComparison) return null
    return (
      <div className="flex items-center justify-center gap-5 py-1 text-xs select-none">
        <div className="flex items-center gap-1.5">
          <span
            className="w-4 h-0.5 rounded-full shadow-xs"
            style={{ backgroundColor: lineColor }}
          />
          <span className="font-medium text-foreground">{table1Name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-4 h-0.5 rounded-full border-t border-dashed shadow-xs"
            style={{ borderColor: lineColor2, borderTopWidth: 2 }}
          />
          <span className="font-medium text-foreground">{table2Name}</span>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-[300px] md:h-full relative min-h-0 overflow-hidden flex flex-col"
    >
      {renderComparisonLegend()}
      <div className="flex-1 min-h-0 w-full relative">
        <div className="absolute inset-0">
          <ChartContainer
            config={chartConfig}
            className="h-full w-full aspect-none"
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={activeDataset}
                margin={{ top: 30, right: 30, bottom: 20, left: 20 }}
              >
                <defs>
                  <linearGradient id={gradientId1} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={lineColor} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={lineColor} stopOpacity={0.03} />
                  </linearGradient>
                  {isComparison && (
                    <linearGradient id={gradientId2} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={lineColor2} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={lineColor2} stopOpacity={0.02} />
                    </linearGradient>
                  )}
                </defs>
                <CartesianGrid
                  className="stroke-border/40"
                  strokeWidth={1}
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  interval={0}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  style={{ fontSize: isFullscreen ? '16px' : (activeDataset.length > 15 ? '12px' : '14px') }}
                />
                <YAxis
                  type="number"
                  ticks={numericTicks}
                  domain={[0, numericAxisMax]}
                  tickLine={false}
                  axisLine={false}
                  width={Math.max(isFullscreen ? 60 : 50, String(numericAxisMax).length * (isFullscreen ? 10 : 8.5) + 8)}
                  tickFormatter={(v) => Number(v).toLocaleString()}
                  style={{ fontSize: isFullscreen ? '15px' : '13px' }}
                />
                <Tooltip
                  isAnimationActive={false}
                  cursor={{ stroke: lineColor, strokeWidth: 1, strokeDasharray: "4 4", opacity: 0.5 }}
                  content={
                    <LineChartTooltip
                      lineColor={lineColor}
                      lineColor2={lineColor2}
                      isComparison={isComparison}
                      table1Name={table1Name}
                      table2Name={table2Name}
                    />
                  }
                />
                {showGradientArea && (
                  <>
                    <Area
                      type="linear"
                      dataKey={isComparison ? "value1" : "value"}
                      fill={`url(#${gradientId1})`}
                      stroke="none"
                      isAnimationActive={isAnimationActive}
                    />
                    {isComparison && (
                      <Area
                        type="linear"
                        dataKey="value2"
                        fill={`url(#${gradientId2})`}
                        stroke="none"
                        isAnimationActive={isAnimationActive}
                      />
                    )}
                  </>
                )}
                {isComparison ? (
                  <>
                    <Line
                      type="linear"
                      dataKey="value1"
                      name={table1Name}
                      stroke={lineColor}
                      strokeWidth={2.5}
                      dot={{ r: 4, strokeWidth: 2, fill: lineColor }}
                      activeDot={{ r: 6, fill: lineColor }}
                      isAnimationActive={isAnimationActive}
                    >
                      {showLabels && (
                        <LabelList
                          dataKey="value1"
                          position="top"
                          offset={isFullscreen ? 12 : 8}
                          className="fill-foreground font-semibold chart-global-label"
                          fontSize={isFullscreen ? 16 : 13}
                          fontWeight={600}
                          formatter={(value: any) => (Number(value) || 0).toLocaleString()}
                        />
                      )}
                    </Line>
                    <Line
                      type="linear"
                      dataKey="value2"
                      name={table2Name}
                      stroke={lineColor2}
                      strokeWidth={2.5}
                      strokeDasharray="5 5"
                      dot={{ r: 4, strokeWidth: 2, fill: lineColor2 }}
                      activeDot={{ r: 6, fill: lineColor2 }}
                      isAnimationActive={isAnimationActive}
                    >
                      {showLabels && (
                        <LabelList
                          dataKey="value2"
                          position="top"
                          offset={isFullscreen ? 12 : 8}
                          className="fill-foreground font-semibold chart-global-label"
                          fontSize={isFullscreen ? 16 : 13}
                          fontWeight={600}
                          formatter={(value: any) => (Number(value) || 0).toLocaleString()}
                        />
                      )}
                    </Line>
                  </>
                ) : (
                  <Line
                    type="linear"
                    dataKey="value"
                    stroke={lineColor}
                    strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2, fill: lineColor }}
                    activeDot={{ r: 6, fill: lineColor }}
                    isAnimationActive={isAnimationActive}
                  >
                    {showLabels && (
                      <LabelList
                        dataKey="value"
                        position="top"
                        offset={isFullscreen ? 12 : 8}
                        className="fill-foreground font-semibold chart-global-label"
                        fontSize={isFullscreen ? 19 : 15}
                        fontWeight={600}
                        formatter={(value: any) => (Number(value) || 0).toLocaleString()}
                      />
                    )}
                  </Line>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  if (
    prevProps.showGradientArea !== nextProps.showGradientArea ||
    prevProps.showLabels !== nextProps.showLabels ||
    prevProps.lineColor !== nextProps.lineColor ||
    prevProps.lineColor2 !== nextProps.lineColor2 ||
    prevProps.table1Name !== nextProps.table1Name ||
    prevProps.table2Name !== nextProps.table2Name ||
    prevProps.isFullscreen !== nextProps.isFullscreen ||
    (prevProps.data2?.length ?? 0) !== (nextProps.data2?.length ?? 0)
  ) {
    return false
  }
  if (prevProps.data.length !== nextProps.data.length) return false
  for (let i = 0; i < prevProps.data.length; i++) {
    const p = prevProps.data[i]
    const n = nextProps.data[i]
    if (p.id !== n.id || p.value !== n.value || p.label !== n.label || p.color !== n.color) {
      return false
    }
  }
  if (prevProps.data2 && nextProps.data2) {
    for (let i = 0; i < prevProps.data2.length; i++) {
      const p = prevProps.data2[i]
      const n = nextProps.data2[i]
      if (p.id !== n.id || p.value !== n.value || p.label !== n.label || p.color !== n.color) {
        return false
      }
    }
  }
  return true
})
