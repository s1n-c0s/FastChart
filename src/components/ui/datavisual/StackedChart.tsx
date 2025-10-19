import type { Datum } from '@/types';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Cell 
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Maximize2 } from 'lucide-react';

interface StackedTooltipProps {
  active?: boolean;
  payload?: Array<{ name?: string; value: number } & Record<string, unknown>>;
  idToLabel: Map<string, string>;
  labelToId: Map<string, string>;
  idToValue: Map<string, number>;
  stackedSum: number;
}

function StackedTooltip({
  active,
  payload,
  idToLabel,
  labelToId,
  idToValue,
  stackedSum
}: StackedTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border bg-background p-2 text-xs shadow-sm">
      <div className="font-medium mb-1">All</div>
      <div className="space-y-0.5">
        {payload.map((p, idx) => {
          const maybeDataKey = (p as unknown as { dataKey?: string }).dataKey;
          const name = p.name ?? "";
          const id = maybeDataKey ?? labelToId.get(name) ?? name;
          const label = idToLabel.get(id) ?? id;
          const raw = idToValue.get(id) ?? 0;
          const percent = stackedSum > 0 ? (raw / stackedSum) * 100 : 0;
          return (
            <div
              key={idx}
              className="flex items-center justify-between gap-4"
            >
              <span>{label}</span>
              <span>
                {raw} ({percent.toFixed(1)}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface StackedChartProps {
  data: Datum[];
  stackedData: Record<string, number | string>[];
  isHorizontal: boolean;
  idToLabel: Map<string, string>;
  labelToId: Map<string, string>;
  idToValue: Map<string, number>;
  stackedSum: number;
  onOrientationChange: () => void;
  onCopySvg: () => void;
  onFullscreen: () => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function StackedChart({
  data,
  stackedData,
  isHorizontal,
  idToLabel,
  labelToId,
  idToValue,
  stackedSum,
  onOrientationChange,
  onCopySvg,
  onFullscreen,
  containerRef
}: StackedChartProps) {
  return (
    <div ref={containerRef} className="rounded-lg border p-4 h-[320px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-medium">100% Stacked Chart</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            aria-label="Toggle stacked chart orientation"
            onClick={onOrientationChange}
          >
            {isHorizontal ? "Vertical" : "Horizontal"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={onCopySvg}
            aria-label="Copy Stacked Chart as SVG"
          >
            Copy SVG
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={onFullscreen}
            aria-label="Open Stacked Chart in full screen"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart
          data={stackedData}
          stackOffset="expand"
          margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
          layout={isHorizontal ? "vertical" : "horizontal"}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          {isHorizontal ? (
            <>
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                axisLine={false}
              />
              <XAxis
                type="number"
                tickFormatter={(v) => `${Math.round((v as number) * 100)}%`}
                tickLine={false}
                axisLine={false}
              />
            </>
          ) : (
            <>
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={(v) => `${Math.round((v as number) * 100)}%`}
                tickLine={false}
                axisLine={false}
              />
            </>
          )}
          <Tooltip 
            content={
              <StackedTooltip 
                idToLabel={idToLabel}
                labelToId={labelToId}
                idToValue={idToValue}
                stackedSum={stackedSum}
              />
            } 
          />
          {data.map((d) => (
            <Bar key={d.id} dataKey={d.id} stackId="one" name={d.label}>
              <Cell fill={d.color} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}