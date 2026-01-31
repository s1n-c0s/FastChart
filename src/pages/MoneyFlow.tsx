import * as React from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FlowChart } from "@/components/charts";
import { useDataManipulation } from "@/hooks/useData";
import { INITIAL_DATA } from "@/config/constants";
import toast from "react-hot-toast";
import type { Datum } from "@/types";

/**
 * MoneyFlowPage Component
 * Provides a sidebar-based editor for visualizing money flow using a FlowChart (Sankey).
 * Features debounced inputs, auto-balancing logic, and validation checks.
 */
export default function MoneyFlowPage() {
  const { data: globalData, total: dataTotal } = useDataManipulation(INITIAL_DATA as Datum[]);

  // Default chart structure for fallback or reset
  const DEFAULT_NODES = React.useMemo(() => [
    { name: "Income" }, { name: "Savings" }, { name: "Expenses" }, { name: "Rent" }, { name: "Food" },
  ], []);
  
  const DEFAULT_LINKS = React.useMemo(() => [
    { source: 0, target: 1, value: 2000 }, { source: 0, target: 2, value: 3000 },
    { source: 2, target: 3, value: 1500 }, { source: 2, target: 4, value: 1500 },
  ], []);

  const [nodes, setNodes] = React.useState(DEFAULT_NODES);
  const [links, setLinks] = React.useState(DEFAULT_LINKS);
  
  // --- Input & Debounce Logic ---
  const [splitTotal, setSplitTotal] = React.useState<number>(10000);
  const [inputValue, setInputValue] = React.useState<string>("10000");
  const [autoSplit, setAutoSplit] = React.useState<boolean>(true);
  const [blocks, setBlocks] = React.useState<Array<{ name: string; value: number | null; auto?: boolean; adjusted?: boolean }>>([]);

  // Debounce the global total input to update the 'Active Total' 500ms after user stops typing
  React.useEffect(() => {
    const handler = setTimeout(() => {
      const numValue = Number(inputValue);
      if (!isNaN(numValue)) setSplitTotal(numValue);
    }, 500);
    return () => clearTimeout(handler);
  }, [inputValue]);

  // --- Block Management ---
  const addBlock = () => {
    setBlocks((prev) => {
      const currentTotal = Math.max(0, Math.floor(splitTotal));
      const specified = prev.reduce((s, b) => s + (b.value != null ? Math.max(0, Math.floor(b.value)) : 0), 0);
      const remaining = Math.max(0, currentTotal - specified);
      
      // Initial value for new block is half of the current remainder
      const assign = remaining > 0 ? Math.floor(remaining / 2) : null;
      return [...prev, { name: `Block ${prev.length + 1}`, value: assign, auto: assign != null }];
    });
  };

  const removeBlock = (index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const updateBlock = (index: number, next: Partial<{ name: string; value: number | null }>) => {
    setBlocks((prev) => prev.map((b, i) => {
      if (i !== index) return b;
      const updated = { ...b, ...next } as any;
      // Mark as manual edit to prevent auto-split from overwriting this specific value
      if (next.value !== undefined || next.name !== undefined) {
        updated.auto = false;
        updated.adjusted = false;
      }
      return updated;
    }));
  };

  const clearAllBlocks = () => {
    setBlocks([]);
    toast.success("All blocks cleared.");
  };

  const resetFlow = () => {
    setBlocks([]);
    setInputValue("10000");
    setNodes(DEFAULT_NODES);
    setLinks(DEFAULT_LINKS);
    toast.success("Reset to default view.");
  };

  // --- Validation & Auto-balancing Logic ---
  
  // Checks if the sum of manual blocks exceeds the total after typing stops
  React.useEffect(() => {
    const handler = setTimeout(() => {
      const currentTotal = Math.max(0, Math.floor(splitTotal));
      const manualSum = blocks.reduce((s, b) => s + (!b.auto && b.value != null ? b.value : 0), 0);
      if (manualSum > currentTotal) {
        toast.error(`Warning: Manual blocks (${manualSum.toLocaleString()}) exceed total (${currentTotal.toLocaleString()})`);
      }
    }, 800);
    return () => clearTimeout(handler);
  }, [blocks, splitTotal]);

  // Re-calculates auto-split values when blocks or total change
  React.useEffect(() => {
    if (!autoSplit || blocks.length === 0) return;

    const currentTotal = Math.max(0, Math.floor(splitTotal));
    const manualSum = blocks.reduce((s, b) => s + (!b.auto && b.value != null ? b.value : 0), 0);
    const remaining = currentTotal - manualSum;

    if (remaining < 0) return; // Wait for manual correction

    const targetIndexes = blocks.map((b, idx) => (b.auto || b.value == null ? idx : -1)).filter(i => i >= 0);

    // If all blocks are manual but don't reach the total, adjust the last one
    if (targetIndexes.length === 0 && remaining > 0) {
      const lastIdx = blocks.length - 1;
      setBlocks(prev => prev.map((b, i) => i === lastIdx ? { ...b, value: (b.value || 0) + remaining, adjusted: true } : b));
      return;
    }

    // Distribute remaining amount across 'auto' blocks
    if (targetIndexes.length > 0) {
      const per = Math.floor(remaining / targetIndexes.length);
      let rem = remaining - (per * targetIndexes.length);
      const newBlocks = blocks.map((b, i) => {
        if (targetIndexes.includes(i)) {
          const val = per + (rem > 0 ? 1 : 0);
          if (rem > 0) rem--;
          return { ...b, value: val, auto: true };
        }
        return b;
      });
      const changed = newBlocks.some((b, i) => b.value !== blocks[i].value);
      if (changed) setBlocks(newBlocks);
    }
  }, [blocks, splitTotal, autoSplit]);

  // Sync state to Chart components
  React.useEffect(() => {
    if (blocks.length === 0) {
      setNodes(DEFAULT_NODES);
      setLinks(DEFAULT_LINKS);
      return;
    }
    setNodes([{ name: "Income" }, ...blocks.map(b => ({ name: b.name }))]);
    setLinks(blocks.map((b, i) => ({ source: 0, target: i + 1, value: b.value || 0 })));
  }, [blocks]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* --- SIDEBAR --- */}
      <aside className="w-80 border-r flex flex-col bg-muted/20">
        <div className="p-4 border-b bg-background font-bold text-xl text-center">Flow Editor</div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Total Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Global Total</label>
            <input 
              type="number" 
              className="w-full rounded-md border bg-background px-3 py-2 text-sm" 
              value={inputValue} 
              onChange={(e) => setInputValue(e.target.value)} 
            />
          </div>

          {/* Settings */}
          <div className="flex items-center justify-between py-2 border-y">
            <span className="text-sm font-medium">Auto-split remaining</span>
            <Switch checked={autoSplit} onCheckedChange={setAutoSplit} />
          </div>

          {/* Blocks List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">Blocks</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={clearAllBlocks}>
                  Clear All
                </Button>
                <Button size="sm" variant="secondary" className="h-7" onClick={addBlock}>
                  + Add
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              {blocks.map((b, idx) => (
                <div key={idx} className="relative p-2 rounded-md border bg-background space-y-1 hover:border-primary/30 transition-colors">
                  <input 
                    className="w-full bg-transparent text-sm font-medium outline-none" 
                    value={b.name} 
                    onChange={(e) => updateBlock(idx, { name: e.target.value })} 
                  />
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      className="flex-1 bg-muted/50 rounded px-2 py-1 text-xs" 
                      value={b.value ?? ""} 
                      onChange={(e) => updateBlock(idx, { value: e.target.value === "" ? null : Number(e.target.value) })} 
                    />
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => removeBlock(idx)}>✕</Button>
                  </div>
                  {b.auto && <span className="absolute -top-2 -right-1 bg-primary text-[10px] text-primary-foreground px-1.5 rounded-full shadow-sm">auto</span>}
                  {b.adjusted && <span className="absolute -top-2 -right-1 bg-amber-500 text-[10px] text-white px-1.5 rounded-full shadow-sm">fixed</span>}
                </div>
              ))}
            </div>
          </div>

          <Button variant="outline" size="sm" className="w-full" onClick={resetFlow}>Reset to Defaults</Button>
        </div>
      </aside>

      {/* --- MAIN CHART AREA --- */}
      <main className="flex-1 flex flex-col bg-muted/5">
        <header className="h-16 border-b bg-background flex items-center justify-between px-6">
          <h1 className="font-semibold text-lg">Money Flow Visualization</h1>
          <div className="text-sm text-muted-foreground">
            Active Total: <span className="font-mono text-foreground font-bold">{splitTotal.toLocaleString()}</span>
          </div>
        </header>
        
        <div className="flex-1 p-8 flex items-center justify-center">
          <div className="w-full h-full bg-background rounded-xl border shadow-sm p-4 flex items-center justify-center">
            <FlowChart nodes={nodes} links={links} height={600} />
          </div>
        </div>
      </main>
    </div>
  );
}