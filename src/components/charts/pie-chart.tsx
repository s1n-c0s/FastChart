import * as React from "react";
import { Pie, PieChart as RechartsPieChart, Cell, Tooltip } from "recharts";
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
          <div
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          <span className="font-medium text-popover-foreground">
            {item.label}:
          </span>
          <span className="text-right font-bold text-popover-foreground">
            {item.value.toLocaleString()}
          </span>
        </div>
      </div>
    );
  }

  return null;
});

CustomTooltip.displayName = "CustomTooltip";

export const PieChart = React.memo(function PieChart({ data, total, containerRef, isFullscreen = false }: PieChartProps) {
  // Calculate size based on fullscreen mode with responsive sizing
  const [size, setSize] = React.useState(() => {
    if (isFullscreen) {
      const minDimension = Math.min(window.innerWidth * 0.6, window.innerHeight * 0.6);
      return Math.max(400, minDimension);
    }
    return 250;
  });

  // Handle window resize for fullscreen mode
  React.useEffect(() => {
    if (!isFullscreen) return;

    const handleResize = () => {
      const minDimension = Math.min(window.innerWidth * 0.6, window.innerHeight * 0.6);
      setSize(Math.max(400, minDimension));
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial calculation

    return () => window.removeEventListener('resize', handleResize);
  }, [isFullscreen]);

  // Optimized animation duration - faster for better performance
  const animationDuration = React.useMemo(() => {
    return isFullscreen ? 600 : 800;
  }, [isFullscreen]);

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full items-center justify-center flex-col"
    >
      <div className="flex-shrink-0" style={{ width: size, height: size }}>
        <RechartsPieChart width={size} height={size}>
          <Tooltip content={<CustomTooltip />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={isFullscreen ? size * 0.24 : 60}
            outerRadius={isFullscreen ? size * 0.4 : 100}
            paddingAngle={2}
            cornerRadius={6}
            labelLine={false}
            isAnimationActive={true}
            animationDuration={animationDuration}
            animationEasing="ease-out"
            label={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                return (
                  <>
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className={`fill-foreground font-bold ${isFullscreen ? 'text-5xl' : 'text-2xl'}`}
                    >
                      {total.toLocaleString()}
                    </text>
                    <text
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + (isFullscreen ? 40 : 24)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className={`fill-muted-foreground ${isFullscreen ? 'text-lg' : 'text-sm'}`}
                    >
                      Total
                    </text>
                  </>
                );
              }
              return null;
            }}
          >
            {data.map((item: Datum) => (
              <Cell key={item.id} fill={item.color} />
            ))}
          </Pie>
        </RechartsPieChart>
      </div>

      {/* Legend: Center-aligned, Wrapping, Within Card Boundaries */}
      <div 
        className={`w-full ${isFullscreen ? 'mt-6' : 'mt-4'} 
                   flex 
                   flex-wrap
                   justify-center
                   items-center
                   gap-x-3 gap-y-2 
                   px-2
                   overflow-hidden`}
      >
        {data.map((item: Datum) => (
          <div 
            key={`${item.id}-${item.label}`} 
            className="flex items-center gap-1.5 flex-shrink-0"
          >
            <div
              className={`${isFullscreen ? 'h-4 w-4' : 'h-3 w-3'} rounded-sm flex-shrink-0`}
              style={{ backgroundColor: item.color }}
            />
            <span 
              className={`${isFullscreen ? 'text-sm' : 'text-xs'} font-medium text-foreground whitespace-nowrap`} 
              title={item.label}
            >
              {item.label}
            </span>
          </div>
        ))}
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
  )
})