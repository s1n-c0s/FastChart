import * as React from "react"
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
  LabelList,
} from "recharts"
import type { Datum } from "@/types"
import {
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart"
import { PRESET_COLORS } from "@/config/constants"

export interface BarChartProps {
  data: Datum[]
  data2?: Datum[] | null
  table1Name?: string
  table2Name?: string
  isHorizontal?: boolean
  containerRef?: React.Ref<HTMLDivElement>
  children?: React.ReactNode
  showLabels?: boolean
  isFullscreen?: boolean
}

export const BarChart = React.memo(function BarChart({
  data,
  data2,
  table1Name = "Table 1",
  table2Name = "Table 2",
  isHorizontal = true,
  containerRef,
  children,
  showLabels = true,
  isFullscreen = false,
}: BarChartProps) {
  const isComparison = Boolean(data2 && data2.length > 0)

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
      const color1 = item1?.color || PRESET_COLORS[idx % PRESET_COLORS.length]
      const color2 = item2?.color || PRESET_COLORS[(idx + 3) % PRESET_COLORS.length]
      const diff = value2 - value1
      const pctChange = value1 !== 0 ? Math.round((diff / value1) * 100) : 0

      return {
        id: `compare-${idx}-${label}`,
        label,
        value: value1,
        color: color1,
        value1,
        value2,
        color1,
        color2,
        diff,
        pctChange,
      }
    })
  }, [data, data2, isComparison])

  const chartConfig = React.useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {}
    if (isComparison) {
      config["value1"] = {
        label: table1Name,
        color: data[0]?.color || PRESET_COLORS[0],
      }
      config["value2"] = {
        label: table2Name,
        color: data2?.[0]?.color || PRESET_COLORS[3],
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        const item = data[i]
        config[item.id] = {
          label: item.label,
          color: item.color,
        }
      }
    }
    return config
  }, [data, data2, isComparison, table1Name, table2Name])

  // Calculate dynamic margins based on label lengths
  const maxLabelLength = React.useMemo(() => {
    let max = 0
    for (let i = 0; i < data.length; i++) {
      const len = data[i].label?.length || 0
      if (len > max) max = len
    }
    if (data2) {
      for (let i = 0; i < data2.length; i++) {
        const len = data2[i].label?.length || 0
        if (len > max) max = len
      }
    }
    return max
  }, [data, data2])

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

  const isAnimationActive = data.length <= 15

  const localRef = React.useRef<HTMLDivElement | null>(null)
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 })

  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      localRef.current = node
      if (containerRef) {
        if (typeof containerRef === "function") {
          containerRef(node)
        } else {
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node
        }
      }
    },
    [containerRef]
  )

  React.useEffect(() => {
    const node = localRef.current
    if (node) {
      setDimensions({ width: Math.round(node.clientWidth), height: Math.round(node.clientHeight) })
      const observer = new ResizeObserver((entries) => {
        if (entries[0]) {
          const w = Math.round(entries[0].contentRect.width)
          const h = Math.round(entries[0].contentRect.height)
          setDimensions((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }))
        }
      })
      observer.observe(node)
      return () => observer.disconnect()
    }
  }, [])

  // Header Comparison Legend Badge
  const renderComparisonLegend = () => {
    if (!isComparison) return null
    return (
      <div className="flex items-center justify-center gap-4 py-1 text-xs select-none">
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-xs shadow-xs"
            style={{ backgroundColor: data[0]?.color || PRESET_COLORS[0] }}
          />
          <span className="font-medium text-foreground">{table1Name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-xs shadow-xs"
            style={{ backgroundColor: data2?.[0]?.color || PRESET_COLORS[3] }}
          />
          <span className="font-medium text-foreground">{table2Name}</span>
        </div>
      </div>
    )
  }

  // Horizontal mode: bars grow to the right
  if (isHorizontal) {
    const yAxisWidth = Math.min(Math.max(maxLabelLength * 7.5, 45), 140)

    return (
      <div ref={setRefs} className="h-full w-full flex flex-col">
        {renderComparisonLegend()}
        <div className="flex-1 min-h-0 w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <RechartsBarChart
              key={`horizontal-chart-${isComparison ? "cmp" : "single"}`}
              data={isComparison && comparisonData ? comparisonData : data}
              layout="vertical"
              margin={{ top: 10, right: 60, bottom: 5, left: 5 }}
              barCategoryGap={isComparison ? "20%" : "15%"}
              barGap={isComparison ? 3 : 4}
            >
              <CartesianGrid
                className="stroke-border/40"
                strokeWidth={1}
                horizontal={false}
              />
              <XAxis
                type="number"
                ticks={numericTicks}
                domain={[0, numericAxisMax]}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => Number(v).toLocaleString()}
                style={{ fontSize: isFullscreen ? '16px' : '14px' }}
              />
              <YAxis
                dataKey="label"
                type="category"
                interval={0}
                tickLine={false}
                axisLine={false}
                width={yAxisWidth}
                style={{ fontSize: isFullscreen ? '16px' : (data.length > 20 ? '12px' : '14px') }}
              />
              <ChartTooltip
                cursor={{ fill: 'var(--muted)', opacity: 0.65 }}
                isAnimationActive={false}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const row = payload[0].payload
                    if (isComparison) {
                      return (
                        <div key={row.id || row.label} className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-md p-3 shadow-xl animate-in fade-in zoom-in-95 duration-200 min-w-[160px]">
                          <div className="flex flex-col gap-2">
                            <span className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">{row.label}</span>
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: row.color1 }} />
                                <span className="text-xs text-muted-foreground">{table1Name}</span>
                              </div>
                              <span className="font-bold text-sm text-foreground">{Number(row.value1).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: row.color2 }} />
                                <span className="text-xs text-muted-foreground">{table2Name}</span>
                              </div>
                              <span className="font-bold text-sm text-foreground">{Number(row.value2).toLocaleString()}</span>
                            </div>
                            <div className="pt-1.5 border-t border-border/50 flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground">Diff:</span>
                              <span className={`font-semibold ${row.diff > 0 ? "text-emerald-500" : row.diff < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                                {row.diff > 0 ? `+${row.diff.toLocaleString()}` : row.diff.toLocaleString()} ({row.pctChange > 0 ? `+${row.pctChange}%` : `${row.pctChange}%`})
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return (
                      <div key={row.id || row.label} className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-md p-3 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">{row.label}</span>
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: row.color }} />
                            <span className="font-bold text-sm text-foreground">{Number(row.value).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              {isComparison && comparisonData ? (
                <>
                  <Bar dataKey="value1" name={table1Name} radius={[0, 4, 4, 0]} maxBarSize={32} isAnimationActive={isAnimationActive}>
                    {comparisonData.map((item) => (
                      <Cell key={`b1-${item.id}`} fill={item.color1} />
                    ))}
                    {showLabels && (
                      <LabelList
                        dataKey="value1"
                        position="right"
                        offset={isFullscreen ? 10 : 6}
                        className="fill-foreground font-semibold chart-global-label"
                        fontSize={isFullscreen ? 15 : 12}
                        fontWeight={600}
                        formatter={(value: any) => (Number(value) || 0).toLocaleString()}
                      />
                    )}
                  </Bar>
                  <Bar dataKey="value2" name={table2Name} radius={[0, 4, 4, 0]} maxBarSize={32} isAnimationActive={isAnimationActive}>
                    {comparisonData.map((item) => (
                      <Cell key={`b2-${item.id}`} fill={item.color2} />
                    ))}
                    {showLabels && (
                      <LabelList
                        dataKey="value2"
                        position="right"
                        offset={isFullscreen ? 10 : 6}
                        className="fill-foreground font-semibold chart-global-label"
                        fontSize={isFullscreen ? 15 : 12}
                        fontWeight={600}
                        formatter={(value: any) => (Number(value) || 0).toLocaleString()}
                      />
                    )}
                  </Bar>
                </>
              ) : (
                <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={50} isAnimationActive={isAnimationActive}>
                  {data.map((item) => (
                    <Cell key={item.id} fill={item.color} />
                  ))}
                  {showLabels && (
                    <LabelList
                      dataKey="value"
                      position="right"
                      offset={isFullscreen ? 12 : 8}
                      className="fill-foreground font-semibold chart-global-label"
                      fontSize={isFullscreen ? 18 : 15}
                      fontWeight={600}
                      formatter={(value: any) => (Number(value) || 0).toLocaleString()}
                    />
                  )}
                </Bar>
              )}
              {children}
            </RechartsBarChart>
          </ChartContainer>
        </div>
      </div>
    )
  }

  // Vertical mode: bars grow upward
  const activeDataset = isComparison && comparisonData ? comparisonData : data
  const chartWidth = dimensions.width || 800
  const availableWidthPerBar = activeDataset.length > 0 ? (chartWidth - 60) / activeDataset.length : 80
  const approxLabelWidth = maxLabelLength * 7

  const shouldAngle = availableWidthPerBar < approxLabelWidth && activeDataset.length > 6

  const tickFontSize = shouldAngle
    ? (availableWidthPerBar < 30 ? (isFullscreen ? 13 : 11) : (isFullscreen ? 15 : 12))
    : (isFullscreen ? 16 : (activeDataset.length > 15 ? 12 : 14))

  const xAxisHeight = shouldAngle
    ? Math.min(Math.max(maxLabelLength * 5.5, 45), 90)
    : Math.min(Math.max(maxLabelLength * 3.5, 30), 55)

  return (
    <div ref={setRefs} className="h-full w-full flex flex-col">
      {renderComparisonLegend()}
      <div className="flex-1 min-h-0 w-full">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <RechartsBarChart
            key={`vertical-chart-${isComparison ? "cmp" : "single"}`}
            data={activeDataset}
            layout="horizontal"
            margin={{ top: 25, right: 15, bottom: shouldAngle ? 10 : 5, left: 5 }}
            barCategoryGap={isComparison ? "20%" : "15%"}
            barGap={isComparison ? 3 : 4}
          >
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
              height={xAxisHeight}
              angle={shouldAngle ? -35 : 0}
              textAnchor={shouldAngle ? "end" : "middle"}
              dx={shouldAngle ? -3 : 0}
              dy={shouldAngle ? 4 : 0}
              style={{ fontSize: `${tickFontSize}px` }}
            />
            <YAxis
              type="number"
              ticks={numericTicks}
              domain={[0, numericAxisMax]}
              tickLine={false}
              axisLine={false}
              width={Math.max(45, String(numericAxisMax).length * 8.5 + 8)}
              tickFormatter={(v) => Number(v).toLocaleString()}
              style={{ fontSize: isFullscreen ? '16px' : '14px' }}
            />
            <ChartTooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.65 }}
              isAnimationActive={false}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const row = payload[0].payload
                  if (isComparison) {
                    return (
                      <div key={row.id || row.label} className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-md p-3 shadow-xl animate-in fade-in zoom-in-95 duration-200 min-w-[160px]">
                        <div className="flex flex-col gap-2">
                          <span className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">{row.label}</span>
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: row.color1 }} />
                              <span className="text-xs text-muted-foreground">{table1Name}</span>
                            </div>
                            <span className="font-bold text-sm text-foreground">{Number(row.value1).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: row.color2 }} />
                              <span className="text-xs text-muted-foreground">{table2Name}</span>
                            </div>
                            <span className="font-bold text-sm text-foreground">{Number(row.value2).toLocaleString()}</span>
                          </div>
                          <div className="pt-1.5 border-t border-border/50 flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Diff:</span>
                            <span className={`font-semibold ${row.diff > 0 ? "text-emerald-500" : row.diff < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                              {row.diff > 0 ? `+${row.diff.toLocaleString()}` : row.diff.toLocaleString()} ({row.pctChange > 0 ? `+${row.pctChange}%` : `${row.pctChange}%`})
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return (
                    <div key={row.id || row.label} className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-md p-3 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">{row.label}</span>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: row.color }} />
                          <span className="font-bold text-sm text-foreground">{Number(row.value).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            {isComparison && comparisonData ? (
              <>
                <Bar
                  dataKey="value1"
                  name={table1Name}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  isAnimationActive={isAnimationActive}
                >
                  {comparisonData.map((item) => (
                    <Cell key={`b1-v-${item.id}`} fill={item.color1} />
                  ))}
                  {showLabels && (
                    <LabelList
                      dataKey="value1"
                      position="top"
                      offset={isFullscreen ? 10 : 6}
                      className="fill-foreground font-semibold chart-global-label"
                      fontSize={isFullscreen ? 15 : 12}
                      fontWeight={600}
                      formatter={(value: any) => (Number(value) || 0).toLocaleString()}
                    />
                  )}
                </Bar>
                <Bar
                  dataKey="value2"
                  name={table2Name}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  isAnimationActive={isAnimationActive}
                >
                  {comparisonData.map((item) => (
                    <Cell key={`b2-v-${item.id}`} fill={item.color2} />
                  ))}
                  {showLabels && (
                    <LabelList
                      dataKey="value2"
                      position="top"
                      offset={isFullscreen ? 10 : 6}
                      className="fill-foreground font-semibold chart-global-label"
                      fontSize={isFullscreen ? 15 : 12}
                      fontWeight={600}
                      formatter={(value: any) => (Number(value) || 0).toLocaleString()}
                    />
                  )}
                </Bar>
              </>
            ) : (
              <Bar
                dataKey="value"
                radius={[6, 6, 0, 0]}
                maxBarSize={80}
                isAnimationActive={isAnimationActive}
              >
                {data.map((item) => (
                  <Cell key={item.id} fill={item.color} />
                ))}
                {showLabels && (
                  <LabelList
                    dataKey="value"
                    position="top"
                    offset={isFullscreen ? 12 : 8}
                    className="fill-foreground font-semibold chart-global-label"
                    fontSize={isFullscreen ? 18 : 15}
                    fontWeight={600}
                    formatter={(value: any) => (Number(value) || 0).toLocaleString()}
                  />
                )}
              </Bar>
            )}
            {children}
          </RechartsBarChart>
        </ChartContainer>
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.isHorizontal === nextProps.isHorizontal &&
    prevProps.showLabels === nextProps.showLabels &&
    prevProps.isFullscreen === nextProps.isFullscreen &&
    prevProps.table1Name === nextProps.table1Name &&
    prevProps.table2Name === nextProps.table2Name &&
    (prevProps.data2?.length ?? 0) === (nextProps.data2?.length ?? 0) &&
    prevProps.data.length === nextProps.data.length &&
    prevProps.data.every((item, idx) =>
      item.id === nextProps.data[idx]?.id &&
      item.value === nextProps.data[idx]?.value &&
      item.label === nextProps.data[idx]?.label &&
      item.color === nextProps.data[idx]?.color
    ) &&
    (!prevProps.data2 || prevProps.data2.every((item, idx) =>
      item.id === nextProps.data2?.[idx]?.id &&
      item.value === nextProps.data2?.[idx]?.value &&
      item.label === nextProps.data2?.[idx]?.label &&
      item.color === nextProps.data2?.[idx]?.color
    ))
  )
})
