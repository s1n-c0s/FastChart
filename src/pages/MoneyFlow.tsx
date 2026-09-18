import * as React from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FlowChart } from "@/components/charts";
import toast from "react-hot-toast";
import { PanelLeftClose, PanelLeftOpen, Trash2, Plus, Wallet } from "lucide-react";

// --- Interfaces ---
interface BlockItem {
  name: string;
  value: number | null;
  auto?: boolean;
  adjusted?: boolean;
}

export default function MoneyFlowPage() {
  // --- 1. Main State ---
  const [sourceName, setSourceName] = React.useState<string>("Income");
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [splitTotal, setSplitTotal] = React.useState<number>(10000);
  const [inputValue, setInputValue] = React.useState<string>("10000");
  const [autoSplit, setAutoSplit] = React.useState<boolean>(true);
  const [blocks, setBlocks] = React.useState<BlockItem[]>([]);

  // --- 2. Chart Data State ---
  const DEFAULT_NODES = React.useMemo(() => [
    { name: sourceName }, { name: "Savings" }, { name: "Expenses" }, { name: "Rent" }, { name: "Food" },
  ], [sourceName]);
  
  const DEFAULT_LINKS = React.useMemo(() => [
    { source: 0, target: 1, value: 2000 }, { source: 0, target: 2, value: 3000 },
    { source: 2, target: 3, value: 1500 }, { source: 2, target: 4, value: 1500 },
  ], []);

  const [nodes, setNodes] = React.useState(DEFAULT_NODES);
  const [links, setLinks] = React.useState(DEFAULT_LINKS);

  // --- 3. Debounce Global Total ---
  React.useEffect(() => {
    const handler = setTimeout(() => {
      const numValue = Number(inputValue);
      if (!isNaN(numValue)) setSplitTotal(numValue);
    }, 500);
    return () => clearTimeout(handler);
  }, [inputValue]);

  // --- 4. Auto-balancing Logic ---
  React.useEffect(() => {
    if (!autoSplit || blocks.length === 0) return;
    
    const currentTotal = Math.max(0, Math.floor(splitTotal));
    const manualSum = blocks.reduce((s, b) => s + (!b.auto && b.value != null ? b.value : 0), 0);
    const remaining = currentTotal - manualSum;
    
    if (remaining < 0) {
      toast.error("Manual blocks exceed total amount!");
      return;
    }

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
      
      const changed = JSON.stringify(newBlocks) !== JSON.stringify(blocks);
      if (changed) setBlocks(newBlocks);
    }
  }, [blocks, splitTotal, autoSplit]);

  // --- 5. Sync State to Chart ---
  React.useEffect(() => {
    if (blocks.length === 0) {
      setNodes(DEFAULT_NODES); 
      setLinks(DEFAULT_LINKS); 
      return;
    }
    setNodes([{ name: sourceName }, ...blocks.map(b => ({ name: b.name }))]);
    setLinks(blocks.map((b, i) => ({ source: 0, target: i + 1, value: b.value || 0 })));
  }, [blocks, sourceName, DEFAULT_NODES, DEFAULT_LINKS]);

  // --- 6. Actions ---
  const addBlock = () => {
    setBlocks(prev => [...prev, { name: `Category ${prev.length + 1}`, value: null, auto: true }]);
  };

  const removeBlock = (index: number) => {
    setBlocks(prev => prev.filter((_, i) => i !== index));
  };

  const updateBlock = (index: number, next: Partial<BlockItem>) => {
    setBlocks(prev => prev.map((b, i) => {
      if (i !== index) return b;
      const updated = { ...b, ...next };
      if (next.value !== undefined) updated.auto = false;
      return updated;
    }));
  };

  const clearBlocks = () => {
    setBlocks([]);
    toast.success("Blocks list cleared");
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background relative text-foreground">
      {/* --- SIDEBAR --- */}
      <aside 
        className={`border-r flex flex-col bg-muted/20 transition-all duration-300 ease-in-out shrink-0 ${
          isSidebarOpen ? "w-80" : "w-0 overflow-hidden border-none"
        }`}
      >
        <div className="p-4 border-b bg-background font-bold text-xl flex items-center justify-between min-w-[320px]">
          <span className="truncate">Flow Editor</span>
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} aria-label="Close sidebar">
            <PanelLeftClose className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6 min-w-[320px]">
          
          {/* --- MERGED CARD: Source & Total Configuration --- */}
          <div className="rounded-2xl border bg-background shadow-sm overflow-hidden ring-1 ring-black/5">
            <div className="p-4 space-y-4">
              {/* Main Source Name */}
