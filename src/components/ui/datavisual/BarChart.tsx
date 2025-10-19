import type { Datum } from '@/types';
import { 
  ResponsiveContainer, 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Cell
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Maximize2 } from 'lucide-react';

export interface BarChartProps {
  data: Datum[];
  isHorizontal: boolean;
  margin?: { top: number; right: number; bottom: number; left: number };
  onOrientationChange: () => void;
  onCopySvg: () => void;
  onFullscreen: () => void;
  containerRef: React.RefObject<HTMLDivElement>;
  children?: React.ReactNode;
}

export function BarChart({
  data,
  isHorizontal,
  margin = { top: 8, right: 16, bottom: 8, left: 0 },
  onOrientationChange,
  onCopySvg,
  onFullscreen,
  containerRef,
  children
}: BarChartProps) {
  return (
    <div ref={containerRef} className="rounded-lg border p-4 h-[380px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-medium">Bar Chart</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            aria-label="Toggle bar chart orientation"
            onClick={onOrientationChange}
          >
            {isHorizontal ? "Vertical" : "Horizontal"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={onCopySvg}
            aria-label="Copy Bar Chart as SVG"
          >
            Copy SVG
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={onFullscreen}
            aria-label="Open Bar Chart in full screen"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <RechartsBarChart
          data={data}
          margin={margin}
          layout={isHorizontal ? "horizontal" : "vertical"}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          {isHorizontal ? (
            <>
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
            </>
          ) : (
            <>
              <XAxis type="number" tickLine={false} axisLine={false} />
              <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} />
            </>
          )}
          <Tooltip />
          <Bar dataKey="value" radius={isHorizontal ? [6, 6, 0, 0] : [0, 6, 6, 0]}>
            {data.map((entry) => (
              <Cell key={entry.id} fill={entry.color} />
            ))}
          </Bar>
          {children}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}