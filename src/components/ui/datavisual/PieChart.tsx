import type { Datum } from '@/types';

import { 
  ResponsiveContainer, 
  PieChart as RechartsParChart, 
  Pie,
  Cell,
  Label,
  Tooltip
} from 'recharts';

export interface PieChartProps {
  data: Datum[];
  total: number;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function PieChart({
  data,
  total,
  containerRef
}: PieChartProps) {
  return (
    <div ref={containerRef} className="h-[380px]">
      <ResponsiveContainer width="100%" height="90%">
        <RechartsParChart>
          <Tooltip />
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
            strokeWidth={5}
          >
            {data.map((entry) => (
              <Cell key={entry.id} fill={entry.color} />
            ))}

            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy}
                        className="fill-foreground text-2xl font-bold"
                      >
                        {total.toLocaleString()}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 24}
                        className="fill-muted-foreground text-sm"
                      >
                        Total
                      </tspan>
                    </text>
                  );
                }
              }}
            />
          </Pie>
        </RechartsParChart>
      </ResponsiveContainer>
    </div>
  );
}