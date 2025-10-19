import type { Datum } from '@/types';
import { 
  ResponsiveContainer, 
  LineChart as RechartsLineChart, 
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Maximize2 } from 'lucide-react';

export interface LineChartProps {
  data: Datum[];
  margin?: { top: number; right: number; bottom: number; left: number };
  onCopySvg: () => void;
  onFullscreen: () => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function LineChart({
  data,
  margin = { top: 8, right: 16, bottom: 8, left: 0 },
  onCopySvg,
  onFullscreen,
  containerRef
}: LineChartProps) {
  return (
    <div ref={containerRef} className="rounded-lg border p-4 h-[320px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-medium">Line Chart - Linear</h3>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={onCopySvg}
            aria-label="Copy Line Chart as SVG"
          >
            Copy SVG
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={onFullscreen}
            aria-label="Open Line Chart in full screen"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <RechartsLineChart
          data={data}
          margin={margin}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip />
          <Line
            type="linear"
            dataKey="value"
            stroke="oklch(0.488 0.243 264.376)"
            strokeWidth={2}
            dot={false}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}