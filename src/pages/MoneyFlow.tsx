import * as React from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FlowChart } from "@/components/charts";
import { useDataManipulation } from "@/hooks/useData";
import { INITIAL_DATA } from "@/config/constants";
import toast from "react-hot-toast";
import type { Datum } from "@/types";

export default function MoneyFlowPage() {
  const { data, total } = useDataManipulation(INITIAL_DATA as Datum[]);

  // Flow data state (nodes & links)
  const DEFAULT_NODES: { name: string }[] = React.useMemo(() => [
    { name: "Income" },
    { name: "Savings" },
    { name: "Expenses" },
    { name: "Rent" },
    { name: "Food" },
  ], []);
  const DEFAULT_LINKS = React.useMemo(() => [
    { source: 0, target: 1, value: 2000 },
    { source: 0, target: 2, value: 3000 },
    { source: 2, target: 3, value: 1500 },
    { source: 2, target: 4, value: 1500 },
  ], []);

  const [nodes, setNodes] = React.useState(DEFAULT_NODES);
  const [links, setLinks] = React.useState(DEFAULT_LINKS);

  React.useEffect(() => {
    console.debug("MoneyFlow nodes:", nodes);
  }, [nodes]);

  React.useEffect(() => {
    console.debug("MoneyFlow links:", links);
  }, [links]);


  // Split controls: total amount
  const [splitTotal, setSplitTotal] = React.useState<number>(10000);
  // Toggle automatic distribution when blocks/total change
  const [autoSplit, setAutoSplit] = React.useState<boolean>(true);

  // Blocks: allow user to add blocks with optional explicit values; remaining will be auto split
  const [blocks, setBlocks] = React.useState<Array<{ name: string; value: number | null; auto?: boolean; adjusted?: boolean }>>([]);


  const addBlock = () => {
    setBlocks((prev) => {
      const total = Math.max(0, Math.floor(splitTotal));
      const specified = prev.reduce((s, b) => s + (isFinite(b.value as number) && b.value != null ? Math.max(0, Math.floor(b.value as number)) : 0), 0);
      const remaining = Math.max(0, total - specified);

      // Prefer splitting the most recent block with an explicit numeric value
      const idxToSplit = (() => {
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].value != null && isFinite(prev[i].value as number)) return i;
        }
        return -1;
      })();

      if (idxToSplit >= 0) {
        const orig = Math.max(0, Math.floor(prev[idxToSplit].value as number));
        const take = Math.floor(orig / 2);
        if (take > 0) {
          const newPrev = prev.map((b, i) => (i === idxToSplit ? { ...b, value: orig - take } : b));
          return [...newPrev, { name: `Block ${prev.length + 1}`, value: take, auto: true }];
        }
        // if orig too small (0 or 1), fall through to remaining split
      }

      // Fallback: split remaining if any
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
      const updated = { ...b, ...next } as { name: string; value: number | null; auto?: boolean; adjusted?: boolean };
      // Any manual change should clear the auto/adjusted flags so user edits are respected
      if (Object.prototype.hasOwnProperty.call(next, 'value') || Object.prototype.hasOwnProperty.call(next, 'name')) {
        updated.auto = false;
        updated.adjusted = false;
      }
      return updated;
    }));
  };

  // Auto-distribute remaining amount among blocks whenever blocks or total changes (when enabled)
  React.useEffect(() => {
    if (!autoSplit) return;
    if (!Array.isArray(blocks) || blocks.length === 0) return;

    const total = Math.max(0, Math.floor(splitTotal));
    const specified = blocks.reduce((s, b) => s + (isFinite(b.value as number) && b.value != null ? Math.max(0, Math.floor(b.value as number)) : 0), 0);
    const remaining = total - specified;

    if (remaining < 0) {
      toast.error("Sum of specified block values exceeds total.");
      return;
    }

    // Consider only blocks that are not already auto-assigned and have no explicit value
    const targetIndexes = blocks.map((b, idx) => (b.value == null && !b.auto ? idx : -1)).filter((i) => i >= 0);

    if (targetIndexes.length === 0) {
      // If no target auto blocks and there's remaining amount, either adjust the last block (when autoSplit)
      // or notify the user and leave blocks unchanged.
      if (remaining > 0) {
        if (autoSplit && blocks.length > 0) {
          const lastIdx = blocks.length - 1;
          const newBlocks = blocks.map((b, i) => i === lastIdx ? { ...b, value: Math.max(0, (b.value ?? 0) + remaining), adjusted: true } : { ...b });
          setBlocks(newBlocks);
          const newNodes = [{ name: "Income" }, ...newBlocks.map((b) => ({ name: b.name }))];
          const newLinks = newBlocks.map((b, i) => ({ source: 0, target: i + 1, value: Math.max(0, b.value ?? 0) }));
          setNodes(newNodes);
          setLinks(newLinks);
          toast.success(`Adjusted '${newBlocks[lastIdx].name}' by ${remaining.toLocaleString()} to match total.`);
          return;
        }

        toast(`Remaining unassigned: ${remaining.toLocaleString()}`);
      }

      // update nodes/links to reflect the explicit blocks only
      const newNodes = [{ name: "Income" }, ...blocks.map((b) => ({ name: b.name }))];
      const newLinks = blocks.map((b, i) => ({ source: 0, target: i + 1, value: Math.max(0, b.value ?? 0) }));
      setNodes(newNodes);
      setLinks(newLinks);
      return;
    }

    // Distribute evenly among target blocks (leaving existing auto blocks untouched)
    const per = Math.floor(remaining / targetIndexes.length);
    let rem = remaining - per * targetIndexes.length;

    const newBlocks = blocks.map((b) => ({ ...b }));
    for (let idx of targetIndexes) {
      const assign = per + (rem > 0 ? 1 : 0);
      newBlocks[idx].value = assign;
      newBlocks[idx].auto = true;
      if (rem > 0) rem -= 1;
    }

    // Only update if values or auto flags changed
    const changed = newBlocks.some((b, i) => (b.value ?? null) !== (blocks[i].value ?? null) || (b.auto ?? false) !== (blocks[i].auto ?? false));
    if (changed) {
      setBlocks(newBlocks);
      const newNodes = [{ name: "Income" }, ...newBlocks.map((b) => ({ name: b.name }))];
      const newLinks = newBlocks.map((b, i) => ({ source: 0, target: i + 1, value: Math.max(0, b.value ?? 0) }));
      setNodes(newNodes);
      setLinks(newLinks);
    }
  }, [blocks, splitTotal, autoSplit]);





  const resetFlow = () => {
    setNodes(DEFAULT_NODES);
    setLinks(DEFAULT_LINKS);
    setBlocks([]);
  };

  // Sync blocks to nodes/links
  React.useEffect(() => {
    if (!Array.isArray(blocks) || blocks.length === 0) {
      setNodes(DEFAULT_NODES);
      setLinks(DEFAULT_LINKS);
      return;
    }

    const newNodes = [{ name: "Income" }, ...blocks.map((b) => ({ name: b.name }))];
    const newLinks = blocks.map((b, i) => ({ source: 0, target: i + 1, value: Math.max(0, b.value ?? 0) }));
    setNodes(newNodes);
    setLinks(newLinks);
  }, [blocks]);
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Money Flow</h1>
          <p className="text-sm text-muted-foreground">Visualize money flow across categories with a stacked / radial chart.</p>
        </div>
          <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Total</label>
            <input aria-label="Split total" type="number" min="0" className="w-28 rounded border px-2 py-1 text-sm" value={String(splitTotal)} onChange={(e) => setSplitTotal(Number(e.target.value))} />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-muted-foreground">Auto split</span>
            <Switch id="auto-split" checked={autoSplit} onCheckedChange={setAutoSplit} />
          </label>

          <Button variant="outline" size="sm" onClick={resetFlow}>Reset Flow</Button>
        </div>
      </div>

      <div className="rounded-lg border p-4 h-[640px]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
          <div className="md:col-span-2 h-full w-full flex items-center justify-center">
            <FlowChart nodes={nodes} links={links} height={520} />
          </div>

          <div className="md:col-span-1 h-full w-full flex flex-col gap-4">
            {/* Blocks editor */}
            <div className="rounded border p-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Blocks</h3>
                <div className="flex items-center gap-3">
                  <Button size="sm" onClick={addBlock}>New Block</Button>
                  <span className="text-xs text-muted-foreground">{autoSplit ? 'Auto-splitting enabled' : 'Manual mode'}</span>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {blocks.length === 0 && (
                  <div className="text-xs text-muted-foreground">No blocks. Click <strong>New Block</strong> to add sections.</div>
                )}

                {blocks.map((b, idx) => (
                  <div key={idx} className={`flex items-center gap-2 ${b.auto ? 'bg-gray-50 dark:bg-gray-800 rounded px-2 py-1' : ''}`}>
                    <input className="flex-1 rounded border px-2 py-1 text-sm" value={b.name} onChange={(e) => updateBlock(idx, { name: e.target.value })} />
                    <div className="flex items-center gap-2">
                      <input aria-label={`Block ${idx} value`} placeholder="auto" type="number" min="0" className="w-24 rounded border px-2 py-1 text-sm" value={b.value == null ? '' : String(b.value)} onChange={(e) => updateBlock(idx, { value: e.target.value === '' ? null : Number(e.target.value) })} />
                      {b.auto && <span title="Auto-assigned (won't change automatically)" className="text-xs text-muted-foreground px-2">auto</span>}
                      <Button variant="outline" size="sm" onClick={() => removeBlock(idx)}>Remove</Button>
                    </div>
                  </div>
                ))} 
              </div>
            </div>

            {/* Debug info to diagnose blank rendering */}
            <div className="rounded border p-3">
              <div className="text-sm">Nodes: <span className="font-mono">{nodes.length}</span> | Links: <span className="font-mono">{links.length}</span></div>
              <details className="mt-2 text-xs text-muted-foreground">
                <summary className="cursor-pointer">Show flow JSON</summary>
                <pre className="text-xs mt-2 whitespace-pre-wrap">{JSON.stringify({ nodes, links }, null, 2)}</pre>
              </details>
            </div>

            <div className="flex-1 rounded border p-3 overflow-auto">
              <h3 className="font-semibold mb-2">Derived Nodes</h3>
              <div className="space-y-2">
                {nodes.map((n, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="font-mono text-sm">{idx}</div>
                      <div>{n.name}</div>
                    </div>
                  </div>
                ))}
              </div>

              <h3 className="font-semibold mt-4 mb-2">Derived Links</h3>
              <div className="space-y-2">
                {links.map((l, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-4">
                      <div className="font-mono">{l.source}</div>
                      <div className="text-sm">→</div>
                      <div className="font-mono">{l.target}</div>
                      <div className="text-sm font-mono">{l.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {blocks.some(b => b.adjusted) && (
                <div className="mt-3 text-xs text-muted-foreground">Note: <strong>adjusted</strong> blocks were auto-updated to make the sum match the Total.</div>
              )}
            </div>

          </div>
        </div>
      </div>
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Total: <span className="font-mono">{total.toLocaleString()}</span></div>
          <div className="text-xs text-muted-foreground">Tip: edit values in Data Visualizer to see them here live.</div>
        </div>
      </div>
    </div>
  );
}
