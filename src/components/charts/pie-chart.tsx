import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Pie, PieChart as RechartsPieChart, Cell, Tooltip, Label, ResponsiveContainer } from "recharts";
import type { TooltipProps } from "recharts";
import type { Datum } from "@/types";

export interface PieChartProps {
  data: Datum[];
  total: number;
  containerRef?: React.Ref<HTMLDivElement>;
  isFullscreen?: boolean;
  showLabels?: boolean;
  showLegend?: boolean;
  showFactText?: boolean;
  factIndex?: number;
  onFactIndexChange?: (index: number) => void;
}

const CustomTooltip = React.memo(({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload as Datum;
    return (
      <div className="rounded-lg border bg-popover p-2 text-sm shadow-md">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} />
          <span className="font-medium text-popover-foreground">{item.label}:</span>
          <span className="text-right font-bold text-popover-foreground">
            {Number(item.value || 0).toLocaleString()}
          </span>
        </div>
      </div>
    );
  }
  return null;
});



export const PieChart = React.memo(function PieChart({ data, total, containerRef, isFullscreen = false,  showLabels = false,
  showLegend = false,
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
    return () => observer.disconnect();
  }, []);

  const [size, setSize] = React.useState(() => {
    if (isFullscreen) {
      const minDimension = Math.min(window.innerWidth * 0.85, (window.innerHeight * 0.9) - 120);
      return Math.max(450, minDimension);
    }
    return 320; 
  });

  const [chartWidth, setChartWidth] = React.useState(size);
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
      setChartWidth(node.clientWidth);
      const observer = new ResizeObserver((entries) => {
        if (entries[0]) {
          setChartWidth(entries[0].contentRect.width);
        }
      });
      observer.observe(node);
      return () => observer.disconnect();
    }
  }, []);

  const textColor = "#71717a"; // muted-foreground
  const textMainColor = isDark ? "#fafafa" : "#09090b"; // foreground hex
  const bgColor = isDark ? "#18181b" : "#ffffff"; // popover hex
  const borderColor = isDark ? "#27272a" : "#e4e4e7"; // border hex

  const top4Ids = React.useMemo(() => {
    if (data.length <= 5) return null;
    return [...data].sort((a, b) => b.value - a.value).slice(0, 4).map(d => d.id);
  }, [data]);

  const otherSum = React.useMemo(() => {
    if (!top4Ids) return 0;
    return data.filter(d => !top4Ids.includes(d.id)).reduce((sum, d) => sum + d.value, 0);
  }, [data, top4Ids]);

  const lastOtherId = React.useMemo(() => {
    if (!top4Ids) return null;
    const others = data.filter(d => !top4Ids.includes(d.id));
    return others.length > 0 ? others[others.length - 1].id : null;
  }, [data, top4Ids]);

  const prevDataRef = React.useRef(data);
  if (prevDataRef.current !== data) {
    prevDataRef.current = data;
  }

  const renderCustomLabelLine = React.useCallback((props: any) => {
    const { payload, points } = props;
    
    if (top4Ids && !top4Ids.includes(payload.id)) {
      return null;
    }
    
    if (!points || points.length < 3) return null;
    
    const isLeft = points[2].x < points[0].x;
    const isTop = points[2].y < points[0].y;
    const basePushX = isFullscreen ? 45 : 25; // cleanly extends the horizontal line
    const basePushY = isFullscreen ? 30 : 15; // vertically push away from pie edge
    
    const newPoints = [
      points[0],
      { x: points[1].x, y: points[1].y + (isTop ? -basePushY : basePushY) },
      { x: points[2].x + (isLeft ? -basePushX : basePushX), y: points[2].y + (isTop ? -basePushY : basePushY) }
    ];
    
    return (
      <polyline
        points={newPoints.map((p: any) => `${p.x},${p.y}`).join(' ')}
        stroke={textColor}
        strokeWidth={1}
        fill="none"
        opacity={0.5}
      />
    );
  }, [top4Ids, textColor, isFullscreen]);

  const renderCustomLabel = React.useCallback((props: any) => {
    let { x, y, cx, cy, name, value, percent, payload } = props;
    let color = payload?.color || "#a1a1aa";
    
    if (top4Ids && !top4Ids.includes(payload.id)) {
      if (payload.id !== lastOtherId) return null;
      
      // Override for the 'Other' label box
      name = "Other";
      value = otherSum;
      percent = otherSum / total;
      color = isDark ? "#52525b" : "#a1a1aa";
    }
    const boxWidth = isFullscreen ? 160 : 110;
    const boxHeight = isFullscreen ? 56 : 52;
    const basePushX = isFullscreen ? 45 : 25;
    const basePushY = isFullscreen ? 30 : 15;
    const isLeft = x < cx;
    const isTop = y < cy;
    
    const finalX = x + (isLeft ? -basePushX : basePushX);
    const finalY = y + (isTop ? -basePushY : basePushY);
    
    const fx = isLeft ? finalX - boxWidth : finalX;
    const fy = finalY - boxHeight / 2;

    const safeName = String(name || '');
    const maxLen = isFullscreen ? 18 : 12;
    const displayName = safeName.length > maxLen ? safeName.substring(0, maxLen) + "..." : safeName;

    return (
      <g style={{ overflow: 'visible' }}>
        <rect 
          x={fx} 
          y={fy} 
          width={boxWidth} 
          height={boxHeight} 
          rx={6} 
          fill={bgColor}
          stroke={borderColor}
          strokeWidth={1}
        />
        <rect
          x={fx}
          y={fy}
          width={4}
          height={boxHeight}
          rx={2}
          fill={color}
        />
        <text 
          x={fx + 10} 
          y={fy + 20} 
          fill={textMainColor}
          fontSize={isFullscreen ? 15 : 13} 
          fontWeight="600"
          fontFamily="sans-serif"
        >
          {displayName}
        </text>
        <text 
          x={fx + 10} 
          y={fy + 40} 
          fill={textMainColor}
          fontSize={isFullscreen ? 17 : 14} 
          fontWeight="700"
          fontFamily="sans-serif"
        >
          {Number(value || 0).toLocaleString()}
        </text>
        <text 
          x={fx + boxWidth - 8} 
          y={fy + 40} 
          textAnchor="end"
          fill={textColor}
          fontSize={isFullscreen ? 15 : 13} 
          fontWeight="500"
          fontFamily="sans-serif"
        >
          {((percent || 0) * 100).toFixed(0)}%
        </text>
      </g>
    );
  }, [isFullscreen, isDark, bgColor, borderColor, textMainColor, textColor, top4Ids, lastOtherId, otherSum, total]);

  React.useEffect(() => {
    if (!isFullscreen) return;
    const handleResize = () => {
      const minDimension = Math.min(window.innerWidth * 0.85, (window.innerHeight * 0.9) - 120);
      setSize(Math.max(450, minDimension));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isFullscreen]);

  const { legendRows, legendHeight } = React.useMemo(() => {
    const width = chartWidth || size;
    const spacingY = 25;
    const rectSize = 14; 
    const gap = 8;
    const itemMargin = 20;
    
    const rows: { items: Datum[]; width: number; itemWidths: number[] }[] = [];
    let currentRow: Datum[] = [];
    let currentRowWidth = 0;
    let currentRowItemWidths: number[] = [];

    data.forEach((item: Datum) => {
      const labelText = `${item.label}: ${Number(item.value || 0).toLocaleString()}`;
      const textWidth = labelText.length * (isFullscreen ? 8.5 : 7.5); 
      const itemWidth = rectSize + gap + textWidth + itemMargin;
      const maxItemsPerRow = 4;

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
      legendHeight: rows.length * spacingY 
    };
  }, [data, chartWidth, size, isFullscreen]);

  const renderSvgLegend = () => {
    if (!chartWidth || !size || legendRows.length === 0) return null;

    const spacingY = 25;
    const rectSize = 14; 
    const gap = 8;
    
    const startY = size - legendHeight + 22;

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
                <rect x={x} y={y - 12} width={rectSize} height={rectSize} fill={item.color} rx={4} />
                <text
                  x={x + rectSize + gap}
                  y={y}
                  fill={textMainColor}
                  fontSize={isFullscreen ? 14 : 12}
                  fontWeight="500"
                  fontFamily="sans-serif"
                  style={{ pointerEvents: 'none' }}
                >
                  {item.label}: {Number(item.value || 0).toLocaleString()}
                </text>
              </g>
            );
          });
        })}
      </g>
    );
  };

  const pieCy = (size - legendHeight) / 2 - (showLabels ? (isFullscreen ? 50 : 35) : 0);

  return (
      <div ref={setRefs} className="flex h-full w-full items-center justify-center flex-col">
        <div className="flex-shrink-0 w-full" style={{ height: size }}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart style={{ overflow: 'visible' }}>
              <Tooltip content={<CustomTooltip />} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy={pieCy}
              innerRadius={showLabels ? size * 0.18 : size * 0.28}
              outerRadius={showLabels ? size * 0.26 : size * 0.42}
              paddingAngle={2}
              cornerRadius={6}
              isAnimationActive={true}
              stroke="none"
              label={showLabels ? renderCustomLabel : undefined}
              labelLine={showLabels ? (renderCustomLabelLine as any) : false}
            >
              {showFactText && (
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      const innerR = showLabels ? size * 0.18 : size * 0.28;
                      
                      const maxItem = data.length > 0 ? data.reduce((prev, current) => (prev.value > current.value) ? prev : current) : null;
                      const minItem = data.length > 0 ? data.reduce((prev, current) => (prev.value < current.value) ? prev : current) : null;
                      
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
                      
                      const handlePrev = (e: React.MouseEvent) => { 
                        e.stopPropagation(); 
                        if (onFactIndexChange) onFactIndexChange((factIndex - 1 + 3) % 3);
                      };
                      const handleNext = (e: React.MouseEvent) => { 
                        e.stopPropagation(); 
                        if (onFactIndexChange) onFactIndexChange((factIndex + 1) % 3);
                      };

                      return (
                        <g className="group">
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle" className="pointer-events-none select-none">
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) - (isFullscreen ? 25 : 18)}
                              fill={textColor} 
                              fontSize={isFullscreen ? 16 : 12}
                              fontWeight="500"
                            >
                              {factTitle}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + (isFullscreen ? 15 : 10)}
                              fill={factColor}
                              fontSize={isFullscreen ? 36 : 22}
                              fontWeight="bold" 
                            >
                              {factValue}
                            </tspan>
                            {factLabel && (
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + (isFullscreen ? 45 : 28)}
                                fill={factColor}
                                fontSize={isFullscreen ? 14 : 11}
                                fontWeight="500"
                                opacity={0.8}
                              >
                                {factLabel}
                              </tspan>
                            )}
                          </text>
                          
                          {/* Prev Button */}
                          <svg 
                            x={(viewBox.cx || 0) - (innerR * 0.65) + (isFullscreen ? 10 : 5)} 
                            y={(viewBox.cy || 0) - 16} 
                            width={32} height={32} 
                            onClick={handlePrev} 
                            className="opacity-0 group-hover:opacity-100 cursor-pointer pointer-events-auto text-muted-foreground transition-opacity"
                            color="currentColor"
                            data-hide-on-copy="true"
                          >
                            <rect width="32" height="32" fill="transparent" />
                            <ChevronLeft x={4} y={4} width={24} height={24} strokeWidth={2.5} />
                          </svg>

                          {/* Next Button */}
                          <svg 
                            x={(viewBox.cx || 0) + (innerR * 0.65) - (isFullscreen ? 42 : 37)} 
                            y={(viewBox.cy || 0) - 16} 
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
                      );
                    }
                    return null;
                  }}
                />
              )}
              {data.map((item: Datum) => (
                <Cell key={item.id} fill={item.color} stroke="none" />
              ))}
            </Pie>
            
            {/* Black Overlay Pie for 'Other' slices */}
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy={pieCy}
              innerRadius={showLabels ? size * 0.18 : size * 0.28}
              outerRadius={showLabels ? size * 0.26 : size * 0.42}
              paddingAngle={2}
              cornerRadius={6}
              isAnimationActive={true}
              stroke="none"
              style={{ pointerEvents: 'none' }}
            >
              {data.map((item: Datum) => {
                const isOther = top4Ids && !top4Ids.includes(item.id);
                return (
                  <Cell 
                    key={`overlay-${item.id}`} 
                    fill={isOther ? "rgba(0,0,0,0.3)" : "transparent"} 
                    stroke="none" 
                  />
                );
              })}
            </Pie>
            
            {showLegend && renderSvgLegend()}
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // ... (memo comparison คงเดิม)
  return (
    prevProps.isFullscreen === nextProps.isFullscreen &&
    prevProps.total === nextProps.total &&
    prevProps.data.length === nextProps.data.length &&
    prevProps.data.every((item, idx) => 
      item.id === nextProps.data[idx]?.id &&
      item.value === nextProps.data[idx]?.value &&
      item.color === nextProps.data[idx]?.color
    ) &&
    prevProps.showLabels === nextProps.showLabels &&
    prevProps.showLegend === nextProps.showLegend &&
    prevProps.showFactText === nextProps.showFactText &&
    prevProps.factIndex === nextProps.factIndex
  );
});