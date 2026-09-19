import * as React from "react";
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

import type { Datum } from "@/types";

export interface PieChartProps {
  data: Datum[];
  total: number;
  containerRef?: React.Ref<HTMLDivElement>;
  isFullscreen?: boolean;
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
    chartWidth, pieCy, innerRadius, size, total, factIndex,
    isFullscreen, textColor, textMainColor, onFactIndexChange,
    maxItem, minItem
  } = props;
  
  const cx = chartWidth / 2;
  const cy = pieCy;
  const innerR = innerRadius || (size ? size * 0.20 : 50);
  
  let factTitle = "Total";
  let factValue = total.toLocaleString();
  let factColor = textMainColor;
  let factLabel = "";
  
  if (factIndex === 1 && maxItem) {
    factTitle = "The most";
    factValue = maxItem.value.toLocaleString();
    factColor = maxItem.color;
    factLabel = maxItem.label;
  } else if (factIndex === 2 && minItem) {
    factTitle = "The Lowest";
    factValue = minItem.value.toLocaleString();
    factColor = minItem.color;
    factLabel = minItem.label;
  }
  
  const handleNext = (e: React.MouseEvent) => { 
    e.stopPropagation(); 
    if (onFactIndexChange) onFactIndexChange((factIndex + 1) % 3);
  };

  const maxTitleSize = isFullscreen ? 16 : 12;
  const maxValueSize = isFullscreen ? 36 : 22;
  const maxLabelSize = isFullscreen ? 14 : 11;
  
  const totalTextHeight = maxTitleSize + maxValueSize + maxLabelSize + 20;
  const safeHeight = innerR * 1.6;
  const scaleFactor = Math.min(1, safeHeight / totalTextHeight);
  
  const titleSize = maxTitleSize * scaleFactor;
  const valueSize = maxValueSize * scaleFactor;
  const labelSize = maxLabelSize * scaleFactor;

  let titleYOffset, valueYOffset, labelYOffset;
  if (factLabel) {
    titleYOffset = isFullscreen ? -28 : -22;
    valueYOffset = isFullscreen ? 6 : 4;
    labelYOffset = isFullscreen ? 32 : 26;
  } else {
    titleYOffset = isFullscreen ? -14 : -10;
    valueYOffset = isFullscreen ? 18 : 14;
    labelYOffset = 0;
  }

  return (
    <g 
      className="group cursor-pointer select-none transition-opacity hover:opacity-80" 
      style={{ pointerEvents: 'all' }}
      onClick={handleNext}
    >
      <circle cx={cx} cy={cy} r={innerR} fill="transparent" style={{ cursor: 'pointer' }} />
      
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" className="pointer-events-none select-none">
        <tspan
          x={cx}
          y={cy + titleYOffset * scaleFactor}
          fill={textColor} 
          fontSize={titleSize}
          fontWeight="500"
        >
          {factTitle}
        </tspan>
        <tspan
          x={cx}
          y={cy + valueYOffset * scaleFactor}
          fill={factColor}
          fontSize={valueSize}
          fontWeight="bold" 
        >
          {factValue}
        </tspan>
        {factLabel && (
          <tspan
            x={cx}
            y={cy + labelYOffset * scaleFactor}
            fill={factColor}
            fontSize={labelSize}
            fontWeight="500"
            opacity={0.8}
          >
            {factLabel}
          </tspan>
        )}
      </text>
    </g>
  );
};


