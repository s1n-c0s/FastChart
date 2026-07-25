import * as React from "react";
import { Sankey, Tooltip, ResponsiveContainer, Layer, Rectangle } from "recharts";

// Interfaces for better type safety
export interface FlowNode {
  name: string;
  color?: string;
  value?: number;
  x?: number;
  y?: number;
  dx?: number;
  dy?: number;
}

export interface FlowLink {
  source: number;
  target: number;
  value: number;
}

// Internal type for Recharts Sankey props
interface SankeyNodeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  payload: FlowNode;
  containerWidth: number;
  totalValue: number;
}

const DEFAULT_NODES: FlowNode[] = [
  { name: "Income" }, { name: "Savings" }, { name: "Expenses" }, { name: "Rent" }, { name: "Food" },
];

const DEFAULT_LINKS: FlowLink[] = [
  { source: 0, target: 1, value: 2000 }, { source: 0, target: 2, value: 3000 },
  { source: 2, target: 3, value: 1500 }, { source: 2, target: 4, value: 1500 },
];

interface FlowChartProps {
  nodes?: FlowNode[];
  links?: FlowLink[];
  height?: number;
  nodeWidth?: number;
  nodePadding?: number;
}

/**
 * Custom Node component fixed for TS errors and ESLint
 */
const renderCustomNode = (props: SankeyNodeProps) => {
  const { x, y, width, height, index, payload, containerWidth, totalValue } = props;
  
  // FIX: Returning <g /> instead of null satisfies TS requirement for ReactElement
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return <g />;
  }

  const isOut = x + width + 100 > containerWidth;
  const percentage = totalValue > 0 ? ((payload.value! / totalValue) * 100).toFixed(0) : 0;

  return (
    <Layer key={`sankey-node-${payload.name}-${index}`}>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={payload.color || "#3b82f6"}
        fillOpacity={0.9}
        rx={2}
      />
      <text
        x={isOut ? x - 10 : x + width + 10}
        y={y + height / 2}
        textAnchor={isOut ? "end" : "start"}
        fontSize="12"
        className="fill-foreground select-none"
      >
        <tspan x={isOut ? x - 10 : x + width + 10} fontWeight="600" dy="-0.2em">
          {payload.name}
        </tspan>
        <tspan 
          x={isOut ? x - 10 : x + width + 10} 
          dy="1.4em" 
          fontSize="11" 
          fill="currentColor" 
          opacity="0.65"
          fontWeight="medium"
        >
          {payload.value?.toLocaleString()} ({percentage}%)
        </tspan>
      </text>
    </Layer>
  );
};

const PALETTE = ["#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#8b5cf6", "#06b6d4"];

export function FlowChart({ 
  nodes = DEFAULT_NODES, 
  links = DEFAULT_LINKS, 
  height = 400, 
  nodeWidth = 20, 
  nodePadding = 16 
}: FlowChartProps) {
  
  const safeNodes = React.useMemo(() => 
    Array.isArray(nodes) ? nodes : DEFAULT_NODES, 
  [nodes]);

  const safeLinks = React.useMemo(() => 
    Array.isArray(links)
      ? links.filter((l) => typeof l.source === "number" && typeof l.target === "number" && isFinite(l.value))
      : DEFAULT_LINKS,
  [links]);

  const coloredNodes = React.useMemo(() => 
    safeNodes.map((n, i) => ({ ...n, color: PALETTE[i % PALETTE.length] })),
  [safeNodes]);

  const sankeyData = React.useMemo(() => 
    ({ nodes: coloredNodes, links: safeLinks }),
  [coloredNodes, safeLinks]);

  const totalValue = React.useMemo(() => 
    safeLinks.reduce((acc, link) => acc + (link.value || 0), 0), 
  [safeLinks]);

  if (coloredNodes.length === 0 || safeLinks.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">No data available.</div>;
  }

  // Properly typed Tooltip props
  const sankeyTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0].payload;
    const isNode = item.name && item.value !== undefined && item.source === undefined;
    const from = isNode ? null : coloredNodes[item.source]?.name;
    const to = isNode ? null : coloredNodes[item.target]?.name;
    const val = item.value;
    const perc = totalValue > 0 ? ((val / totalValue) * 100).toFixed(1) : 0;

    return (
      <div className="bg-background/95 backdrop-blur-sm border rounded-xl p-3 shadow-2xl min-w-[140px]">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2 border-b pb-1">
          {isNode ? "Node Details" : "Flow Path"}
        </div>
        {!isNode && (
          <div className="flex items-center gap-2 mb-2 text-xs font-medium">
            <span className="text-foreground">{from}</span>
            <span className="text-muted-foreground">→</span>
            <span className="text-foreground">{to}</span>
          </div>
        )}
        {isNode && <div className="text-xs font-bold mb-2">{item.name}</div>}
        <div className="flex justify-between items-end gap-4">
          <div className="text-lg font-mono font-bold text-primary">
            {val.toLocaleString()}
          </div>
          <div className="text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {perc}%
          </div>
        </div>
      </div>
    );
  };

  return (
    // Replaced inline style with className or a minimal style object
    <div className="w-full h-full" style={{ minHeight: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={sankeyData}
          nodeWidth={nodeWidth}
          nodePadding={nodePadding}
          node={(nodeProps: any) => renderCustomNode({ ...nodeProps, totalValue })}
          link={{ stroke: "#94a3b8", strokeOpacity: 0.2 }}
          margin={{ top: 20, left: 20, bottom: 20, right: 120 }}
          iterations={64}
        >
          <Tooltip isAnimationActive={false} content={sankeyTooltip} />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
}