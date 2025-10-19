import type { Datum } from '@/types';
import { 
  ResponsiveContainer, 
  PieChart as RechartsParChart, 
  Pie,
  Cell,
  Label,
  Tooltip
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Maximize2 } from 'lucide-react';

export interface PieChartProps {
  data: Datum[];
  total: number;
  onCopySvg: () => void;
  onFullscreen: () => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function PieChart({
  data,
  total,
  onCopySvg,
  onFullscreen,
  containerRef
}: PieChartProps) {
  return (
    <div ref={containerRef} className="rounded-lg border p-4 h-[380px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-medium">
          Pie Chart - Donut with Total
        </h3>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={onCopySvg}
            aria-label="Copy Pie Chart as SVG"
          >
            Copy SVG
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={onFullscreen}
            aria-label="Open Pie Chart in full screen"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
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