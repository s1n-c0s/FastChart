import * as React from "react";
import { Pie, PieChart as RechartsPieChart, Cell } from "recharts";
import type { Datum } from "@/types";

export interface PieChartProps {
  data: Datum[]; // ✅ ถูกต้อง: กำหนดชื่อ property เป็น `data`
  total: number;
  containerRef?: React.RefObject<HTMLDivElement>;
}

export function PieChart({ data, total, containerRef }: PieChartProps) {
  return (
    <div
      ref={containerRef}
      className="flex h-full w-full items-center justify-center"
    >
      <div className="relative h-[250px] w-[250px]">
        <RechartsPieChart width={250} height={250}>
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

        {/* Legend below */}
        <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 translate-y-4 flex-wrap justify-center gap-4">
          {data.map((item: Datum) => (
            <div key={item.id} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs font-medium text-foreground">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}