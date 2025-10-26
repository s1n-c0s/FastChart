// ไฟล์: src/components/charts/area-gradient-chart.tsx

"use client";

import React, { useMemo } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import type { Datum } from '@/types';

export interface AreaGradientChartProps {
  data: Datum[];
  containerRef?: React.RefObject<HTMLDivElement>;
}

const AreaGradientChart = ({ 
  data, 
}: AreaGradientChartProps) => {
  
  const primaryColor = useMemo(() => data[0]?.color || '#3b82f6', [data]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
        <XAxis dataKey="label" stroke="#71717a" />
        <YAxis stroke="#71717a" />
        <Tooltip />
        
        <defs>
          <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={primaryColor} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={primaryColor} stopOpacity={0.0}/>
          </linearGradient>
        </defs>

        <Area 
          type="linear" // ⭐️ ทำให้เส้นเป็น "เส้นตรง" ระหว่างจุดข้อมูล
          dataKey="value" 
          stroke={primaryColor}
          fill="url(#colorGradient)"
          strokeWidth={2}
          name="Value"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default AreaGradientChart;