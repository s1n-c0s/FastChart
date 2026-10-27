import * as React from "react";
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

import type { Datum } from "@/types";

export interface PieChartProps {
  data: Datum[];
  data2?: Datum[] | null;
  table1Name?: string;
  table2Name?: string;
  total: number;
  total2?: number;
  containerRef?: React.Ref<HTMLDivElement>;
  isFullscreen?: boolean;
  showLabels?: boolean;
  showLegend?: boolean;
  showFactText?: boolean;
  factIndex?: number;
  onFactIndexChange?: (index: number) => void;
}

const CustomTooltip = React.memo(({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload as Datum;
    return (
      <div key={item.id || item.label} className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-md p-3 shadow-xl animate-in fade-in zoom-in-95 duration-200 min-w-[140px]">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">{item.label}</span>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="font-bold text-sm text-foreground">{Number(item.value || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
});

const FactTextOverlay = (props: any) => {
  const {
    cx, pieCy, innerRadius, size, total, factIndex,
    isFullscreen, textColor, textMainColor, onFactIndexChange,
    maxItem, minItem
  } = props;
  
  const innerR = innerRadius || (size ? size * 0.20 : 50);
  
  let factTitle = "Total";
  let factValue = Number(total || 0).toLocaleString();
  let factColor = textMainColor;
  let factLabel = "";
  
  if (factIndex === 1 && maxItem) {
    factTitle = "The most";
    factValue = Number(maxItem.value || 0).toLocaleString();
    factColor = maxItem.color;
    factLabel = maxItem.label;
  } else if (factIndex === 2 && minItem) {
    factTitle = "The Lowest";
    factValue = Number(minItem.value || 0).toLocaleString();
    factColor = minItem.color;
    factLabel = minItem.label;
  }
  
  const handleNext = (e: React.MouseEvent) => { 
    e.stopPropagation(); 
    if (onFactIndexChange) onFactIndexChange((factIndex + 1) % 3);
  };

  const maxTitleSize = isFullscreen ? 16 : 12;
  const maxValueSize = isFullscreen ? 32 : 20;
  const maxLabelSize = isFullscreen ? 14 : 11;
  
  const totalTextHeight = maxTitleSize + maxValueSize + maxLabelSize + 16;
  const safeHeight = innerR * 1.6;
  const scaleFactor = Math.min(1, safeHeight / totalTextHeight);
  
  const titleSize = maxTitleSize * scaleFactor;
  const valueSize = maxValueSize * scaleFactor;
  const labelSize = maxLabelSize * scaleFactor;

  let titleYOffset, valueYOffset, labelYOffset;
  if (factLabel) {
    titleYOffset = isFullscreen ? -26 : -20;
    valueYOffset = isFullscreen ? 5 : 3;
    labelYOffset = isFullscreen ? 30 : 24;
  } else {
    titleYOffset = isFullscreen ? -14 : -10;
    valueYOffset = isFullscreen ? 16 : 12;
    labelYOffset = 0;
  }

  return (
    <g 
      className="group cursor-pointer select-none transition-opacity hover:opacity-80" 
      style={{ pointerEvents: 'all' }}
      onClick={handleNext}
    >
      <circle cx={cx} cy={pieCy} r={innerR} fill="transparent" style={{ cursor: 'pointer' }} />
      
      <text x={cx} y={pieCy} textAnchor="middle" dominantBaseline="middle" className="pointer-events-none select-none">
        <tspan 
          x={cx} 
          dy={titleYOffset}
          fill={textColor} 
          fontSize={titleSize} 
          fontWeight="500"
          fontFamily="sans-serif"
          className="uppercase tracking-wider transition-all duration-300"
        >
          {factTitle}
        </tspan>

        <tspan 
          x={cx} 
          dy={valueYOffset - titleYOffset} 
          fill={factColor} 
          fontSize={valueSize} 
          fontWeight="700"
          fontFamily="sans-serif"
          className="transition-all duration-300"
        >
          {factValue}
        </tspan>

        {factLabel && (
          <tspan 
            x={cx} 
            dy={labelYOffset - valueYOffset} 
            fill={textColor} 
            fontSize={labelSize} 
            fontWeight="500"
            fontFamily="sans-serif"
            className="transition-all duration-300"
          >
            {factLabel}
          </tspan>
        )}
      </text>
    </g>
  );
};

export const PieChart = React.memo(function PieChart({
  data,
  data2,
  table1Name = "Table 1",
  table2Name = "Table 2",
  total,
  total2: customTotal2,
  containerRef,
  isFullscreen = false,
  showLabels = true,
  showLegend = true,
  showFactText = false,
  factIndex = 0,
  onFactIndexChange,
}: PieChartProps) {
  const isComparison = Boolean(data2 && data2.length > 0);
  const [isDark, setIsDark] = React.useState(false);

  const total2 = React.useMemo(() => {
    if (customTotal2 !== undefined) return customTotal2;
    if (!data2) return 0;
    let sum = 0;
    for (let i = 0; i < data2.length; i++) {
      const v = Number(data2[i].value);
      if (isFinite(v)) sum += v;
    }
    return sum;
  }, [data2, customTotal2]);

  React.useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const [dimensions, setDimensions] = React.useState({
    width: 0,
    height: isFullscreen ? 600 : 384,
  });
  const localRef = React.useRef<HTMLDivElement | null>(null);

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

  const chartWidth = dimensions.width || (isFullscreen ? 800 : 400);
  const totalHeight = dimensions.height || (isFullscreen ? 600 : 384);

  const textColor = "#71717a";
  const textMainColor = isDark ? "#fafafa" : "#09090b";

  const { maxItem1, minItem1 } = React.useMemo(() => {
    if (!data || data.length === 0) return { maxItem1: null, minItem1: null };
    let max = data[0];
    let min = data[0];
    for (let i = 1; i < data.length; i++) {
      const item = data[i];
      if (item.value > max.value) max = item;
      if (item.value < min.value) min = item;
    }
    return { maxItem1: max, minItem1: min };
  }, [data]);

  const { maxItem2, minItem2 } = React.useMemo(() => {
    if (!data2 || data2.length === 0) return { maxItem2: null, minItem2: null };
    let max = data2[0];
    let min = data2[0];
    for (let i = 1; i < data2.length; i++) {
      const item = data2[i];
      if (item.value > max.value) max = item;
      if (item.value < min.value) min = item;
    }
    return { maxItem2: max, minItem2: min };
  }, [data2]);

  // Combined legend items
  const combinedLegendData = React.useMemo(() => {
    if (!isComparison || !data2) return data;
    const map = new Map<string, Datum>();
    data.forEach((d) => map.set(d.label, d));
    data2.forEach((d) => {
      if (!map.has(d.label)) {
        map.set(d.label, d);
      }
    });
    return Array.from(map.values());
  }, [data, data2, isComparison]);

  // Dynamic Legend calculation
  const { legendRows, legendHeight, legendConfig } = React.useMemo(() => {
    const width = chartWidth;
    const effectiveSize = Math.max(chartWidth || 0, totalHeight || 0);
    const scale = isFullscreen ? Math.min(1.5, Math.max(1.1, effectiveSize / 600)) : 1;

    const fontSize = Math.round(13.5 * scale);
    const rectSize = Math.round(15 * scale);
    const gap = Math.round(8 * scale);
    const itemMargin = Math.round(20 * scale);
    const spacingY = Math.round(27 * scale);

    const rows: { items: Datum[]; width: number; itemWidths: number[] }[] = [];
    let currentRow: Datum[] = [];
    let currentRowWidth = 0;
    let currentRowItemWidths: number[] = [];

    const datasetForLegend = isComparison ? combinedLegendData : data;
    datasetForLegend.forEach((item: Datum) => {
      const percentage = !isComparison && total > 0 ? ` (${Math.round((Math.max(0, item.value || 0) / total) * 100)}%)` : "";
      const labelText = `${item.label}${!isComparison ? `: ${Number(item.value || 0).toLocaleString()}` : ""}${percentage}`;
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
      legendConfig: { fontSize, rectSize, gap, spacingY },
    };
  }, [chartWidth, totalHeight, isFullscreen, isComparison, combinedLegendData, data, total]);

  const effectiveLegendHeight = showLegend ? legendHeight : 0;
  const legendBottomMargin = showLegend ? 12 : 0;
  const legendTopPadding = showLegend && legendRows.length > 0 ? 14 : 0;
  const legendStartY = showLegend
    ? Math.max(140, totalHeight - effectiveLegendHeight - legendBottomMargin)
    : totalHeight;

  const availablePieHeight = showLegend ? legendStartY - legendTopPadding : totalHeight;
  const pieCy = Math.round(availablePieHeight / 2);

  // Position calculations for comparison mode
  const isCompact = chartWidth < 520;
  const cx1 = isComparison ? (isCompact ? chartWidth / 2 : chartWidth * 0.28) : chartWidth / 2;
  const cx2 = isComparison ? (isCompact ? chartWidth / 2 : chartWidth * 0.72) : chartWidth / 2;
  const cy1 = isComparison && isCompact ? Math.round(availablePieHeight * 0.28) : pieCy;
  const cy2 = isComparison && isCompact ? Math.round(availablePieHeight * 0.72) : pieCy;

  const maxRadius = isComparison
    ? Math.max(35, Math.min(chartWidth * (isCompact ? 0.35 : 0.18), availablePieHeight * (isCompact ? 0.18 : 0.35)))
    : Math.max(45, Math.min(chartWidth * 0.25, availablePieHeight * 0.35));

  const outerR = Math.round(maxRadius);
  const innerR = Math.round(outerR * 0.60);
  const isAnimationActive = data.length <= 15;

  const renderSvgLegend = () => {
    if (!showLegend || !chartWidth || !totalHeight || legendRows.length === 0) return null;
    const { fontSize, rectSize, gap, spacingY } = legendConfig;

    return (
      <g className="svg-legend">
        {legendRows.flatMap((row, rowIndex) => {
          let currentX = (chartWidth - row.width) / 2;
          return row.items.map((item, colIndex) => {
            const x = currentX;
            const y = legendStartY + rowIndex * spacingY;
            currentX += row.itemWidths[colIndex];
            const pct = !isComparison && total > 0 ? ` (${Math.round((Math.max(0, item.value || 0) / total) * 100)}%)` : "";

            return (
              <g key={`svg-leg-${item.id}`}>
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
                  fill={textMainColor}
                  fontSize={fontSize}
                  fontWeight="500"
                  fontFamily="'Anuphan', sans-serif"
                  style={{ pointerEvents: 'none' }}
                >
                  {item.label}{!isComparison ? `: ${Number(item.value || 0).toLocaleString()}` : ""}{pct}
                </text>
              </g>
            );
          });
        })}
      </g>
    );
  };

  return (
    <div ref={setRefs} className="flex h-full w-full items-center justify-center flex-col overflow-hidden relative">
      <div className="relative w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart style={{ overflow: "visible" }}>
            <Tooltip isAnimationActive={false} content={<CustomTooltip />} />

            {/* Header Titles for Comparison Mode */}
            {isComparison && (
              <>
                <text
                  x={cx1}
                  y={Math.max(16, cy1 - outerR - 12)}
                  textAnchor="middle"
                  fill={textMainColor}
                  fontSize={isFullscreen ? 15 : 12}
                  fontWeight="600"
                  fontFamily="sans-serif"
                >
                  {table1Name}
                </text>
                <text
                  x={cx2}
                  y={Math.max(16, cy2 - outerR - 12)}
                  textAnchor="middle"
                  fill={textMainColor}
                  fontSize={isFullscreen ? 15 : 12}
                  fontWeight="600"
                  fontFamily="sans-serif"
                >
                  {table2Name}
                </text>
              </>
            )}

            {/* Pie 1 (Table 1) */}
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx={cx1}
              cy={cy1}
              innerRadius={innerR}
              outerRadius={outerR}
              paddingAngle={2}
              cornerRadius={5}
              isAnimationActive={isAnimationActive}
              stroke="none"
              label={showLabels ? (entry: any) => `${((entry.value / (total || 1)) * 100).toFixed(0)}%` : false}
              labelLine={false}
              style={{ cursor: "pointer" }}
            >
              {data.map((item) => (
                <Cell key={`p1-${item.id}`} fill={item.color} />
              ))}
            </Pie>

            {/* Pie 2 (Table 2 in Comparison mode) */}
            {isComparison && data2 && (
              <Pie
                data={data2}
                dataKey="value"
                nameKey="label"
                cx={cx2}
                cy={cy2}
                innerRadius={innerR}
                outerRadius={outerR}
                paddingAngle={2}
                cornerRadius={5}
                isAnimationActive={isAnimationActive}
                stroke="none"
                label={showLabels ? (entry: any) => `${((entry.value / (total2 || 1)) * 100).toFixed(0)}%` : false}
                labelLine={false}
                style={{ cursor: "pointer" }}
              >
                {data2.map((item) => (
                  <Cell key={`p2-${item.id}`} fill={item.color} />
                ))}
              </Pie>
            )}

            {renderSvgLegend()}
          </RechartsPieChart>
        </ResponsiveContainer>

        {/* Fact Text Overlays */}
        {showFactText && (
          <svg className="fact-text-overlay absolute inset-0" width="100%" height="100%" style={{ overflow: 'visible', pointerEvents: 'none' }}>
            <FactTextOverlay
              cx={cx1}
              pieCy={cy1}
              innerRadius={innerR}
              total={total}
              factIndex={factIndex}
              isFullscreen={isFullscreen}
              textColor={textColor}
              textMainColor={textMainColor}
              onFactIndexChange={onFactIndexChange}
              maxItem={maxItem1}
              minItem={minItem1}
            />
            {isComparison && data2 && (
              <FactTextOverlay
                cx={cx2}
                pieCy={cy2}
                innerRadius={innerR}
                total={total2}
                factIndex={factIndex}
                isFullscreen={isFullscreen}
                textColor={textColor}
                textMainColor={textMainColor}
                onFactIndexChange={onFactIndexChange}
                maxItem={maxItem2}
                minItem={minItem2}
              />
            )}
          </svg>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isFullscreen === nextProps.isFullscreen &&
    prevProps.showLabels === nextProps.showLabels &&
    prevProps.showLegend === nextProps.showLegend &&
    prevProps.table1Name === nextProps.table1Name &&
    prevProps.table2Name === nextProps.table2Name &&
    prevProps.total === nextProps.total &&
    prevProps.total2 === nextProps.total2 &&
    prevProps.data.length === nextProps.data.length &&
    (prevProps.data2?.length ?? 0) === (nextProps.data2?.length ?? 0) &&
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
    )) &&
    prevProps.showFactText === nextProps.showFactText &&
    prevProps.factIndex === nextProps.factIndex
  );
});
