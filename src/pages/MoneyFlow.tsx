import * as React from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FlowChart } from "@/components/charts";
import { useDataManipulation } from "@/hooks/useData";
import { INITIAL_DATA } from "@/config/constants";
import toast from "react-hot-toast";
import type { Datum } from "@/types";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

// Interface for block items to ensure type safety and fix linting errors
interface BlockItem {
  name: string;
  value: number | null;
  auto?: boolean;
  adjusted?: boolean;
}

export default function MoneyFlowPage() {
  // Call hook for side effects; unused variables removed to satisfy lint warnings
  useDataManipulation(INITIAL_DATA as Datum[]);

  const DEFAULT_NODES = React.useMemo(() => [
    { name: "Income" }, { name: "Savings" }, { name: "Expenses" }, { name: "Rent" }, { name: "Food" },
  ], []);
  
  const DEFAULT_LINKS = React.useMemo(() => [
    { source: 0, target: 1, value: 2000 }, { source: 0, target: 2, value: 3000 },
    { source: 2, target: 3, value: 1500 }, { source: 2, target: 4, value: 1500 },
  ], []);

  const [nodes, setNodes] = React.useState(DEFAULT_NODES);
  const [links, setLinks] = React.useState(DEFAULT_LINKS);
  
  // --- UI State ---
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  // --- Input & Debounce Logic ---
  const [splitTotal, setSplitTotal] = React.useState<number>(10000);
  const [inputValue, setInputValue] = React.useState<string>("10000");
  const [autoSplit, setAutoSplit] = React.useState<boolean>(true);
  const [blocks, setBlocks] = React.useState<BlockItem[]>([]);

  // Debounce global total input: updates calculations 500ms after typing stops
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
      const updated: BlockItem = { ...b, ...next };
      // User manual edit clears auto/adjusted flags
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

  // --- Auto-balancing & Validation ---
  React.useEffect(() => {
    const handler = setTimeout(() => {
      const currentTotal = Math.max(0, Math.floor(splitTotal));
      const manualSum = blocks.reduce((s, b) => s + (!b.auto && b.value != null ? b.value : 0), 0);
      if (manualSum > currentTotal) {
        toast.error(`Warning: Manual blocks exceed total.`);
      }
    }, 800);
    return () => clearTimeout(handler);
  }, [blocks, splitTotal]);

  React.useEffect(() => {
    if (!autoSplit || blocks.length === 0) return;
    const currentTotal = Math.max(0, Math.floor(splitTotal));
    const manualSum = blocks.reduce((s, b) => s + (!b.auto && b.value != null ? b.value : 0), 0);
    const remaining = currentTotal - manualSum;
    if (remaining < 0) return;

    const targetIndexes = blocks.map((b, idx) => (b.auto || b.value == null ? idx : -1)).filter(i => i >= 0);

    if (targetIndexes.length === 0 && remaining > 0) {
      const lastIdx = blocks.length - 1;
      setBlocks(prev => prev.map((b, i) => i === lastIdx ? { ...b, value: (b.value || 0) + remaining, adjusted: true } : b));
      return;
    }

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

  // Sync state to Chart components with fixed dependency array
  React.useEffect(() => {
    if (blocks.length === 0) {
      setNodes(DEFAULT_NODES); 
      setLinks(DEFAULT_LINKS); 
      return;
    }
    setNodes([{ name: "Income" }, ...blocks.map(b => ({ name: b.name }))]);
    setLinks(blocks.map((b, i) => ({ source: 0, target: i + 1, value: b.value || 0 })));
  }, [blocks, DEFAULT_NODES, DEFAULT_LINKS]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background relative">
      {/* --- SIDEBAR --- */}
      <aside 
        className={`border-r flex flex-col bg-muted/20 transition-all duration-300 ease-in-out shrink-0 ${
          isSidebarOpen ? "w-80" : "w-0 overflow-hidden border-none"
        }`}
      >
        <div className="p-4 border-b bg-background font-bold text-xl flex items-center justify-between min-w-[320px]">
          <span>Flow Editor</span>
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
            <PanelLeftClose className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6 min-w-[320px]">
          <div className="space-y-2">
            <label htmlFor="global-total" className="text-xs font-semibold uppercase text-muted-foreground">Global Total</label>
            <input 
              id="global-total"
              type="number" 
              className="w-full rounded-md border bg-background px-3 py-2 text-sm" 
              value={inputValue} 
              onChange={(e) => setInputValue(e.target.value)} 
              placeholder="Enter total amount"
            />
          </div>

          <div className="flex items-center justify-between py-2 border-y">
            <span className="text-sm font-medium">Auto-split</span>
            <Switch checked={autoSplit} onCheckedChange={setAutoSplit} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">Blocks</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={clearAllBlocks}>Clear All</Button>
                <Button size="sm" variant="secondary" className="h-7" onClick={addBlock}>+ Add</Button>
              </div>
            </div>
            
            <div className="space-y-2">
              {blocks.map((b, idx) => (
                <div key={idx} className="relative p-2 rounded-md border bg-background space-y-1">
                  <input 
                    aria-label="Block Name"
                    className="w-full bg-transparent text-sm font-medium outline-none" 
                    value={b.name} 
                    onChange={(e) => updateBlock(idx, { name: e.target.value })} 
                    placeholder="Category Name"
                  />
                  <div className="flex items-center gap-2">
                    <input 
                      aria-label="Block Value"
                      type="number" 
                      className="flex-1 bg-muted/50 rounded px-2 py-1 text-xs" 
                      value={b.value ?? ""} 
                      onChange={(e) => updateBlock(idx, { value: e.target.value === "" ? null : Number(e.target.value) })} 
                      placeholder="0"
                    />
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => removeBlock(idx)}>✕</Button>
                  </div>
                  {b.auto && <span className="absolute -top-2 -right-1 bg-primary text-[10px] text-primary-foreground px-1.5 rounded-full shadow-sm">auto</span>}
                  {b.adjusted && <span className="absolute -top-2 -right-1 bg-amber-500 text-[10px] text-white px-1.5 rounded-full shadow-sm">fixed</span>}
                </div>
              ))}
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={resetFlow}>Reset</Button>
        </div>
      </aside>

      {/* --- RESPONSIVE MAIN AREA --- */}
      <main className="flex-1 min-w-0 flex flex-col bg-muted/5 overflow-hidden transition-all duration-300">
        <header className="h-16 border-b bg-background flex items-center px-4 sm:px-6 gap-4 shrink-0">
          {!isSidebarOpen && (
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="shrink-0">
              <PanelLeftOpen className="h-5 w-5" />
            </Button>
          )}
          <h1 className="font-semibold text-base sm:text-lg flex-1 truncate">Money Flow Visualization</h1>
          <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
            Active Total: <span className="font-mono text-foreground font-bold">{splitTotal.toLocaleString()}</span>
          </div>
        </header>
        
        <div className="flex-1 p-4 sm:p-8 min-h-0 relative">
          <div className="w-full h-full bg-background rounded-xl border shadow-sm p-4 overflow-hidden flex items-center justify-center">
            <FlowChart nodes={nodes} links={links} height={600} />
          </div>
        </div>
      </main>
    </div>
  );
}