const InnerRechartsPie = React.memo(({ 
  size, 
  data, 
  pieCy, 
  innerRadius, 
  outerRadius, 
  isFullscreen, 
  renderCustomLabel, 
  top4Ids, 
  targetFocusIndex, 
  renderSvgLegend 
}: any) => {
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const pieContainerRef = React.useRef<HTMLDivElement | null>(null);

  const onPieMouseEnter = React.useCallback((_: any, index: number) => {
    if (targetFocusIndex !== -1) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    const root = pieContainerRef.current || document;
    root.querySelectorAll('.my-hovered-sector').forEach(el => el.classList.remove('my-hovered-sector'));
    root.querySelectorAll(`.my-sector-${index}`).forEach(el => el.classList.add('my-hovered-sector'));
  }, [targetFocusIndex]);

  const onPieMouseLeave = React.useCallback(() => {
    if (targetFocusIndex !== -1) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const root = pieContainerRef.current || document;
      root.querySelectorAll('.my-hovered-sector').forEach(el => el.classList.remove('my-hovered-sector'));
    }, 4000);
  }, [targetFocusIndex]);

  const cells = React.useMemo(() => {
    return data.map((item: Datum, index: number) => {
      const isFocused = index === targetFocusIndex;
      const isOther = top4Ids && !top4Ids.includes(item.id);
      return (
        <Cell 
          key={item.id} 
          fill={item.color} 
          opacity={isOther ? 0.55 : 1}
          stroke="none"
          className={`my-sector my-sector-${index} ${isFocused ? 'my-hovered-sector-static' : ''}`}
          style={{ transformOrigin: `50% ${pieCy}px` }}
        />
      );
    });
  }, [data, targetFocusIndex, top4Ids, pieCy]);

  const actualInnerR = innerRadius || (size ? size * 0.20 : 50);
  const actualOuterR = outerRadius || (isFullscreen ? (size ? size * 0.30 : 100) : (size ? size * 0.27 : 85));
  const isAnimationActive = data.length <= 15;

  return (
    <div ref={pieContainerRef} className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart style={{ overflow: 'visible' }}>
          <defs>
            <style>{`
              .my-sector {
                transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s ease;
              }
              .my-hovered-sector, .my-hovered-sector-static {
                transform: scale(1.08);
                opacity: 1 !important;
              }
            `}</style>
          </defs>
          <Tooltip isAnimationActive={false} content={<CustomTooltip />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy={pieCy}
            innerRadius={actualInnerR}
            outerRadius={actualOuterR}
            paddingAngle={2}
            cornerRadius={6}
            isAnimationActive={isAnimationActive}
            animationDuration={400}
            stroke="none"
            label={renderCustomLabel}
            labelLine={false}
            onMouseEnter={onPieMouseEnter}
            onMouseLeave={onPieMouseLeave}
            style={{ cursor: 'pointer' }}
          >
            {cells}
          </Pie>
          
          {renderSvgLegend()}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
});

