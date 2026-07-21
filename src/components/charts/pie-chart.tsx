import * as React from "react";
import { Pie, PieChart as RechartsPieChart, Cell, Tooltip, Label, ResponsiveContainer, Legend } from "recharts";
import type { TooltipProps } from "recharts";
import type { Datum } from "@/types";

export interface PieChartProps {
  data: Datum[];
  total: number;
  containerRef?: React.RefObject<HTMLDivElement>;
  isFullscreen?: boolean;
  showLabels?: boolean;
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
            {item.value.toLocaleString()}
          </span>
        </div>
      </div>
    );
  }
  return null;
});



export const PieChart = React.memo(function PieChart({ data, total, containerRef, isFullscreen = false, showLabels = false }: PieChartProps) {
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
      const minDimension = Math.min(window.innerWidth * 0.7, window.innerHeight * 0.7);
      return Math.max(450, minDimension);
    }
    return 320; 
  });

  const [chartWidth, setChartWidth] = React.useState(size);

  React.useEffect(() => {
    if (containerRef && 'current' in containerRef && containerRef.current) {
      setChartWidth(containerRef.current.clientWidth);
      const observer = new ResizeObserver((entries) => {
        if (entries[0]) {
          setChartWidth(entries[0].contentRect.width);
        }
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, [containerRef]);

  const textColor = "#71717a"; // muted-foreground
  const textMainColor = isDark ? "#fafafa" : "#09090b"; // foreground hex
  const bgColor = isDark ? "#18181b" : "#ffffff"; // popover hex
  const borderColor = isDark ? "#27272a" : "#e4e4e7"; // border hex

  const renderCustomLabel = React.useCallback((props: any) => {
    const { x, y, cx, name, value, fill, percent } = props;
    const isLeft = x < cx;
    
    const boxWidth = isFullscreen ? 160 : 110;
    const boxHeight = isFullscreen ? 56 : 52;
    
    const fx = isLeft ? x - boxWidth : x;
    const fy = y - boxHeight / 2;

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
          fill={fill}
        />
        <text 
          x={fx + 10} 
          y={fy + 20} 
          fill={textMainColor}
          fontSize={isFullscreen ? 13 : 11} 
          fontWeight="600"
          fontFamily="sans-serif"
        >
          {displayName}
        </text>
        <text 
          x={fx + 10} 
          y={fy + 40} 
          fill={textMainColor}
          fontSize={isFullscreen ? 14 : 11} 
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
          fontSize={isFullscreen ? 13 : 11} 
          fontWeight="500"
          fontFamily="sans-serif"
        >
          {((percent || 0) * 100).toFixed(0)}%
        </text>
      </g>
    );
  }, [isFullscreen, isDark, bgColor, borderColor, textMainColor, textColor]);

  React.useEffect(() => {
    if (!isFullscreen) return;
    const handleResize = () => {
      const minDimension = Math.min(window.innerWidth * 0.7, window.innerHeight * 0.7);
      setSize(Math.max(450, minDimension));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isFullscreen]);

  // Removed manual legend calculation in favor of Recharts Legend

  const renderSvgLegend = () => {
    const width = chartWidth;
    const height = size;
    if (!width || !height) return null;

    const spacingY = 25;
    const rectSize = 14; 
    const gap = 8;
    const itemMargin = 20;
    
    const rows: { items: Datum[]; width: number; itemWidths: number[] }[] = [];
    let currentRow: Datum[] = [];
    let currentRowWidth = 0;
    let currentRowItemWidths: number[] = [];

    data.forEach((item: Datum) => {
      const labelText = `${item.label}: ${item.value.toLocaleString()}`;
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

    const startY = height - (rows.length * spacingY) + 5;

    return (
      <g className="svg-legend">
        {rows.flatMap((row, rowIndex) => {
          let currentX = (width - row.width) / 2;

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
                  {item.label}: {item.value.toLocaleString()}
                </text>
              </g>
            );
          });
        })}
      </g>
    );
  };

  return (
    <div ref={containerRef} className="flex h-full w-full items-center justify-center flex-col">
      <div className="flex-shrink-0 w-full" style={{ height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart style={{ overflow: 'visible' }}>
            <Tooltip content={<CustomTooltip />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={isFullscreen ? (showLabels ? size * 0.18 : size * 0.24) : (showLabels ? 45 : 60)}
              outerRadius={isFullscreen ? (showLabels ? size * 0.28 : size * 0.4) : (showLabels ? 75 : 100)}
              paddingAngle={2}
              cornerRadius={6}
            isAnimationActive={true}
            label={showLabels ? renderCustomLabel : false}
            labelLine={showLabels ? { stroke: textColor, strokeWidth: 1, opacity: 0.5 } : false}
          >
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) - (isFullscreen ? 25 : 15)}
                        fill={textColor} // กำหนดสี Muted
                        fontSize={isFullscreen ? 18 : 14}
                      >
                        Total
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + (isFullscreen ? 20 : 12)}
                        fill={textMainColor}
                        fontSize={isFullscreen ? 48 : 24}
                        fontWeight="bold" // กำหนดความหนา Bold ชัดเจน
                      >
                        {total.toLocaleString()}
                      </tspan>
                    </text>
                  );
                }
                return null;
              }}
            />
            {data.map((item: Datum) => (
              <Cell key={item.id} fill={item.color} stroke="none" />
            ))}
          </Pie>
          {renderSvgLegend()}
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
    prevProps.showLabels === nextProps.showLabels
  );
});