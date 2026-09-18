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
import { ChevronLeft, ChevronRight } from "lucide-react"
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
  showFactText?: boolean
  factIndex?: number
  onFactIndexChange?: (index: number) => void
  
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
  const { x, y, width, height, value, rawData, top4KeysSet, barDataKey, isFullscreen, isHorizontal } = props;
  
  if (width < 15 || height < 15) return null;

  if (top4KeysSet) {
    if (!top4KeysSet.has(barDataKey)) return null;
  } else if (rawData && rawData.length > 4) {
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
  
  const str1 = barDataKey;
  const str2 = `(${percent}%)`;
  
  const width1 = str1.length * fontSizePercent * 0.55;
  const width2 = str2.length * fontSizeRaw * 0.55;
  const gap = fontSizePercent * 0.2; 
  
  const totalW = width1 + gap + width2;
  const splitX1 = cx - totalW / 2 + width1;
  const splitX2 = splitX1 + gap;

  // We use two separate <text> elements with explicit X positions instead of <tspan>
  // to ensure flawless compatibility with all SVG viewers (like Figma) while keeping 
  // the different font sizes.
  return (
    <g>
      <text 
        x={splitX1} 
        y={cy} 
        fill="#ffffff" 
        textAnchor="end" 
        dominantBaseline="central"
        fontSize={fontSizePercent} 
        fontWeight="500"
      >
        {str1}
      </text>
      <text 
        x={splitX2} 
        y={cy} 
        fill="#ffffff" 
        textAnchor="start" 
        dominantBaseline="central"
        fontSize={fontSizeRaw} 
        fontWeight="500"
      >
        {str2}
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
  showFactText = false,
  factIndex = 0,
  onFactIndexChange,
  
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

  // Calculate total for radial chart
  const totalValue = React.useMemo(() => {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = data[i].value;
      if (isFinite(v) && v > 0) sum += v;
    }
    return sum;
  }, [data])

  const { maxItem, minItem } = React.useMemo(() => {
    if (!data || data.length === 0) return { maxItem: null, minItem: null };
    let max = data[0];
    let min = data[0];
    for (let i = 1; i < data.length; i++) {
      const item = data[i];
      if (item.value > max.value) max = item;
      if (item.value < min.value) min = item;
    }
    return { maxItem: max, minItem: min };
  }, [data]);

  // Transform data for stacked chart (O(N) with single object)
  const stackedData = React.useMemo(() => {
    const row: Record<string, any> = { name: "All" };
    const divisor = totalValue || 1;
    data.forEach((d) => {
      row[d.label] = Math.max(0, d.value || 0) / divisor;
    });
    return [row];
  }, [data, totalValue]);

  // Transform data for radial chart (O(N) with single object)
  const radialData = React.useMemo(() => {
    const row: Record<string, any> = {};
    const divisor = totalValue || 1;
    data.forEach((d) => {
      row[d.label] = Math.max(0, d.value || 0) / divisor;
    });
    return [row];
  }, [data, totalValue]);

  // Build chart config for radial
  const chartConfig = React.useMemo(() => {
    const cfg: ChartConfig = {};
    data.forEach((d) => {
      cfg[d.label] = {
        label: d.label,
        color: d.color,
      };
    });
    return cfg;
  }, [data]);

  const top4KeysSet = React.useMemo(() => {
    if (!data || data.length <= 4) return null;
    return new Set(
      [...data]
        .sort((a, b) => (b.value || 0) - (a.value || 0))
        .slice(0, 4)
        .map(d => d.label)
    );
  }, [data]);

  const isAnimationActive = data.length <= 15;

  const { legendRows, legendHeight, legendConfig } = React.useMemo(() => {
    const { width, height } = dimensions;
    if (!width) return { legendRows: [], legendHeight: 0, legendConfig: { fontSize: 12, rectSize: 14, gap: 8, spacingY: 25 } };
    
    const effectiveSize = Math.max(width || 0, height || 0);
    const scale = isFullscreen 
      ? Math.min(1.6, Math.max(1.2, effectiveSize / 600))
      : 1;

    const fontSize = Math.round(12 * scale);
    const rectSize = Math.round(14 * scale);
    const gap = Math.round(8 * scale);
    const itemMargin = Math.round(20 * scale);
    const spacingY = Math.round(26 * scale);
    
    const rows: { items: Datum[]; width: number; itemWidths: number[] }[] = [];
    let currentRow: Datum[] = [];
    let currentRowWidth = 0;
    let currentRowItemWidths: number[] = [];

    data.forEach((item: Datum) => {
      const percentage = totalValue > 0 ? Math.round((Math.max(0, item.value || 0) / totalValue) * 100) : 0;
      const labelText = `${item.label}: ${Number(item.value || 0).toLocaleString()} (${percentage}%)`;
      const textWidth = labelText.length * (fontSize * 0.62); 
      const itemWidth = rectSize + gap + textWidth + itemMargin;
      const maxItemsPerRow = isFullscreen && width > 700 ? 5 : 4;

      if ((currentRowWidth + itemWidth - itemMargin > width && currentRow.length > 0) || currentRow.length >= maxItemsPerRow) {
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
      legendHeight: rows.length * spacingY,
      legendConfig: { fontSize, rectSize, gap, spacingY }
    };
  }, [data, dimensions, isFullscreen, totalValue]);

  const renderSvgLegend = (isStandalone = false) => {
    if (!dimensions.width || !dimensions.height || legendRows.length === 0) return null;

    const { fontSize, rectSize, gap, spacingY } = legendConfig;
    const textColor = isDark ? "#e4e4e7" : "#3f3f46"; 
    
    const startY = isStandalone ? 12 : Math.max(0, (dimensions.height || 384) - legendHeight - 8);

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
                  y={y - rectSize + 2} 
                  width={rectSize} 
                  height={rectSize} 
                  fill={item.color} 
                  rx={Math.max(3, Math.round(rectSize * 0.25))}
                />
                <text
                  x={x + rectSize + gap}
                  y={y}
                  fill={textColor}
                  fontSize={fontSize}
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
    const baseHeight = dimensions.height || (isFullscreen ? 500 : 384);
    
    const legendBottomMargin = 8;
    const legendStartY = Math.max(
      120,
      baseHeight - legendHeight - legendBottomMargin
    );

    // Radial semi-circle ends at cy. All content (arc, text, arrows) sits strictly ABOVE cy.
    // Ensure safe area padding and clean spacing between radialCy and legendStartY
    const radialGap = legendRows.length > 0 ? (isFullscreen ? 40 : 32) : 0;
    const radialCy = Math.max(120, legendStartY - radialGap);
    
    // Give proper headroom above the radial arc so it breathes comfortably
    const topHeadroom = isFullscreen ? 50 : 35;
    const availableRadiusW = (baseWidth / 2) * 0.82; 
    const availableRadiusH = Math.max(60, (radialCy - topHeadroom) * 0.88); 
    const maxRadius = Math.min(availableRadiusW, availableRadiusH);
    
    const outerRadius = Math.max(65, isFullscreen ? maxRadius * 0.95 : maxRadius);
    const innerRadius = Math.round(outerRadius * 0.58);
    
    return (
      <div ref={setRefs} className={`h-full w-full flex flex-col items-center justify-center overflow-hidden `}>
        <div className="w-full flex-1 min-h-[300px]">
          <ChartContainer config={chartConfig} className="w-full h-full">
            <RadialBarChart
              data={radialData}
              startAngle={180}
              endAngle={0}
              cx="50%"
              cy={radialCy}
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              style={{ overflow: 'visible' }}
            >
            <Tooltip
              isAnimationActive={false}
              cursor={false}
              content={<StackedTooltip rawData={data} />}
            />
            <PolarAngleAxis type="number" domain={[0, 1]} tick={false} axisLine={false} />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <RechartsLabel
                key={`${factIndex}-${showFactText}`}
                content={({ viewBox }) => {
                  if (!showFactText) return null;
                  
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    const cx = viewBox.cx || 0;
                    const cy = viewBox.cy || 0;
                    const maxTextSize = isFullscreen ? 80 : 32
                    const maxLabelSize = isFullscreen ? 24 : 16
                    
                    // Dynamically scale text to fit inside the innerRadius hole
                    const availableHeight = innerRadius; 
                    const scaleFactor = Math.min(1, availableHeight / (maxTextSize + maxLabelSize + 12));
                    
                    const textSize = maxTextSize * scaleFactor;
                    const labelSize = maxLabelSize * scaleFactor;
                    const titleSize = labelSize * 0.9;
                    
                    let factTitle = "Total";
                    let factValue = totalValue.toLocaleString();
                    let factColor = "var(--muted-foreground)";
                    let factValueColor = "currentColor";
                    let factLabel = "";
                    
                    if (showFactText) {
                      if (factIndex === 1 && maxItem) {
                        factTitle = "The most";
                        factValue = maxItem.value.toLocaleString();
                        factColor = maxItem.color;
                        factValueColor = maxItem.color;
                        factLabel = maxItem.label;
                      } else if (factIndex === 2 && minItem) {
                        factTitle = "The Lowest";
                        factValue = minItem.value.toLocaleString();
                        factColor = minItem.color;
                        factValueColor = minItem.color;
                        factLabel = minItem.label;
                      }
                    }

                    const handlePrev = (e: any) => { 
                      e.stopPropagation(); 
                      if (onFactIndexChange) onFactIndexChange(((factIndex || 0) - 1 + 3) % 3);
                    };
                    const handleNext = (e: any) => { 
                      e.stopPropagation(); 
                      if (onFactIndexChange) onFactIndexChange(((factIndex || 0) + 1) % 3);
                    };
                    
                    // Radial chart is a half circle ending at cy. All content must sit ABOVE cy.
                    // We use fixed Y coordinates so the text and arrows don't jiggle when toggling
                    const labelY = cy - (4 * scaleFactor);
                    const valueY = labelY - labelSize - (4 * scaleFactor);
                    const titleY = valueY - (textSize * 0.8) - (4 * scaleFactor);
                    
                    // Compute the visual center of the text block to perfectly align the arrows
                    const textCenterY = (titleY - titleSize + labelY) / 2;
                    const arrowY = textCenterY - 16;
                    
                    return (
                      <g className="group" style={{ pointerEvents: 'all' }}>
                        <text x={cx} y={cy} textAnchor="middle">
                          <tspan
                            x={cx}
                            y={titleY}
                            style={{ fontSize: `${titleSize}px`, fill: factColor, fontWeight: '500' }}
                          >
                            {factTitle}
                          </tspan>
                          <tspan
                            x={cx}
                            y={valueY}
                            style={{ fontSize: `${textSize}px`, fontWeight: 'bold', fill: factValueColor }}
                          >
                            {factValue}
                          </tspan>
                          {factLabel && (
                            <tspan
                              x={cx}
                              y={labelY}
                              style={{ fontSize: `${labelSize}px`, fill: factColor, opacity: 0.8, fontWeight: '500' }}
                            >
                              {factLabel}
                            </tspan>
                          )}
                        </text>
                        {showFactText && (
                          <g>
                            <svg 
                              x={cx - innerRadius + (isFullscreen ? 60 : 35)} 
                              y={arrowY} 
                              width={32} height={32} 
                              onClick={handlePrev} 
                              className="opacity-0 group-hover:opacity-100 cursor-pointer pointer-events-auto text-muted-foreground transition-opacity"
                              color="currentColor"
                              data-hide-on-copy="true"
                            >
                              <rect width="32" height="32" fill="transparent" />
                              <ChevronLeft x={4} y={4} width={24} height={24} strokeWidth={2.5} />
                            </svg>

                            <svg 
                              x={cx + innerRadius - 32 - (isFullscreen ? 60 : 35)} 
                              y={arrowY} 
                              width={32} height={32} 
                              onClick={handleNext} 
                              className="opacity-0 group-hover:opacity-100 cursor-pointer pointer-events-auto text-muted-foreground transition-opacity"
                              color="currentColor"
                              data-hide-on-copy="true"
                            >
                              <rect width="32" height="32" fill="transparent" />
                              <ChevronRight x={4} y={4} width={24} height={24} strokeWidth={2.5} />
                            </svg>
                          </g>
                        )}
                      </g>
                    )
                  }
                  return null;
                }}
              />
            </PolarRadiusAxis>
            {data.map((d) => (
              <RadialBar 
                isAnimationActive={isAnimationActive}
                key={d.id}
                dataKey={d.label}
                name={d.label}
                stackId="a"
                cornerRadius={4}
                fill={d.color}
                stroke={isDark ? "#18181b" : "#ffffff"}
                strokeWidth={2.5}
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
            margin={{ top: 5, right: 15, bottom: legendHeight + (legendRows.length > 0 ? 16 : 10), left: 5 }}
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
            <Tooltip isAnimationActive={false} cursor={{ fill: 'var(--muted)', opacity: 0.65 }} content={<StackedTooltip rawData={data} />} />
            {data.map((d) => (
              <Bar 
                key={d.id} 
                dataKey={d.label} 
                stackId="stacked" 
                fill={d.color} 
                name={d.label}
                isAnimationActive={isAnimationActive}
              >
                {showLabels && (
                  <LabelList
                    dataKey={d.label}
                    content={<CustomStackedLabel rawData={data} top4KeysSet={top4KeysSet} isFullscreen={isFullscreen} isHorizontal={isHorizontal} barDataKey={d.label} />}
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
          margin={{ top: 5, right: 15, bottom: legendHeight + (legendRows.length > 0 ? 16 : 10), left: 5 }}
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
          <Tooltip isAnimationActive={false} cursor={{ fill: 'var(--muted)', opacity: 0.65 }} content={<StackedTooltip rawData={data} />} />
          {data.map((d) => (
            <Bar 
              key={d.id} 
              dataKey={d.label} 
              stackId="stacked" 
              fill={d.color} 
              name={d.label}
              isAnimationActive={isAnimationActive}
            >
              {showLabels && (
                <LabelList
                  dataKey={d.label}
                  content={<CustomStackedLabel rawData={data} top4KeysSet={top4KeysSet} isFullscreen={isFullscreen} isHorizontal={isHorizontal} barDataKey={d.label} />}
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
    prevProps.showFactText === nextProps.showFactText &&
    prevProps.factIndex === nextProps.factIndex &&
    prevProps.data.length === nextProps.data.length &&
    prevProps.data.every((item, idx) => 
      item.id === nextProps.data[idx]?.id &&
      item.value === nextProps.data[idx]?.value &&
      item.label === nextProps.data[idx]?.label &&
      item.color === nextProps.data[idx]?.color
    )
  )
})