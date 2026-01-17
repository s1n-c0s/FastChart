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
    const itemsPerRow = 5; // เปลี่ยนจากเดิม (3 หรือ 4) เป็น 5 รายการต่อแถว
    const rowCount = Math.ceil(data.length / itemsPerRow);
    const spacingY = 25;
    const rectSize = 12;
    const gap = 8;
    
    // คำนวณจุดเริ่มต้น Y ของกลุ่ม Legend ทั้งหมดให้อยู่ท้าย Chart
    const startY = size - (rowCount * spacingY) + 5;

    return data.map((item, index) => {
      const row = Math.floor(index / itemsPerRow);
      const col = index % itemsPerRow;
      
      // คำนวณจำนวนไอเทมที่มีจริงในแถวปัจจุบัน (เพื่อใช้จัดกึ่งกลางแถวสุดท้าย)
      const itemsInThisRow = Math.min(itemsPerRow, data.length - row * itemsPerRow);
      
      // คำนวณความกว้างเฉลี่ยต่อช่องในแถวนั้นๆ
      const colWidth = size / itemsInThisRow;
      
      // หาจุดกึ่งกลางของช่อง (Center X)
      const centerX = col * colWidth + (colWidth / 2);
      
      // กะระยะความกว้างของข้อความโดยประมาณ (ใช้ 6px ต่อตัวอักษร)
      const textEstimate = item.label.length * 6;
      const totalItemWidth = rectSize + gap + textEstimate;
      
      // คำนวณจุดเริ่ม X ของแต่ละไอเทมเพื่อให้เซต (Square + Text) อยู่กลาง centerX
      const startX = centerX - (totalItemWidth / 2);

      return (
        <g key={`svg-leg-${item.id}`}>
          <rect 
            x={startX} 
            y={startY + (row * spacingY) - 10} 
            width={rectSize} 
            height={rectSize} 
            fill={item.color} 
            rx={2} 
          />
          <text
            x={startX + rectSize + gap}
            y={startY + (row * spacingY)}
            fontSize={isFullscreen ? 14 : 11}
            className="fill-foreground font-medium"
            textAnchor="start"
            style={{ pointerEvents: 'none' }}
          >
            {/* ตัดคำถ้าชื่อยาวเกินไปเพื่อไม่ให้ชนกัน */}
            {item.label.length > 12 ? `${item.label.slice(0, 10)}...` : item.label}
          </text>
        </g>
      );
    });
  };

  return (
    <div ref={containerRef} className="flex h-full w-full items-center justify-center">
      <div className="flex-shrink-0" style={{ width: size, height: size }}>
        <RechartsPieChart width={size} height={size}>
          <Tooltip content={<CustomTooltip />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="40%" // ขยับวงกลมขึ้นด้านบนเล็กน้อย
            innerRadius={isFullscreen ? size * 0.22 : 55}
            outerRadius={isFullscreen ? size * 0.35 : 90}
            paddingAngle={2}
            cornerRadius={6}
            isAnimationActive={true}
          >
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan x={viewBox.cx} y={(viewBox.cy || 0) - (isFullscreen ? 30 : 20)} className="fill-muted-foreground text-xs">Total</tspan>
                      <tspan x={viewBox.cx} y={(viewBox.cy || 0) + (isFullscreen ? 15 : 10)} className={`fill-foreground font-bold ${isFullscreen ? 'text-5xl' : 'text-2xl'}`}>
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
          
          {/* Legend ถูกวาดที่นี่ (ภายใน SVG) */}
          {renderSvgLegend()}
        </RechartsPieChart>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
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