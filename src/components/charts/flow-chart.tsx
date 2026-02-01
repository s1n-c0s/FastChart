import * as React from "react";
import { Sankey, Tooltip, ResponsiveContainer, Layer, Rectangle } from "recharts";

/**
 * Interfaces for better type safety
 */
export interface FlowNode {
  name: string;
  color?: string;
  value?: number; // Recharts injects the calculated node value
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
 * Custom Node component to render labels with Name, Value, and Percent
 */
const renderCustomNode = (props: any) => {
  const { x, y, width, height, index, payload, containerWidth, totalValue } = props;
  const isOut = x + width + 6 > containerWidth;
  
  // Calculate percentage relative to total chart flow
  const percentage = totalValue > 0 ? ((payload.value / totalValue) * 100).toFixed(0) : 0;

  return (
    <Layer key={`sankey-node-${index}`}>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={payload.color || "#3b82f6"}
        fillOpacity={0.8}
      />
      <text
        x={isOut ? x - 6 : x + width + 6}
        y={y + height / 2}
        textAnchor={isOut ? "end" : "start"}
        verticalAnchor="middle"
        fontSize="12"
        className="fill-foreground font-medium"
      >
        {/* Format: Category Name (Value - 00%) */}
        {payload.name} ({payload.value.toLocaleString()} — {percentage}%)
      </text>
    </Layer>
  );
};

const PALETTE = ["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#7c3aed", "#06b6d4"];

export function FlowChart({ nodes = DEFAULT_NODES, links = DEFAULT_LINKS, height = 400, nodeWidth = 20, nodePadding = 12 }: FlowChartProps) {
  const safeNodes = Array.isArray(nodes) ? nodes : DEFAULT_NODES;
  const safeLinks = Array.isArray(links)
    ? links.filter((l) => typeof l.source === "number" && typeof l.target === "number" && isFinite(l.value))
    : DEFAULT_LINKS;

  const coloredNodes = safeNodes.map((n, i) => ({ ...n, color: PALETTE[i % PALETTE.length] }));
  const sankeyData = { nodes: coloredNodes, links: safeLinks };

  // Calculate the total flow (sum of all incoming/outgoing values)
  const totalValue = React.useMemo(() => 
    safeLinks.reduce((acc, link) => acc + (link.value || 0), 0), 
  [safeLinks]);

  if (coloredNodes.length === 0 || safeLinks.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">No data to render.</div>;
  }

  /**
   * Custom tooltip to show branch name, value, and percentage
   */
  const sankeyTooltip = (props: any) => {
    const { payload } = props;
    if (!payload || !payload.length) return null;
    const item = payload[0].payload;

    // Node Hover
    if (item.name && item.value !== undefined && !item.source && item.source !== 0) {
      const nodePerc = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : 0;
      return (
        <div className="bg-background border rounded-lg p-2 text-xs shadow-xl font-medium">
          <div className="text-muted-foreground mb-1">Total {item.name}</div>
          <div className="font-mono font-bold text-primary">
            {item.value.toLocaleString()} <span className="text-muted-foreground font-normal ml-1">({nodePerc}%)</span>
          </div>
        </div>
      );
    }

    // Branch (Link) Hover
    const from = coloredNodes[item.source]?.name || "Source";
    const to = coloredNodes[item.target]?.name || "Target";
    const linkPerc = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : 0;

    return (
      <div className="bg-background border rounded-lg p-2 text-xs shadow-xl font-medium">
        <div className="text-muted-foreground mb-1">Flow</div>
        <div className="flex items-center gap-2 mb-1">
          <span>{from}</span>
          <span className="text-muted-foreground">→</span>
          <span>{to}</span>
        </div>
        <div className="font-mono font-bold text-primary">
          {Number(item.value).toLocaleString()} <span className="text-muted-foreground font-normal ml-1">({linkPerc}%)</span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full" style={{ minHeight: height }}>
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={sankeyData}
          // Passing totalValue into the custom node renderer
          node={(nodeProps: any) => renderCustomNode({ ...nodeProps, totalValue })}
          nodePadding={nodePadding}
          link={{ stroke: "#e2e8f0", strokeOpacity: 0.4 }}
          margin={{ top: 20, left: 20, bottom: 20, right: 160 }} // Increased margin for longer labels
        >
          <Tooltip content={sankeyTooltip} />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
}