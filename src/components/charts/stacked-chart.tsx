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
  PolarAngleAxis,
  Label as RechartsLabel
} from "recharts"
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart"
import type { Datum } from "@/types"

export interface StackedChartProps {
  data: Datum[]
  isHorizontal?: boolean
  containerRef?: React.Ref<HTMLDivElement>
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
  rawData?: Datum[]
}

const StackedTooltip = React.memo(function StackedTooltip({ active, payload, rawData }: StackedTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-md p-3 shadow-xl animate-in fade-in zoom-in-95 duration-200 min-w-[140px]">
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">Details</span>
        <div className="flex flex-col gap-2 mt-1">
          {payload.map((entry, idx) => (
            <div key={idx} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.fill }} />
                <span className="font-medium text-sm text-foreground">{entry.name}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-bold text-sm text-foreground">
                  {rawData?.find(d => d.label === entry.name)?.value?.toLocaleString() || 0}
                </span>
                <span className="font-medium text-[11px] text-muted-foreground">{Math.round((entry.value || 0) * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
});

StackedTooltip.displayName = "StackedTooltip";

const CustomStackedLabel = (props: any) => {
  const { x, y, width, height, value, rawData, barDataKey, isFullscreen, isHorizontal } = props;
  
  if (width < 15 || height < 15) return null;

  if (rawData && rawData.length > 4) {
    const top4Keys = [...rawData]
      .sort((a, b) => (b.value || 0) - (a.value || 0))
      .slice(0, 4)
      .map(d => d.label);
    
    if (!top4Keys.includes(barDataKey)) {
      return null;
    }
  }

  const percent = Math.round((value || 0) * 100);
  
  const cx = x + width / 2;
  const cy = y + height / 2;
  
  const baseFontSizePercent = isFullscreen ? 40 : (isHorizontal ? 24 : 20);
  const baseFontSizeRaw = isFullscreen ? 20 : (isHorizontal ? 16 : 14);
  
  // Calculate text width approximately (0.6 is typical average character width ratio)
  const textStr = `${barDataKey} (${percent}%)`;
  const approxTextWidth = textStr.length * (baseFontSizePercent * 0.55);
  const approxTextHeight = baseFontSizePercent;

  // Scale factor to fit inside the bar with some padding (4px each side minimum)
  const paddingX = 8;
  const paddingY = 4;
  const scaleX = Math.min(1, Math.max(0.1, (width - paddingX) / approxTextWidth));
  const scaleY = Math.min(1, Math.max(0.1, (height - paddingY) / approxTextHeight));
  const scale = Math.min(scaleX, scaleY);

  const fontSizePercent = baseFontSizePercent * scale;
  const fontSizeRaw = baseFontSizeRaw * scale;
  
  // If the bar is so tiny that scale drops below 0.3, just hide it to avoid illegible microscopic text
  if (scale < 0.3) return null;
  
  return (
    <g>
      <text x={cx} y={cy} fill="#ffffff" textAnchor="middle" dominantBaseline="central">
        <tspan fontSize={fontSizePercent} fontWeight="500">
          {barDataKey}
        </tspan>
        <tspan fontSize={fontSizeRaw} fontWeight="500" dx={isFullscreen ? 6 * scale : 4 * scale} dy={isFullscreen ? -4 * scale : -2 * scale}>
          ({percent}%)
        </tspan>
      </text>
    </g>
  );
};

export const StackedChart = React.memo(function StackedChart({
  data,
  isHorizontal = true,
  containerRef,
  showLabels = false,
  showRadial = false,
  isFullscreen = false,
  
}: StackedChartProps) {

  const [isDark, setIsDark] = React.useState(false);
  React.useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

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
      setDimensions({ width: node.clientWidth, height: node.clientHeight });
      const observer = new ResizeObserver((entries) => {
        if (entries[0]) {
          setDimensions({
            width: entries[0].contentRect.width,
            height: entries[0].contentRect.height,
          });
        }
      });
      observer.observe(node);
      return () => observer.disconnect();
    }
  }, []);

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

  const { legendRows, legendHeight } = React.useMemo(() => {
    const { width } = dimensions;
    if (!width) return { legendRows: [], legendHeight: 0 };
    
    const spacingY = 25;
    const rectSize = 14; 
    const gap = 8;
    const itemMargin = 20;
    
    const rows: { items: Datum[]; width: number; itemWidths: number[] }[] = [];
    let currentRow: Datum[] = [];
    let currentRowWidth = 0;
    let currentRowItemWidths: number[] = [];

    data.forEach((item: Datum) => {
      const percentage = totalValue > 0 ? Math.round((Math.max(0, item.value || 0) / totalValue) * 100) : 0;
      const labelText = `${item.label}: ${Number(item.value || 0).toLocaleString()} (${percentage}%)`;
      const textWidth = labelText.length * (isFullscreen ? 8.5 : 7.5); 
      const itemWidth = rectSize + gap + textWidth + itemMargin;

      if (currentRowWidth + itemWidth - itemMargin > width && currentRow.length > 0) {
        rows.push({ items: currentRow, width: currentRowWidth - itemMargin, itemWidths: currentRowItemWidths });
        currentRow = [item];
        currentRowWidth = itemWidth;
        currentRowItemWidths = [itemWidth];
      } else {
        currentRow.push(item);
        currentRowWidth += itemWidth;
        currentRowItemWidths.push(itemWidth);
      }
    });

    if (currentRow.length > 0) {
      rows.push({ items: currentRow, width: currentRowWidth - itemMargin, itemWidths: currentRowItemWidths });
    }

    return { 
      legendRows: rows, 
      legendHeight: rows.length * spacingY 
    };
  }, [data, dimensions, isFullscreen]);

  const renderSvgLegend = (isStandalone = false) => {
    if (!dimensions.width || !dimensions.height || legendRows.length === 0) return null;

    const spacingY = 25;
    const rectSize = 14; 
    const gap = 8;
    const textColor = isDark ? "#e4e4e7" : "#3f3f46"; 
    
    const startY = isStandalone ? 12 : (dimensions.height ? dimensions.height - legendHeight : 0);

    return (
      <g className="svg-legend">
        {legendRows.flatMap((row, rowIndex) => {
          let currentX = (dimensions.width - row.width) / 2;

          return row.items.map((item, colIndex) => {
            const x = currentX;
            const y = startY + (rowIndex * spacingY);
            currentX += row.itemWidths[colIndex];

            return (
              <g key={`legend-${item.id}`}>
                <rect 
                  x={x} 
                  y={y - 12} 
                  width={rectSize} 
                  height={rectSize} 
                  fill={item.color} 
                  rx={3}
                />
                <text
                  x={x + rectSize + gap}
                  y={y}
                  fill={textColor}
                  fontSize={isFullscreen ? 14 : 12}
                  fontWeight="500"
                  fontFamily="sans-serif"
                  style={{ pointerEvents: 'none' }}
                >
                  {item.label}: {Number(item.value || 0).toLocaleString()} ({totalValue > 0 ? Math.round((Math.max(0, item.value || 0) / totalValue) * 100) : 0}%)
                </text>
              </g>
            );
          });
        })}
      </g>
    );
  };

  // Render radial chart
  if (showRadial) {
    const baseWidth = dimensions.width || (isFullscreen ? 800 : 400);
    const baseHeight = dimensions.height || (isFullscreen ? 500 : 300);
    
    // We want the chart to fit nicely in the top part of the container.
    // The cx="50%" cy="80%" means the center of the half circle is very low.
    // So the height of the chart is actually mostly its radius.
    // Let's ensure it doesn't overflow horizontally or vertically.
    
    const availableRadiusW = (baseWidth / 2) * 0.8; 
    const availableRadiusH = baseHeight * 0.7; // since cy=80%, we have 80% height available
    const maxRadius = Math.min(availableRadiusW, availableRadiusH);
    
    const outerRadius = Math.max(100, isFullscreen ? maxRadius * 0.9 : maxRadius * 0.9);
    const innerRadius = outerRadius * 0.55;
    
    return (
      <div ref={setRefs} className={`h-full w-full flex flex-col items-center justify-center overflow-hidden `}>
        <div className="w-full flex-1 min-h-[300px]">
          <ChartContainer config={chartConfig} className="w-full h-full">
            <RadialBarChart
              data={radialData}
              startAngle={180}
              endAngle={0}
              cx="50%"
              cy="80%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              style={{ overflow: 'visible' }}
            >
            <Tooltip
              cursor={false}
              content={<StackedTooltip rawData={data} />}
            />
            <PolarAngleAxis type="number" domain={[0, 1]} tick={false} axisLine={false} />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <RechartsLabel
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    const maxTextSize = isFullscreen ? 80 : 32
                    const maxLabelSize = isFullscreen ? 24 : 16
                    
                    // Dynamically scale text to fit inside the innerRadius hole
                    const availableHeight = innerRadius; 
                    const scaleFactor = Math.min(1, availableHeight / (maxTextSize + maxLabelSize + 12));
                    
                    const textSize = maxTextSize * scaleFactor;
                    const labelSize = maxLabelSize * scaleFactor;
                    
                    // Label sits slightly above the baseline (cy)
                    const labelY = (viewBox.cy || 0) - (8 * scaleFactor);
                    // Number sits above the label with some spacing
                    const numberY = labelY - labelSize - (4 * scaleFactor);
                    
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                        <tspan
                          x={viewBox.cx}
                          y={numberY}
                          style={{ fontSize: `${textSize}px`, fontWeight: 'bold', fill: 'currentColor' }}
                        >
                          {totalValue.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={labelY}
                          style={{ fontSize: `${labelSize}px`, fill: 'var(--muted-foreground)' }}
                        >
                          Total
                        </tspan>
                      </text>
                    )
                  }
                  return null;
                }}
              />
            </PolarRadiusAxis>
            {data.map((d) => (
              <RadialBar isAnimationActive={true}
                key={d.id}
                dataKey={d.label}
                name={d.label}
                stackId="a"
                cornerRadius={5}
                fill={d.color}
                className="stroke-transparent stroke-2"
              />
            ))}
            {renderSvgLegend()}
          </RadialBarChart>
          </ChartContainer>
        </div>
      </div>
    )
  }

  // Horizontal mode: bars grow to the right
  if (isHorizontal) {
    return (
      <div ref={setRefs} className={`h-full w-full `}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart
            key="horizontal-stacked-chart"
            data={stackedData}
            stackOffset="expand"
            layout="vertical"
            margin={{ top: 5, right: 15, bottom: legendHeight + 10, left: 5 }}
          >
            <CartesianGrid className="stroke-border opacity-80" strokeDasharray="4 4" />
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
            <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.65 }} content={<StackedTooltip rawData={data} />} />
            {data.map((d) => (
              <Bar 
                key={d.id} 
                dataKey={d.label} 
                stackId="stacked" 
                fill={d.color} 
                name={d.label}
                isAnimationActive={true}
              >
                {showLabels && (
                  <LabelList
                    dataKey={d.label}
                    content={<CustomStackedLabel rawData={data} isFullscreen={isFullscreen} isHorizontal={isHorizontal} barDataKey={d.label} />}
                  />
                )}
              </Bar>
            ))}
            {renderSvgLegend()}
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // Vertical mode: bars grow upward
  return (
    <div ref={setRefs} className={`h-full w-full `}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          key="vertical-stacked-chart"
          data={stackedData}
          stackOffset="expand"
          layout="horizontal"
          margin={{ top: 5, right: 15, bottom: legendHeight + 10, left: 5 }}
        >
          <CartesianGrid className="stroke-border opacity-80" strokeDasharray="4 4" />
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
          <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.65 }} content={<StackedTooltip rawData={data} />} />
          {data.map((d) => (
            <Bar 
              key={d.id} 
              dataKey={d.label} 
              stackId="stacked" 
              fill={d.color} 
              name={d.label}
              isAnimationActive={true}
            >
              {showLabels && (
                <LabelList
                  dataKey={d.label}
                  content={<CustomStackedLabel rawData={data} isFullscreen={isFullscreen} isHorizontal={isHorizontal} barDataKey={d.label} />}
                />
              )}
            </Bar>
          ))}
          {renderSvgLegend()}
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