import * as React from "react";
import { Sankey, Tooltip, ResponsiveContainer, Layer, Rectangle } from "recharts";

/**
 * Interfaces for better type safety and to resolve linting errors
 */
export interface FlowNode {
  name: string;
  color?: string;
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
 * Custom Node component to render the rectangle and the text label on the graph
 */
const renderCustomNode = (props: any) => {
  const { x, y, width, height, index, payload, containerWidth } = props;
  const isOut = x + width + 6 > containerWidth;
  
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
        {payload.name}
      </text>
    </Layer>
  );
};

class FlowChartErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return <div className="p-4 text-sm text-red-500">Failed to render flow chart.</div>;
    }
    return this.props.children;
  }
}

const PALETTE = ["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#7c3aed", "#06b6d4"];

export function FlowChart({ nodes = DEFAULT_NODES, links = DEFAULT_LINKS, height = 400, nodeWidth = 20, nodePadding = 12 }: FlowChartProps) {
  const safeNodes = Array.isArray(nodes) ? nodes : DEFAULT_NODES;
  const safeLinks = Array.isArray(links)
    ? links.filter((l) => typeof l.source === "number" && typeof l.target === "number" && isFinite(l.value))
    : DEFAULT_LINKS;

  const coloredNodes = safeNodes.map((n, i) => ({ ...n, color: PALETTE[i % PALETTE.length] }));
  const sankeyData = { nodes: coloredNodes, links: safeLinks };

  if (coloredNodes.length === 0 || safeLinks.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">No data to render.</div>;
  }

  /**
   * Custom tooltip to show branch name and value on hover
   */
  const sankeyTooltip = (props: any) => {
    const { payload } = props;
    if (!payload || !payload.length) return null;
    const item = payload[0].payload;

    // Hovering over a Node
    if (item.name && item.value === undefined) {
      return (
        <div className="bg-background border rounded-lg p-2 text-xs shadow-xl font-medium">
          {item.name}
        </div>
      );
    }

    // Hovering over a Branch (Link)
    const from = coloredNodes[item.source]?.name || "Source";
    const to = coloredNodes[item.target]?.name || "Target";
    return (
      <div className="bg-background border rounded-lg p-2 text-xs shadow-xl font-medium">
        <div className="text-muted-foreground mb-1">Flow</div>
        <div className="flex items-center gap-2">
          <span>{from}</span>
          <span className="text-muted-foreground">→</span>
          <span>{to}</span>
        </div>
        <div className="mt-1 font-mono font-bold text-primary">
          {Number(item.value).toLocaleString()}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full" style={{ minHeight: height }}>
      <FlowChartErrorBoundary>
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={sankeyData}
            // Fix: 'padding' is moved to nodePadding on the root Sankey component
            node={renderCustomNode}
            nodePadding={nodePadding}
            link={{ stroke: "#e2e8f0", strokeOpacity: 0.4 }}
            margin={{ top: 20, left: 20, bottom: 20, right: 100 }} // Increased right margin for labels
          >
            <Tooltip content={sankeyTooltip} />
          </Sankey>
        </ResponsiveContainer>
      </FlowChartErrorBoundary>
    </div>
  );
}