export const PieChart = React.memo(function PieChart({ data, total, containerRef, isFullscreen = false,  
  showLegend = true,
  showFactText = false,
  factIndex = 0,
  onFactIndexChange,
}: PieChartProps) {
  const [isDark, setIsDark] = React.useState(false);
  
  React.useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      observer.disconnect();
    };
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

  const textColor = "#71717a"; // muted-foreground
  const textMainColor = isDark ? "#fafafa" : "#09090b"; // foreground hex
  const bgColor = isDark ? "#18181b" : "#ffffff"; // popover hex
  const borderColor = isDark ? "#27272a" : "#e4e4e7"; // border hex

  const top4Ids = React.useMemo(() => {
    if (data.length <= 5) return null;
    return [...data].sort((a, b) => b.value - a.value).slice(0, 4).map(d => d.id);
  }, [data]);

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

  const targetFocusIndex = factIndex === 1 && maxItem ? data.findIndex(d => d.id === maxItem.id) 
                         : factIndex === 2 && minItem ? data.findIndex(d => d.id === minItem.id) 
                         : -1;

  const { otherSum, lastOtherId } = React.useMemo(() => {
    if (!top4Ids) return { otherSum: 0, lastOtherId: null };
    const top4Set = new Set(top4Ids);
    let sum = 0;
    let lastId: string | number | null = null;
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (!top4Set.has(item.id)) {
        sum += item.value;
        lastId = item.id;
      }
    }
    return { otherSum: sum, lastOtherId: lastId };
  }, [data, top4Ids]);

  const prevDataRef = React.useRef(data);
  if (prevDataRef.current !== data) {
    prevDataRef.current = data;
  }

  // --- Dynamic Legend rows & size calculation ---
  const { legendRows, legendHeight, legendConfig } = React.useMemo(() => {
    const width = chartWidth;
    const effectiveSize = Math.max(chartWidth || 0, totalHeight || 0);

    // Dynamically scale legend elements based on chart size and whether it's fullscreen
    const scale = isFullscreen 
      ? Math.min(1.5, Math.max(1.1, effectiveSize / 600))
      : 1;

    const fontSize = Math.round(12 * scale);
    const rectSize = Math.round(14 * scale);
    const gap = Math.round(8 * scale);
    const itemMargin = Math.round(20 * scale);
    const spacingY = Math.round(25 * scale);

    const rows: { items: Datum[]; width: number; itemWidths: number[] }[] = [];
    let currentRow: Datum[] = [];
    let currentRowWidth = 0;
    let currentRowItemWidths: number[] = [];

    data.forEach((item: Datum) => {
      const percentage = total > 0 ? Math.round((Math.max(0, item.value || 0) / total) * 100) : 0;
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
  }, [data, chartWidth, totalHeight, isFullscreen, total]);

  // Bottom padding and startY for legend
  const effectiveLegendHeight = showLegend ? legendHeight : 0;
  const legendBottomMargin = showLegend ? 8 : 0;
  const legendTopPadding = (showLegend && legendRows.length > 0) ? 14 : 0;
  const legendStartY = showLegend
    ? Math.max(140, totalHeight - effectiveLegendHeight - legendBottomMargin)
    : totalHeight;

  // Available vertical space for the pie and labels strictly above the legend
  const availablePieHeight = showLegend ? (legendStartY - legendTopPadding) : totalHeight;
  const pieCy = Math.round(availablePieHeight / 2);

  // Callout box dimensions and offsets
  const boxWidth = isFullscreen ? 150 : 110;
  const boxHeight = isFullscreen ? 54 : 48;
  const basePushX = isFullscreen ? 36 : 24;
  const basePushY = isFullscreen ? 20 : 14;

  // Safe radius calculation: ensure pie + top callout + bottom callout fit comfortably
  const verticalAllowance = basePushY + boxHeight / 2 + 8;
  const maxRadiusVertical = Math.max(35, Math.min(pieCy - 10, (availablePieHeight - pieCy) - 8) - verticalAllowance);
  const maxRadiusHorizontal = Math.max(35, (chartWidth / 2) - basePushX - boxWidth - 10);

  const baseIdealRadius = isFullscreen 
    ? Math.min(chartWidth, totalHeight) * (showLegend ? 0.26 : 0.32)
    : (showLegend ? 85 : Math.min(chartWidth, totalHeight) * 0.30);
  const outerRadius = Math.max(45, Math.min(baseIdealRadius, maxRadiusVertical, maxRadiusHorizontal));
  const innerRadius = Math.round(outerRadius * (isFullscreen ? 0.62 : 0.60));

  // Precompute non-overlapping positions for visible callout data panels
  const boxPositionsMap = React.useMemo(() => {
    const map = new Map<string | number, {
      fx: number;
      fy: number;
      curBoxWidth: number;
      curBoxHeight: number;
    }>();

    if (!chartWidth || !data || data.length === 0 || total <= 0) return map;

    const RADIAN = Math.PI / 180;
    const pieCx = chartWidth / 2;
    let accumulatedAngle = 0;
    const anchorRadius = outerRadius + 30;

    interface Candidate {
      id: string | number;
      isLeft: boolean;
      fx: number;
      initialFy: number;
      fy: number;
    }

    const leftList: Candidate[] = [];
    const rightList: Candidate[] = [];

    data.forEach(item => {
      const val = Math.max(0, item.value || 0);
      const sliceSpan = (val / total) * 360;
      const midAngle = accumulatedAngle + sliceSpan / 2;
      accumulatedAngle += sliceSpan;

      const isTarget = (top4Ids && top4Ids.includes(item.id)) || item.id === lastOtherId;
      if (!isTarget) return;

      const rad = -midAngle * RADIAN;
      const x = pieCx + anchorRadius * Math.cos(rad);
      const y = pieCy + anchorRadius * Math.sin(rad);

      const isLeft = x < pieCx;
      const isTop = y < pieCy;

      const finalX = x + (isLeft ? -basePushX : basePushX);
      const finalY = y + (isTop ? -basePushY : basePushY);

      let fx = isLeft ? finalX - boxWidth : finalX;
      let fy = finalY - boxHeight / 2;

      // Safe horizontal clamping within chart container
      fx = Math.max(8, Math.min(fx, chartWidth - boxWidth - 8));

      const cand: Candidate = {
        id: item.id,
        isLeft,
        fx,
        initialFy: fy,
        fy,
      };

      if (isLeft) {
        leftList.push(cand);
      } else {
        rightList.push(cand);
      }
    });

    const resolveOverlap = (list: Candidate[]) => {
      if (list.length === 0) return;

      // Sort by initialFy ascending (top to bottom)
      list.sort((a, b) => a.initialFy - b.initialFy);

      const count = list.length;
      const minFy = 8;
      const maxFy = Math.max(minFy, legendStartY - boxHeight - 8);
      const availableSpan = Math.max(0, maxFy - minFy);

      let curBoxHeight = boxHeight;
      let minGap = isFullscreen ? 8 : 6;
      const neededSpan = count * curBoxHeight + (count - 1) * minGap;

      if (neededSpan > availableSpan && count > 1) {
        minGap = Math.max(3, Math.floor((availableSpan - count * 36) / (count - 1)));
        curBoxHeight = Math.max(34, Math.floor((availableSpan - (count - 1) * minGap) / count));
      }

      const step = curBoxHeight + minGap;

      // Initialize with clamped positions
      list.forEach(c => {
        c.fy = Math.max(minFy, Math.min(maxFy, c.initialFy));
      });

      // Forward pass: push down overlapping boxes
      for (let i = 1; i < count; i++) {
        if (list[i].fy < list[i - 1].fy + step) {
          list[i].fy = list[i - 1].fy + step;
        }
      }

      // Backward pass: if bottom box exceeds maxFy, push up
      if (list[count - 1].fy > maxFy) {
        list[count - 1].fy = maxFy;
        for (let i = count - 2; i >= 0; i--) {
          if (list[i].fy > list[i + 1].fy - step) {
            list[i].fy = list[i + 1].fy - step;
          }
        }
      }

      // Second forward pass: if top box was pushed above minFy
      if (list[0].fy < minFy) {
        list[0].fy = minFy;
        for (let i = 1; i < count; i++) {
          if (list[i].fy < list[i - 1].fy + step) {
            list[i].fy = list[i - 1].fy + step;
          }
        }
      }

      // Populate map
      list.forEach(c => {
        map.set(c.id, {
          fx: c.fx,
          fy: Math.round(c.fy),
          curBoxWidth: boxWidth,
          curBoxHeight,
        });
      });
    };

    resolveOverlap(leftList);
    resolveOverlap(rightList);

    return map;
  }, [chartWidth, data, total, top4Ids, lastOtherId, outerRadius, pieCy, isFullscreen, legendStartY, showLegend, basePushX, basePushY, boxWidth, boxHeight]);

  const renderCustomLabel = React.useCallback((props: any) => {
    let { x, y, cx, cy, name, value, percent, payload } = props;
    const datumId = payload?.payload?.id || payload?.id;
    let color = payload?.payload?.color || payload?.color || "#a1a1aa";
    
    if (name === undefined) name = payload?.payload?.label || payload?.label;
    if (value === undefined) value = payload?.payload?.value || payload?.value;
    if (percent === undefined && total > 0) percent = (value || 0) / total;

    if (top4Ids && !top4Ids.includes(datumId)) {
      if (datumId !== lastOtherId) return null;
      
      name = "Other";
      value = otherSum;
      percent = otherSum / total;
      color = isDark ? "#52525b" : "#a1a1aa";
    }

    const pos = boxPositionsMap.get(datumId);
    let fx: number;
    let fy: number;
    let curBoxWidth = boxWidth;
    let curBoxHeight = boxHeight;

    if (pos) {
      fx = pos.fx;
      fy = pos.fy;
      curBoxWidth = pos.curBoxWidth;
      curBoxHeight = pos.curBoxHeight;
    } else {
      const isLeft = x < cx;
      const isTop = y < cy;
      const finalX = x + (isLeft ? -basePushX : basePushX);
      const finalY = y + (isTop ? -basePushY : basePushY);
      fx = isLeft ? finalX - boxWidth : finalX;
      fy = finalY - boxHeight / 2;
      const maxAllowedY = (showLegend ? legendStartY : totalHeight) - boxHeight - 8;
      fx = Math.max(8, Math.min(fx, chartWidth - boxWidth - 8));
      fy = Math.max(8, Math.min(fy, maxAllowedY));
    }

    const safeName = String(name || '');
    const maxLen = isFullscreen ? 16 : 11;
    const displayName = safeName.length > maxLen ? safeName.substring(0, maxLen) + "..." : safeName;

    const textRow1Y = fy + Math.round(curBoxHeight * 0.38);
    const textRow2Y = fy + Math.round(curBoxHeight * 0.78);

    return (
      <g 
        key={`custom-label-${datumId}`}
        className="chart-global-label"
        style={{ 
          overflow: 'visible',
          transformOrigin: `${fx + curBoxWidth / 2}px ${fy + curBoxHeight / 2}px`
        }}
      >
        <rect 
          x={fx} 
          y={fy} 
          width={curBoxWidth} 
          height={curBoxHeight} 
          rx={6} 
          fill={bgColor} 
          stroke={borderColor}
          strokeWidth={1}
          className="shadow-sm"
        />
        <rect 
          x={fx} 
          y={fy} 
          width={4} 
          height={curBoxHeight} 
          fill={color} 
          rx={2} 
        />
        <text 
          x={fx + 10} 
          y={textRow1Y} 
          fill={textColor}
          fontSize={isFullscreen ? 13 : 11} 
          fontWeight="500"
          fontFamily="sans-serif"
        >
          {displayName}
        </text>
        <text 
          x={fx + 10} 
          y={textRow2Y} 
          fill={textMainColor}
          fontSize={isFullscreen ? 16 : 13} 
          fontWeight="700"
          fontFamily="sans-serif"
        >
          {Number(value || 0).toLocaleString()}
        </text>
        <text 
          x={fx + curBoxWidth - 8} 
          y={textRow2Y} 
          textAnchor="end"
          fill={textColor}
          fontSize={isFullscreen ? 14 : 11} 
          fontWeight="500"
          fontFamily="sans-serif"
        >
          {((percent || 0) * 100).toFixed(0)}%
        </text>
      </g>
    );
  }, [boxPositionsMap, basePushX, basePushY, boxWidth, boxHeight, legendStartY, showLegend, totalHeight, chartWidth, isFullscreen, isDark, bgColor, borderColor, textMainColor, textColor, top4Ids, lastOtherId, otherSum, total]);

  const renderSvgLegend = React.useCallback(() => {
    if (!showLegend || !chartWidth || !totalHeight || legendRows.length === 0) return null;

    const { fontSize, rectSize, gap, spacingY } = legendConfig;
    const startY = legendStartY;

    return (
      <g className="svg-legend">
        {legendRows.flatMap((row, rowIndex) => {
          let currentX = (chartWidth - row.width) / 2;

          return row.items.map((item, colIndex) => {
            const x = currentX;
            const y = startY + (rowIndex * spacingY);
            currentX += row.itemWidths[colIndex];

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
                  fontFamily="sans-serif"
                  style={{ pointerEvents: 'none' }}
                >
                  {item.label}: {Number(item.value || 0).toLocaleString()} ({total > 0 ? Math.round((Math.max(0, item.value || 0) / total) * 100) : 0}%)
                </text>
              </g>
            );
          });
        })}
      </g>
    );
  }, [showLegend, chartWidth, totalHeight, legendRows, legendHeight, legendConfig, legendStartY, textMainColor, total]);

  return (
    <div ref={setRefs} className="flex h-full w-full items-center justify-center flex-col overflow-hidden">
      <div className="relative w-full h-full">
        <InnerRechartsPie
          data={data}
          pieCy={pieCy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          isFullscreen={isFullscreen}
          renderCustomLabel={renderCustomLabel}
          top4Ids={top4Ids}
          targetFocusIndex={targetFocusIndex}
          renderSvgLegend={renderSvgLegend}
        />

        {showFactText && (
          <svg className="fact-text-overlay absolute inset-0" width="100%" height="100%" style={{ overflow: 'visible', pointerEvents: 'none' }}>
            <FactTextOverlay
              chartWidth={chartWidth}
              pieCy={pieCy}
              innerRadius={innerRadius}
              data={data}
              total={total}
              factIndex={factIndex}
              isFullscreen={isFullscreen}
              textColor={textColor}
              textMainColor={textMainColor}
              onFactIndexChange={onFactIndexChange}
              maxItem={maxItem}
              minItem={minItem}
            />
          </svg>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isFullscreen === nextProps.isFullscreen &&
    prevProps.showLegend === nextProps.showLegend &&
    prevProps.total === nextProps.total &&
    prevProps.data.length === nextProps.data.length &&
    prevProps.data.every((item, idx) => 
      item.id === nextProps.data[idx]?.id &&
      item.value === nextProps.data[idx]?.value &&
      item.label === nextProps.data[idx]?.label &&
      item.color === nextProps.data[idx]?.color
    ) &&
    
    prevProps.showFactText === nextProps.showFactText &&
    prevProps.factIndex === nextProps.factIndex
  );
});