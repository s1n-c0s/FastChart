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

export interface BarChartProps {
  data: Datum[];
  isHorizontal: boolean;
  margin?: { top: number; right: number; bottom: number; left: number };
  containerRef: React.RefObject<HTMLDivElement>;
  children?: React.ReactNode;
}

export function BarChart({
  data,
  isHorizontal,
  margin = { top: 8, right: 16, bottom: 8, left: 0 },
  containerRef,
  children
}: BarChartProps) {
  return (
    <div ref={containerRef} className="h-[380px]">
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