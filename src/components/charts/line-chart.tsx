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
  isFullscreen?: boolean
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
    <div className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-md p-3 shadow-xl animate-in fade-in zoom-in-95 duration-200 min-w-[140px]">
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">{displayLabel}</span>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: displayColor }} />
          <span className="font-bold text-sm text-foreground">{Number(displayValue).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export const LineChart = React.memo(function LineChart({ 
  data, 
  containerRef, 
  showGradientArea = false,
  lineColor: customLineColor,
  isFullscreen = false
}: LineChartProps) {
  
  const chartConfig = React.useMemo(() => {
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
  }, [data])

  const seriesId = data[0]?.id || "value"
  const lineColor = customLineColor || data[0]?.color || "#3b82f6"
  const gradientId = React.useMemo(() => `gradient-${seriesId}`, [seriesId])
  const isAnimationActive = data.length <= 25

  const maxDataValue = React.useMemo(() => {
    let max = 0;
    for (let i = 0; i < data.length; i++) {
      const v = Number(data[i].value) || 0;
      if (v > max) max = v;
    }
    return max;
  }, [data]);

  const { numericTicks, numericAxisMax } = React.useMemo(() => {
    if (maxDataValue <= 0) {
      return { numericTicks: [0, 2, 4, 6, 8, 10], numericAxisMax: 10 };
    }

    const targetIntervals = 5;
    const targetMax = maxDataValue * 1.08;
    const rawStep = targetMax / targetIntervals;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / magnitude;

    let stepMultiplier = 10;
    const standardSteps = [1, 2, 2.5, 5, 10];
    for (let i = 0; i < standardSteps.length; i++) {
      if (normalized <= standardSteps[i]) {
        stepMultiplier = standardSteps[i];
        break;
      }
    }

    const step = stepMultiplier * magnitude;
    const ticks: number[] = [];
    let current = 0;
    while (current < maxDataValue || (current - maxDataValue) / Math.max(1, current) < 0.05) {
      ticks.push(current);
      current = Math.round((current + step) * 1e6) / 1e6;
    }
    ticks.push(current);
    return { numericTicks: ticks, numericAxisMax: ticks[ticks.length - 1] };
  }, [maxDataValue]);

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
              margin={{ top: 30, right: 30, bottom: 20, left: 20 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColor} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={lineColor} stopOpacity={0.05} />
                </linearGradient>
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
                style={{ fontSize: isFullscreen ? '16px' : (data.length > 15 ? '12px' : '14px') }}
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
                content={<LineChartTooltip lineColor={lineColor} />}
              />
              {showGradientArea && (
                <Area
                  type="linear"
                  dataKey="value"
                  fill={`url(#${gradientId})`}
                  stroke="none"
                  isAnimationActive={isAnimationActive}
                />
              )}
              <Line
                type="linear"
                dataKey="value"
                stroke={lineColor}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2, fill: lineColor }}
                activeDot={{ r: 6, fill: lineColor }}
                isAnimationActive={isAnimationActive}
              >
                <LabelList
                  dataKey="value"
                  position="top"
                  offset={isFullscreen ? 12 : 8}
                  className="fill-foreground font-semibold chart-global-label"
                  fontSize={isFullscreen ? 19 : 15}
                  fontWeight={600}
                  formatter={(value: any) => (Number(value) || 0).toLocaleString()}
                />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  if (
    prevProps.showGradientArea !== nextProps.showGradientArea ||
    prevProps.lineColor !== nextProps.lineColor ||
    prevProps.isFullscreen !== nextProps.isFullscreen
  ) {
    return false
  }
  if (prevProps.data === nextProps.data) return true
  if (prevProps.data.length !== nextProps.data.length) return false
  for (let i = 0; i < prevProps.data.length; i++) {
    const p = prevProps.data[i]
    const n = nextProps.data[i]
    if (p.id !== n.id || p.value !== n.value || p.label !== n.label || p.color !== n.color) {
      return false
    }
  }
  return true
})