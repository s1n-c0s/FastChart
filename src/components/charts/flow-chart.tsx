import * as React from "react";
import { Sankey, Tooltip, ResponsiveContainer } from "recharts";

// Interfaces for better type safety instead of using 'any'
export interface FlowNode {
  name: string;
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

// Fixed 'any' in ErrorBoundary
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

  // Improved Tooltip with typed payloads
  const sankeyTooltip = ({ payload }: { payload?: any[] }) => {
    if (!payload || !payload.length) return null;
    const item = payload[0].payload;

    if (item.name) {
      return (
        <div className="bg-background border rounded-lg p-2 text-xs shadow-xl font-medium">
          {item.name}
        </div>
      );
    }

    const from = coloredNodes[item.source]?.name;
    const to = coloredNodes[item.target]?.name;
    return (
      <div className="bg-background border rounded-lg p-2 text-xs shadow-xl font-medium">
        {from} → {to}: {Number(item.value).toLocaleString()}
      </div>
    );
  };

  return (
    <div style={{ height: `${height}px` }} className="w-full">
      <FlowChartErrorBoundary>
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={sankeyData}
            node={{ stroke: "#111827", strokeWidth: 1, width: nodeWidth, padding: nodePadding }}
            link={{ stroke: "#e2e8f0" }}
            margin={{ top: 20, left: 20, bottom: 20, right: 20 }}
            align="justify"
          >
            <Tooltip content={sankeyTooltip} />
          </Sankey>
        </ResponsiveContainer>
      </FlowChartErrorBoundary>
    </div>
  );
}