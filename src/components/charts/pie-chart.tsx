import * as React from "react";
import { Pie, PieChart as RechartsPieChart, Cell, Tooltip, Label } from "recharts";
import type { TooltipProps } from "recharts";
import type { Datum } from "@/types";

export interface PieChartProps {
  data: Datum[];
  total: number;
  containerRef?: React.RefObject<HTMLDivElement>;
  isFullscreen?: boolean;
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

export const PieChart = React.memo(function PieChart({ data, total, containerRef, isFullscreen = false }: PieChartProps) {
  // กำหนดสีตัวอักษรให้คงที่ (หรือใช้การเช็ค Dark Mode จากตัวแปรอื่นถ้าต้องการ)
  const textColor = "#71717a"; // muted-foreground
  const textMainColor = "currentColor"; // จะใช้สีปัจจุบันของระบบ หรือระบุเป็น #000000 / #ffffff
  // 1. เพิ่มความสูง (height) เพื่อเผื่อพื้นที่ให้ Legend ด้านล่างภายใน SVG
  const [size, setSize] = React.useState(() => {
    if (isFullscreen) {
      const minDimension = Math.min(window.innerWidth * 0.7, window.innerHeight * 0.7);
      return Math.max(450, minDimension);
    }
    return 320; // เพิ่มจาก 250 เพื่อให้มีที่วาง Legend
  });

  React.useEffect(() => {
    if (!isFullscreen) return;
    const handleResize = () => {
      const minDimension = Math.min(window.innerWidth * 0.7, window.innerHeight * 0.7);
      setSize(Math.max(450, minDimension));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isFullscreen]);

  // 2. ฟังก์ชันวาด Legend ภายใน SVG ให้จัดวางตรงกลาง
  // ฟังก์ชันวาด Legend ภายใน SVG โดยกำหนดให้มี 5 รายการต่อแถว
  const renderSvgLegend = () => {
    const spacingY = 25;
    const rectSize = 12;
    const gap = 8;
    const itemMargin = 20;
    
    const rows: { items: Datum[]; width: number; itemWidths: number[] }[] = [];
    let currentRow: Datum[] = [];
    let currentRowWidth = 0;
    let currentRowItemWidths: number[] = [];

    data.forEach((item) => {
      // ปรับการคำนวณความกว้างให้แม่นยำขึ้นตาม Font Size จริง
      const textWidth = item.label.length * (isFullscreen ? 8 : 7); 
      const itemWidth = rectSize + gap + textWidth + itemMargin;

      if (currentRowWidth + itemWidth - itemMargin > size && currentRow.length > 0) {
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

    const startY = size - (rows.length * spacingY) + 5;

    return rows.flatMap((row, rowIndex) => {
      let currentX = (size - row.width) / 2;

      return row.items.map((item, colIndex) => {
        const x = currentX;
        const y = startY + (rowIndex * spacingY);
        currentX += row.itemWidths[colIndex];

        return (
          <g key={`svg-leg-${item.id}`}>
            <rect x={x} y={y - 10} width={rectSize} height={rectSize} fill={item.color} rx={2} />
            <text
              x={x + rectSize + gap}
              y={y}
              fill={textMainColor} // ใช้ Inline Attribute แทน Class
              fontSize={isFullscreen ? 14 : 11} // ระบุ Size ชัดเจน
              fontWeight="500" // กำหนดความหนา (Medium)
              fontFamily="sans-serif"
              style={{ pointerEvents: 'none' }}
            >
              {item.label}
            </text>
          </g>
        );
      });
    });
  };

  return (
    <div ref={containerRef} className="flex h-full w-full items-center justify-center flex-col">
      <div className="flex-shrink-0" style={{ width: size, height: size }}>
        <RechartsPieChart width={size} height={size}>
          <Tooltip content={<CustomTooltip />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="40%"
            innerRadius={isFullscreen ? size * 0.24 : 60}
            outerRadius={isFullscreen ? size * 0.4 : 100}
            paddingAngle={2}
            cornerRadius={6}
            isAnimationActive={true}
          >
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) - (isFullscreen ? 50 : 30)}
                        fill={textColor} // กำหนดสี Muted
                        fontSize={isFullscreen ? 18 : 14}
                      >
                        Total
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + (isFullscreen ? 10 : 5)}
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
    )
  );
});