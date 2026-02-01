import * as React from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FlowChart } from "@/components/charts";
import { useDataManipulation } from "@/hooks/useData";
import { INITIAL_DATA } from "@/config/constants";
import toast from "react-hot-toast";
import type { Datum } from "@/types";
import { PanelLeftClose, PanelLeftOpen, Wallet } from "lucide-react";

interface BlockItem {
  name: string;
  value: number | null;
  auto?: boolean;
  adjusted?: boolean;
}

export default function MoneyFlowPage() {
  useDataManipulation(INITIAL_DATA as Datum[]);

  // --- Chart Data State ---
  const [incomeTitle, setIncomeTitle] = React.useState<string>("Income"); // New state for editable title
  const [nodes, setNodes] = React.useState<{ name: string }[]>([]);
  const [links, setLinks] = React.useState<{ source: number; target: number; value: number }[]>([]);
  
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [splitTotal, setSplitTotal] = React.useState<number>(10000);
  const [inputValue, setInputValue] = React.useState<string>("10000");
  const [autoSplit, setAutoSplit] = React.useState<boolean>(true);
  const [blocks, setBlocks] = React.useState<BlockItem[]>([]);

  // Debounce global total input
  React.useEffect(() => {
    const handler = setTimeout(() => {
      const numValue = Number(inputValue);
      if (!isNaN(numValue)) setSplitTotal(numValue);
    }, 500);
    return () => clearTimeout(handler);
  }, [inputValue]);

  // Block Management
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
      if (next.value !== undefined || next.name !== undefined) {
        updated.auto = false;
        updated.adjusted = false;
      }
      return updated;
    }));
  };

  const resetFlow = () => {
    setBlocks([]);
    setInputValue("10000");
    setIncomeTitle("Income");
    toast.success("Reset to default view.");
  };

  // Auto-balancing logic
  React.useEffect(() => {
    if (!autoSplit || blocks.length === 0) return;
    const currentTotal = Math.max(0, Math.floor(splitTotal));
    const manualSum = blocks.reduce((s, b) => s + (!b.auto && b.value != null ? b.value : 0), 0);
    const remaining = currentTotal - manualSum;
    if (remaining < 0) return;

    const targetIndexes = blocks.map((b, idx) => (b.auto || b.value == null ? idx : -1)).filter(i => i >= 0);

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
      setNodes([{ name: incomeTitle }, { name: "Savings" }, { name: "Expenses" }]);
      setLinks([
        { source: 0, target: 1, value: splitTotal * 0.4 },
        { source: 0, target: 2, value: splitTotal * 0.6 }
      ]);
      return;
    }
    // Inject the editable incomeTitle as the first node
    setNodes([{ name: incomeTitle }, ...blocks.map(b => ({ name: b.name }))]);
    setLinks(blocks.map((b, i) => ({ source: 0, target: i + 1, value: b.value || 0 })));
  }, [blocks, splitTotal, incomeTitle]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background relative">
      <aside className={`border-r flex flex-col bg-muted/20 transition-all duration-300 ease-in-out shrink-0 ${isSidebarOpen ? "w-80" : "w-0 overflow-hidden border-none"}`}>
        <div className="p-4 border-b bg-background font-bold text-xl flex items-center justify-between min-w-[320px]">
          <span>Flow Editor</span>
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
            <PanelLeftClose className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6 min-w-[320px]">
          {/* Editable Income Title Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
              <Wallet className="w-3 h-3" /> Source Title
            </label>
            <input 
              className="w-full rounded-md border bg-background px-3 py-2 text-sm font-bold text-primary" 
              value={incomeTitle} 
              onChange={(e) => setIncomeTitle(e.target.value)} 
              placeholder="e.g. Total Income"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Global Total</label>
            <input 
              type="number" 
              className="w-full rounded-md border bg-background px-3 py-2 text-sm" 
              value={inputValue} 
              onChange={(e) => setInputValue(e.target.value)} 
            />
          </div>

          <div className="flex items-center justify-between py-2 border-y">
            <span className="text-sm font-medium">Auto-split</span>
            <Switch checked={autoSplit} onCheckedChange={setAutoSplit} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">Blocks</h3>
              <Button size="sm" variant="secondary" className="h-7" onClick={addBlock}>+ Add</Button>
            </div>
            
            <div className="space-y-2">
              {blocks.map((b, idx) => (
                <div key={idx} className="relative p-2 rounded-md border bg-background space-y-1">
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
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeBlock(idx)}>✕</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={resetFlow}>Reset</Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col bg-muted/5 overflow-hidden">
        <header className="h-16 border-b bg-background flex items-center px-6 gap-4 shrink-0">
          {!isSidebarOpen && (
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
              <PanelLeftOpen className="h-5 w-5" />
            </Button>
          )}
          <h1 className="font-semibold text-lg flex-1">Money Flow: <span className="text-primary">{incomeTitle}</span></h1>
          <div className="text-sm text-muted-foreground">
            Total: <span className="font-mono text-foreground font-bold">{splitTotal.toLocaleString()}</span>
          </div>
        </header>
        
        <div className="flex-1 p-8 min-h-0 relative">
          <div className="w-full h-full bg-background rounded-xl border shadow-sm p-4 flex items-center justify-center">
            {/* The chart will now stay clean thanks to the render guards in flow-chart.tsx */}
            <FlowChart nodes={nodes} links={links} height={600} />
          </div>
        </div>
      </main>
    </div>
  );
}