<div className="space-y-2">
  <label htmlFor="main-source-input" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
    Source Name
  </label>
  <div className="relative">
    <Wallet className="absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <input 
      id="main-source-input"
      className="w-full bg-transparent text-2xl font-bold outline-none pl-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      value={sourceName} 
      onChange={(e) => setSourceName(e.target.value)} 
      placeholder="e.g. Income, Budget"
    />
  </div>
</div>

              <div className="h-px bg-border/60" />

              {/* Global Total */}
              <div className="space-y-1">
                <label htmlFor="global-total-input" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                  Global Total
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-light text-muted-foreground tracking-tighter">฿</span>
                  <input 
                    id="global-total-input"
                    type="number" 
                    className="w-full bg-transparent text-2xl font-mono font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                    value={inputValue} 
                    onChange={(e) => setInputValue(e.target.value)} 
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Settings Switch */}
          <div className="flex items-center justify-between px-1 py-2 border-y border-dashed border-border/60">
            <span className="text-sm font-medium text-muted-foreground">Auto-split Remaining</span>
            <Switch checked={autoSplit} onCheckedChange={setAutoSplit} />
          </div>

          {/* Flow Blocks List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Flow Blocks</h3>
              <div className="flex items-center gap-1">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 px-2 text-destructive hover:bg-destructive/10" 
                  onClick={clearBlocks}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Clear
                </Button>
                <Button size="sm" variant="secondary" className="h-7 px-2" onClick={addBlock}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Add
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              {blocks.map((b, idx) => (
                <div key={idx} className="relative p-3 rounded-xl border bg-background shadow-sm space-y-2 group transition-all hover:border-primary/40 hover:shadow-md">
                  <input 
                    aria-label={`Name for block ${idx + 1}`}
                    className="w-full bg-transparent text-sm font-semibold outline-none focus:text-primary" 
                    value={b.name} 
                    onChange={(e) => updateBlock(idx, { name: e.target.value })} 
                    placeholder="Category Name"
                  />
                  <div className="flex items-center gap-2">
                    <input 
                      aria-label={`Value for block ${idx + 1}`}
                      type="number" 
                      className="flex-1 bg-muted/40 rounded-lg px-2.5 py-1.5 text-xs font-mono font-medium outline-none focus:bg-muted/60 transition-colors" 
                      value={b.value ?? ""} 
                      onChange={(e) => updateBlock(idx, { value: e.target.value === "" ? null : Number(e.target.value) })} 
                      placeholder="Auto"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5" 
                      onClick={() => removeBlock(idx)}
                      aria-label="Remove block"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {b.auto && (
                    <span className="absolute top-3 right-3 bg-primary/10 text-primary text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter border border-primary/20 shadow-sm">
                      Auto
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 min-w-0 flex flex-col bg-muted/5 overflow-hidden transition-all duration-300">
        <header className="h-16 border-b bg-background flex items-center px-6 gap-4 shrink-0 shadow-sm z-10">
          {!isSidebarOpen && (
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} aria-label="Open sidebar">
              <PanelLeftOpen className="h-5 w-5" />
            </Button>
          )}
          <div className="flex-1 flex flex-col">
            <h1 className="font-bold text-lg leading-none truncate text-foreground/90">{sourceName} Analysis</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">Sankey Visualization</p>
          </div>
          <div className="px-4 py-2 bg-primary/5 rounded-2xl border border-primary/20 flex items-center gap-4 group hover:bg-primary/10 transition-colors cursor-default">
            <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-tighter">Total Flow</span>
            <span className="font-mono text-lg text-primary font-black leading-none tracking-tight">
              {splitTotal.toLocaleString()}
            </span>
          </div>
        </header>
        
        <div className="flex-1 p-6 lg:p-10 min-h-0 relative">
          <div className="w-full h-full bg-background rounded-[2.5rem] border shadow-2xl p-8 overflow-hidden flex items-center justify-center transition-all ring-1 ring-black/5 hover:shadow-primary/5">
            <FlowChart nodes={nodes} links={links} height={600} />
          </div>
        </div>
      </main>
    </div>
  );
}