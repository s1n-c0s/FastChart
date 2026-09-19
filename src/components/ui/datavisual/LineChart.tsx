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
export interface LineChartProps {
  data: Datum[];
  margin?: { top: number; right: number; bottom: number; left: number };
  containerRef: React.RefObject<HTMLDivElement>;
}

export function LineChart({
  data,
  margin = { top: 8, right: 16, bottom: 8, left: 0 },
  containerRef
}: LineChartProps) {
  return (
    <div ref={containerRef} className="h-[320px]">
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