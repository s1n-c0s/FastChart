import * as React from "react";
import { Pie, PieChart as RechartsPieChart, Cell, Tooltip } from "recharts";
import type { TooltipProps } from "recharts";
import type { Datum } from "@/types";

export interface PieChartProps {
  data: Datum[];
  total: number;
  containerRef?: React.RefObject<HTMLDivElement>;
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

export const PieChart = React.memo(function PieChart({ data, total, containerRef }: PieChartProps) {
  return (
    <div
      ref={containerRef}
      className="flex h-full w-full items-center justify-center"
    >
      <div className="relative h-[250px] w-[250px]">
        <RechartsPieChart width={250} height={250}>
          <Tooltip content={<CustomTooltip />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            cornerRadius={6}
            labelLine={false}
            label={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                return (
                  <>
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-foreground text-2xl font-bold"
                    >
                      {total.toLocaleString()}
                    </text>
                    <text
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 24}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-muted-foreground text-sm"
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

        {/* Legend: No Wrap, Center Alignment, Allow Overflow */}
        <div 
          className="absolute top-full left-1/2 -translate-x-1/2 mt-4 
                     flex 
                     justify-center 
                     gap-x-4 p-0.5" 
        >
          {data.map((item: Datum) => (
            <div 
              key={item.id} 
              className="flex items-center gap-2 flex-shrink-0"
            >
              <div
                className="h-3 w-3 rounded-sm flex-shrink-0" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs font-medium text-foreground whitespace-nowrap">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.total === nextProps.total &&
    prevProps.data.length === nextProps.data.length &&
    prevProps.data.every((item, idx) => 
      item.id === nextProps.data[idx]?.id &&
      item.value === nextProps.data[idx]?.value &&
      item.color === nextProps.data[idx]?.color
    )
  )
})