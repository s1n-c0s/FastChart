import * as React from "react";
import { Sankey, Tooltip, ResponsiveContainer } from "recharts";
import { ChartTooltipContent } from "@/components/ui/chart";

export interface FlowNode {
  name: string;
}
export interface FlowLink {
  source: number;
  target: number;
  value: number;
}   

const DEFAULT_NODES: FlowNode[] = [
  { name: "Income" },
  { name: "Savings" },
  { name: "Expenses" },
  { name: "Rent" },
  { name: "Food" },
];

const DEFAULT_LINKS: FlowLink[] = [
  { source: 0, target: 1, value: 2000 },
  { source: 0, target: 2, value: 3000 },
  { source: 2, target: 3, value: 1500 },
  { source: 2, target: 4, value: 1500 },
];

interface FlowChartProps {
  nodes?: FlowNode[];
  links?: FlowLink[];
  height?: number;
  nodeWidth?: number;
  nodePadding?: number;
}

class FlowChartErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.error("FlowChart rendering error:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-sm text-red-500">Failed to render flow chart. Check console for details.</div>
      );
    }
    return this.props.children as any;
  }
}

const PALETTE = ["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#7c3aed", "#06b6d4"];

export function FlowChart({ nodes = DEFAULT_NODES, links = DEFAULT_LINKS, height = 400, nodeWidth = 20, nodePadding = 12 }: FlowChartProps) {
  // Basic validation to avoid runtime errors in Sankey
  const safeNodes = Array.isArray(nodes) ? nodes : DEFAULT_NODES;
  const safeLinks = Array.isArray(links)
    ? links
        .filter((l) => typeof l.source === "number" && typeof l.target === "number" && isFinite(l.value))
        .map((l) => ({ ...l, value: Number(l.value) }))
    : DEFAULT_LINKS;

  // Assign colors to nodes (for readability)
  const coloredNodes = safeNodes.map((n, i) => ({ ...n, color: PALETTE[i % PALETTE.length] }));
  const sankeyData = { nodes: coloredNodes, links: safeLinks };

  if (coloredNodes.length === 0 || safeLinks.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">No nodes or links to render.</div>;
  }

  // Debug logging for Sankey props
  console.debug("FlowChart rendering with", { nodes: coloredNodes.length, links: safeLinks.length, sankeyData });

  // Custom tooltip for Sankey entries (shows node name or link flow with value)
  const sankeyTooltip = ({ payload }: any) => {
    if (!payload || !payload.length) return null;
    const item = payload[0];
    if (!item) return null;

    const p = item.payload || {};
    const isNode = typeof p.name === 'string';
    const isLink = typeof p.source === 'number' || typeof p.target === 'number';

    if (isNode) {
      return (
        <div className="bg-background border border-border rounded-lg p-2 text-xs shadow-xl">
          <div className="font-medium">{p.name}</div>
        </div>
      );
    }

    if (isLink) {
      const from = sankeyData.nodes[p.source]?.name ?? p.source;
      const to = sankeyData.nodes[p.target]?.name ?? p.target;
      const value = typeof p.value === 'number' ? p.value : typeof item.value === 'number' ? item.value : 0;
      const formatted = Number(value).toLocaleString();

      return (
        <div className="bg-background border border-border rounded-lg p-2 text-xs shadow-xl">
          <div className="font-medium">{from} → {to}</div>
          <div className="font-mono">{formatted}</div>
        </div>
      );
    }

    return null;
  };

  try {
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
  } catch (err) {
    console.error("Sankey render error:", err);
    return <div className="p-4 text-sm text-red-500">Failed to render Sankey diagram.</div>;
  }
}