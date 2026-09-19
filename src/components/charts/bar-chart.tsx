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

export interface BarChartProps {
  data: Datum[]
  isHorizontal?: boolean
  containerRef?: React.Ref<HTMLDivElement>
  children?: React.ReactNode
  showLabels?: boolean
}

export const BarChart = React.memo(function BarChart({
  data,
  isHorizontal = true,
  containerRef,
  children,

}: BarChartProps) {
  const chartConfig = React.useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {}
    for (let i = 0; i < data.length; i++) {
      const item = data[i]
      config[item.id] = {
        label: item.label,
        color: item.color,
      }
    }
    return config
  }, [data])

  // Calculate dynamic margins based on label lengths
  const maxLabelLength = React.useMemo(() => {
    let max = 0
    for (let i = 0; i < data.length; i++) {
      const len = data[i].label?.length || 0
      if (len > max) max = len
    }
    return max
  }, [data])

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

  const isAnimationActive = data.length <= 15

  const localRef = React.useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      localRef.current = node;
      if (containerRef) {
        if (typeof containerRef === "function") {
          containerRef(node);
        } else {
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      }
    },
    [containerRef]
  );

  React.useEffect(() => {
    const node = localRef.current;
    if (node) {
      setDimensions({ width: Math.round(node.clientWidth), height: Math.round(node.clientHeight) });
      const observer = new ResizeObserver((entries) => {
        if (entries[0]) {
          const w = Math.round(entries[0].contentRect.width);
          const h = Math.round(entries[0].contentRect.height);
          setDimensions((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
        }
      });
      observer.observe(node);
      return () => observer.disconnect();
    }
  }, []);

  // Horizontal mode: bars grow to the right
  if (isHorizontal) {
    const yAxisWidth = Math.min(Math.max(maxLabelLength * 7.5, 45), 140)
    
    return (
      <div ref={setRefs} className="h-full w-full">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <RechartsBarChart
            key="horizontal-chart"
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 60, bottom: 5, left: 5 }}
            barCategoryGap="15%"
          >
            <CartesianGrid className="stroke-border opacity-80" strokeDasharray="4 4" />
            <XAxis 
              type="number" 
              ticks={numericTicks}
              domain={[0, numericAxisMax]}
              tickLine={false} 
              axisLine={false}
              tickFormatter={(v) => Number(v).toLocaleString()}
              style={{ fontSize: '14px' }}
            />
            <YAxis
              dataKey="label"
              type="category"
              interval={0}
              tickLine={false}
              axisLine={false}
              width={yAxisWidth}
              style={{ fontSize: data.length > 20 ? '12px' : '14px' }}
            />
            <ChartTooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.65 }}
              isAnimationActive={false}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  return (
                    <div key={data.id || data.label} className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-md p-3 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">{data.label}</span>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: data.color }} />
                          <span className="font-bold text-sm text-foreground">{Number(data.value).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={50} isAnimationActive={isAnimationActive}>
              {data.map((item) => (
                <Cell key={item.id} fill={item.color} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                offset={8}
                className="fill-foreground font-semibold chart-global-label"
                fontSize={15}
                fontWeight={600}
                formatter={(value: any) => (Number(value) || 0).toLocaleString()}
              />
            </Bar>
            {children}
          </RechartsBarChart>
        </ChartContainer>
      </div>
    )
  }

  // Vertical mode: bars grow upward
  const chartWidth = dimensions.width || 800;
  const availableWidthPerBar = data.length > 0 ? (chartWidth - 60) / data.length : 80;
  const approxLabelWidth = maxLabelLength * 7;
  
  // If bars are tight and labels are longer than available space, angle them cleanly so they never collide
  const shouldAngle = availableWidthPerBar < approxLabelWidth && data.length > 6;
  
  const tickFontSize = shouldAngle 
    ? (availableWidthPerBar < 30 ? 11 : 12) 
    : (data.length > 15 ? 12 : 14);

  const xAxisHeight = shouldAngle 
    ? Math.min(Math.max(maxLabelLength * 5.5, 45), 90) 
    : Math.min(Math.max(maxLabelLength * 3.5, 30), 55);
  
  return (
    <div ref={setRefs} className="h-full w-full">
      <ChartContainer config={chartConfig} className="h-full w-full">
        <RechartsBarChart
          key="vertical-chart"
          data={data}
          layout="horizontal"
          margin={{ top: 25, right: 15, bottom: shouldAngle ? 10 : 5, left: 5 }}
          barCategoryGap="15%"
        >
          <CartesianGrid className="stroke-border opacity-80" strokeDasharray="4 4" />
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
            style={{ fontSize: '14px' }}
          />
          <ChartTooltip
            cursor={{ fill: 'var(--muted)', opacity: 0.65 }}
            isAnimationActive={false}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div key={data.id || data.label} className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-md p-3 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">{data.label}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: data.color }} />
                        <span className="font-bold text-sm text-foreground">{Number(data.value).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar 
            dataKey="value" 
            radius={[6, 6, 0, 0]}
            maxBarSize={80}
            isAnimationActive={isAnimationActive}
          >
            {data.map((item) => (
              <Cell key={item.id} fill={item.color} />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              offset={8}
              className="fill-foreground font-semibold chart-global-label"
              fontSize={15}
              fontWeight={600}
              formatter={(value: any) => (Number(value) || 0).toLocaleString()}
            />
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
      item.label === nextProps.data[idx]?.label &&
      item.color === nextProps.data[idx]?.color
    )
  )
})