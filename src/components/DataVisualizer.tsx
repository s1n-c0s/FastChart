"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import toast from "react-hot-toast";
import { generateId } from "@/lib/utils/data-parser";
import { PRESET_COLORS, INITIAL_DATA, INITIAL_MARKDOWN } from "@/config/constants";
import type { Datum } from "@/types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useCharts } from "@/hooks/useCharts";
import { useDataManipulation, useSort } from "@/hooks/useData";
import { SortableRow } from "./SortableRow";
import { ChartCard } from "./ChartCard";
import { FullscreenModal } from "./FullscreenModal";
import {
  BarChart,
  PieChart,
  LineChart,
  StackedChart
} from "../components/charts";
import { Database, X, ChevronDown, ChevronUp, SlidersHorizontal, Copy, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DataVisualizer() {
  // --- 1. จัดการข้อมูล (Data Layer) ---
  const { 
    data, setData, total, updateLabel, updateValue, updateColor, removeRow 
  } = useDataManipulation(INITIAL_DATA);
  
  const { sortedData, sortConfig, requestSort, setSortConfig } = useSort(data);

  // --- 2. จัดการแผนภูมิ (Chart Layer) ---
  const {
    barHorizontal, setBarHorizontal,
    stackedHorizontal, setStackedHorizontal,
    stackedRadial, setStackedRadial,
    fullscreenChart, openFullscreen, closeFullscreen,
    copyChartSvg, copyChartPng, copyChartEmbed,
    barCardRef, pieCardRef, stackedCardRef, lineCardRef
  } = useCharts();

  // --- 3. Local UI State ---
  const [markdownInput, setMarkdownInput] = useState(INITIAL_MARKDOWN);
  const [showLabels, setShowLabels] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [showFactText, setShowFactText] = useState(true);
  const [pieFactIndex, setPieFactIndex] = useState(0);

  const [radialFactIndex, setRadialFactIndex] = useState(0);
  const [showRadialFactText, setShowRadialFactText] = useState(true);
  const [showGradientArea, setShowGradientArea] = useState(true);
  const [lineColor, setLineColor] = useState<string | undefined>(undefined);
  const [isDockOpen, setIsDockOpen] = useState(false);
  const [isDockVisible, setIsDockVisible] = useState(true);
  const [isDockHovered, setIsDockHovered] = useState(false);
  const [isDockMinimized, setIsDockMinimized] = useState(false);
  const lastScrollY = useRef(0);
  
  const fsRef = useRef<HTMLDivElement>(null);

  // --- 6. Handlers for data transformation ---
  const parseMarkdownTable = useCallback((md: string): Datum[] => {
    const lines = md.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return [];

    const result: Datum[] = [];
    let itemCount = 0;
    const isMarkdownTable = lines.some((l) => l.includes("|"));

    if (!isMarkdownTable) {
      const headerLine = lines[0]?.toLowerCase().replace(/\s/g, "") || "";
      const hasHeader = headerLine.includes("label") && headerLine.includes("value");
      const dataLines = hasHeader ? lines.slice(1) : lines;

      let labelIndex = 0, valueIndex = 1, colorIndex = 2;
      if (hasHeader) {
        const parts = headerLine.split(",").map((s) => s.trim());
        labelIndex = parts.indexOf("label");
        valueIndex = parts.indexOf("value");
        colorIndex = parts.indexOf("color");
      }

      dataLines.forEach((line) => {
        const parts = line.split(",").map((s) => s.trim());
        if (parts.length >= 2) {
          const label = parts[labelIndex] || `Item ${itemCount + 1}`;
          const value = Number(parts[valueIndex]?.replace(/["\s,]/g, ""));
          const color = parts[colorIndex] || PRESET_COLORS[itemCount % PRESET_COLORS.length];

          if (isFinite(value)) {
            result.push({ id: generateId(), label, value: Math.max(0, value), color });
            itemCount++;
          }
        }
      });

      if (result.length) return result;
    }

    const startIdx = lines.length > 1 && /-\s*-/.test(lines[1]) ? 2 : 1;
    for (let i = startIdx; i < lines.length; i++) {
      const row = lines[i];
      if (!row.includes("|")) continue;

      const parts = row.split("|").map((s) => s.trim()).filter((s, idx, arr) => 
        !(idx === 0 && s === "") && !(idx === arr.length - 1 && s === "")
      );
      if (parts.length < 2) continue;

      const value = Number(parts[1]?.replace(/["\s,]/g, ""));
      if (isFinite(value)) {
        result.push({
          id: generateId(),
          label: parts[0] || `Item ${itemCount + 1}`,
          value: Math.max(0, value),
          color: parts[2] || PRESET_COLORS[itemCount % PRESET_COLORS.length],
        });
        itemCount++;
      }
    }

    return result;
  }, []);

  const transformData = useCallback(() => {
    const rows = parseMarkdownTable(markdownInput);
    if (rows.length) {
      setData(() => rows);
      toast.success("Data transformed successfully!", { duration: 900 });
    } else {
      toast.error("Error: Invalid data format or no data found.");
    }
  }, [markdownInput, parseMarkdownTable, setData]);

  const loadExample = useCallback((type: "csv" | "markdown") => {
    const examples = {
      csv: `Label,Value,Color\nA, 12, #3b82f6\nB, 30, #22c55e\nC, 18, #ef4444`,
      markdown: "| Label | Value | Color |\n|------:|------:|:-----:|\n| A     | 12    | #3b82f6 |\n| B     | 30    | #22c55e |\n| C     | 18    | #ef4444 |"
    };
    setMarkdownInput(examples[type]);
    toast.success(`${type.toUpperCase()} Example loaded!`, { duration: 900 });
  }, []);

  const exportToMarkdown = useCallback(() => {
    const header = "| Label | Value | Color |";
    const separator = "|------:|------:|:-----:|";
    const rows = sortedData.map(d => `| ${d.label} | ${d.value} | ${d.color} |`).join("\n");
    const markdown = `${header}\n${separator}\n${rows}`;
    setMarkdownInput(markdown);
    toast.success("Data exported to Markdown!", { duration: 900 });
  }, [sortedData]);

  const exportToCSV = useCallback(() => {
    const header = "Label,Value,Color";
    const rows = sortedData.map(d => `${d.label},${d.value},${d.color}`).join("\n");
    const csv = `${header}\n${rows}`;
    setMarkdownInput(csv);
    toast.success("Data exported to CSV!", { duration: 900 });
  }, [sortedData]);

  const addRow = useCallback(() => {
    const nextIndex = data.length;
    setData((prev) => [
      ...prev,
      {
        id: generateId(),
        label: `Item ${nextIndex + 1}`,
        value: 0,
        color: PRESET_COLORS[nextIndex % PRESET_COLORS.length],
      },
    ]);
    toast.success("Row added!", { duration: 900 });
  }, [data.length, setData]);

  // --- 7. Drag and Drop Sensors ---
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    if (sortConfig) return;

    const { active, over } = event;
    if (over && active.id !== over.id) {
      setData((prev) => {
        const oldIndex = prev.findIndex((d) => d.id === active.id);
        const newIndex = prev.findIndex((d) => d.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, [sortConfig, setData]);

  // --- 8. Fullscreen escape key handler ---
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fullscreenChart) {
        closeFullscreen();
      }
    };

    if (fullscreenChart) {
      document.body.style.overflow = 'hidden';
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [fullscreenChart, closeFullscreen]);

  // --- 9. Click outside dock handler ---
  const dockRef = useRef<HTMLDivElement>(null);
  const paperPanelRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // If the target is no longer in the document, it was likely a portal/popover 
      // (like a Radix Select item) that unmounted itself synchronously on click.
      if (!document.body.contains(target)) {
        return;
      }
      
      // Prevent closing when clicking inside a Radix Select dropdown (which renders in a portal outside the dock)
      if (target.closest('[data-radix-popper-content-wrapper]') || target.closest('[role="listbox"]') || target.closest('[data-slot="select-content"]')) {
        return;
      }

      if (
        isDockOpen && 
        dockRef.current && !dockRef.current.contains(target) &&
        paperPanelRef.current && !paperPanelRef.current.contains(target)
      ) {
        setIsDockOpen(false);
      }
    };
    
    const handleEscapeDock = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDockOpen) {
        setIsDockOpen(false);
      }
    };

    if (isDockOpen) {
      document.body.style.overflow = "hidden";
      document.addEventListener("mousedown", handleClickOutside, true);
      document.addEventListener("keydown", handleEscapeDock);
    }
    return () => {
      document.body.style.overflow = "unset";
      document.removeEventListener("mousedown", handleClickOutside, true);
      document.removeEventListener("keydown", handleEscapeDock);
    };
  }, [isDockOpen]);

  // --- 10. Auto-hide dock on scroll ---
  useEffect(() => {
    const handleScroll = () => {
      if (isDockOpen) return;
      const currentScrollY = window.scrollY;
      const diff = currentScrollY - lastScrollY.current;

      const isNearTop = currentScrollY <= 60;
      const isNearBottom = window.innerHeight + currentScrollY >= document.documentElement.scrollHeight - 80;

      if (isNearTop || isNearBottom) {
        setIsDockVisible(true);
      } else if (diff > 8 && currentScrollY > 80) {
        if (!isDockHovered) {
          setIsDockVisible(false);
        }
      } else if (diff < -8) {
        setIsDockVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY >= window.innerHeight - 80) {
        setIsDockVisible(true);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isDockOpen, isDockHovered]);

  useEffect(() => {
    if (isDockOpen) {
      setIsDockVisible(true);
    }
  }, [isDockOpen]);



  return (
    <>
      <div className="p-4 pb-28 sm:pb-36 space-y-6" data-testid="data-visualizer">

        {/* Backdrop for open Data Manager with smooth fade in / fade out */}
        <div 
          className={`fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-sm z-[60] transition-opacity duration-300 ease-out cursor-pointer ${
            isDockOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setIsDockOpen(false)}
          aria-hidden={!isDockOpen}
        />

        {/* --- Data Manager Modal (Paper Panel) --- */}
        {!fullscreenChart && (
          <div 
            ref={paperPanelRef}
            className={`fixed bottom-[72px] sm:bottom-[84px] left-1/2 -translate-x-1/2 z-[70] w-[95vw] sm:w-[85vw] md:w-[800px] h-[75vh] max-h-[calc(100vh-100px)] bg-background dark:bg-[#121214] shadow-2xl border border-border/80 rounded-2xl overflow-hidden transition-[transform,opacity,visibility] duration-250 ease-out origin-bottom flex flex-col transform-gpu isolate ${
              isDockOpen 
                ? "pointer-events-auto opacity-100 translate-y-0 scale-100 visible" 
                : "pointer-events-none opacity-0 translate-y-4 scale-[0.97] select-none invisible"
            }`}
          >
            <div className="flex items-center justify-between p-4 border-b bg-muted/40">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" /> Data Manager
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setIsDockOpen(false)} className="rounded-full h-8 w-8 hover:bg-muted">
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6">
              {/* Data Table */}
              <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                  <h3 className="text-base font-medium flex items-center gap-2">
                    Data Table {sortConfig && <span className="text-xs text-primary font-normal bg-primary/10 px-2 py-0.5 rounded-full">Sorted</span>}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-medium text-muted-foreground mr-1">Total: {total.toLocaleString()}</div>
                    <Button variant="outline" size="sm" className="h-8" onClick={exportToCSV}>CSV</Button>
                    <Button variant="outline" size="sm" className="h-8" onClick={exportToMarkdown}>MD</Button>
                    <Button variant="default" size="sm" className="h-8 shadow-sm" onClick={addRow}>Add Row</Button>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg border bg-background/50">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left py-3 px-3 min-w-[160px] font-medium text-muted-foreground">
                          <button
                            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                            onClick={() => requestSort("label")}
                          >
                            Label
                            {sortConfig?.key === "label" && (
                              <span className="text-primary">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                            )}
                            {!sortConfig && <span className="text-[10px] uppercase tracking-wider ml-1 opacity-60">(Drag)</span>}
                          </button>
                        </th>
                        <th className="text-left py-3 px-3 min-w-[120px] font-medium text-muted-foreground">
                          <button
                            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                            onClick={() => requestSort("value")}
                          >
                            Value
                            {sortConfig?.key === "value" && (
                              <span className="text-primary">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                            )}
                          </button>
                        </th>
                        <th className="text-left py-3 px-3 min-w-[120px] font-medium text-muted-foreground">Color</th>
                        <th className="text-left py-3 px-3 w-[100px] font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={data.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                          {sortedData.map((row) => (
                            <SortableRow
                              key={row.id}
                              row={row}
                              onUpdateLabel={updateLabel}
                              onUpdateValue={updateValue}
                              onUpdateColor={updateColor}
                              onRemove={removeRow}
                              presetColors={PRESET_COLORS}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Markdown Input */}
              <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-medium">Paste Data</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 gap-1.5 shadow-sm hover:bg-muted/50"
                    onClick={() => {
                      navigator.clipboard.writeText(markdownInput);
                      toast.success("Data copied to clipboard!", { duration: 900 });
                    }}
                  >
                    <Copy className="w-3.5 h-3.5" /> 
                    <span className="hidden sm:inline">Copy Data</span>
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <textarea
                    className="min-h-[140px] w-full rounded-xl border bg-background/50 px-4 py-3 font-mono text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary focus-visible:outline-none resize-y placeholder:text-muted-foreground/50 transition-shadow"
                    aria-label="Paste CSV or Markdown data"
                    placeholder="Paste your data here (CSV or Markdown Table)..."
                    value={markdownInput}
                    onChange={(e) => setMarkdownInput(e.target.value)}
                  />
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <Button onClick={transformData} className="w-full sm:w-auto shadow-sm">Transform to Table</Button>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button variant="secondary" size="sm" className="flex-1 sm:flex-none" onClick={() => loadExample("csv")}>CSV Example</Button>
                      <Button variant="secondary" size="sm" className="flex-1 sm:flex-none" onClick={() => loadExample("markdown")}>MD Example</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- Data Input Section (Float Dock) --- */}
        {!fullscreenChart && (
          <div 
            ref={dockRef}
            onMouseEnter={() => {
              setIsDockHovered(true);
              setIsDockVisible(true);
            }}
            onMouseLeave={() => setIsDockHovered(false)}
            className={`fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 ${
              isDockOpen ? "z-[70]" : "z-50"
            } flex flex-col items-center pointer-events-none transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu group/dock ${
              !isDockVisible && !isDockOpen 
                ? "translate-y-36 opacity-0 scale-95 pointer-events-none select-none" 
                : "translate-y-0 opacity-100 scale-100"
            }`}
          >
            {/* Dock Controls Container with Smooth Morphing Transition */}
            {(() => {
            const isExpanded = !isDockMinimized || isDockOpen;
            return (
              <div className="relative flex flex-col items-center">
                {/* Minimized Dock Trigger */}
                <div 
                  className={`transform-gpu ${
                    !isExpanded
                      ? "relative opacity-100 scale-100 pointer-events-auto transition-[transform,opacity] duration-200 delay-100 ease-out" 
                      : "absolute bottom-0 left-1/2 -translate-x-1/2 opacity-0 scale-95 pointer-events-none select-none transition-[transform,opacity] duration-100 ease-in"
                  }`}
                  aria-hidden={isExpanded}
                >
                  <button 
                    type="button"
                    className="flex items-center gap-2.5 bg-background/90 dark:bg-background/80 backdrop-blur-xl border border-border/60 h-11 sm:h-12 px-4 rounded-full transition-colors duration-200 cursor-pointer text-xs sm:text-sm font-medium text-foreground select-none active:scale-95 shadow-md hover:shadow-lg hover:bg-background whitespace-nowrap"
                    onClick={() => setIsDockMinimized(false)}
                    disabled={isExpanded}
                    title="Expand dock controls"
                    aria-label="Expand dock controls"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-primary" />
                    <span>Tools & Data</span>
                    <ChevronUp className="w-4 h-4 text-muted-foreground ml-0.5" />
                  </button>
                </div>

                {/* Expanded Dock Controls Bar with Floating Minimize Button */}
                <div 
                  className={`flex items-center justify-center max-w-[95vw] transform-gpu ${
                    isExpanded
                      ? "relative opacity-100 scale-100 pointer-events-auto transition-[transform,opacity] duration-200 delay-100 ease-out" 
                      : "absolute bottom-0 left-1/2 -translate-x-1/2 opacity-0 scale-95 pointer-events-none select-none transition-[transform,opacity] duration-100 ease-in"
                  }`}
                  aria-hidden={!isExpanded}
                >
                  {/* Floating Upper Minimize Button (floats directly above controls bar with zero layout shift) */}
                  <div 
                    className={`absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none transform-gpu ${
                      isExpanded && !isDockOpen
                        ? "opacity-100 scale-100 transition-[transform,opacity] duration-200 delay-100 ease-out" 
                        : "opacity-0 scale-75 transition-[transform,opacity] duration-100 ease-in"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setIsDockMinimized(true)}
                      disabled={!isExpanded || isDockOpen}
                      className={`flex items-center justify-center w-12 sm:w-14 h-7 sm:h-8 rounded-full bg-background/90 dark:bg-background/80 backdrop-blur-xl border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-[opacity,transform,background-color,color] duration-150 transform-gpu active:scale-95 cursor-pointer origin-center ${
                        isExpanded && !isDockOpen
                          ? `pointer-events-auto ${
                              isDockHovered 
                                ? "opacity-100 scale-100 shadow-md" 
                                : "opacity-40 scale-75 shadow-none group-hover/dock:opacity-100 group-hover/dock:scale-100 group-hover/dock:shadow-md group-focus-within/dock:opacity-100 group-focus-within/dock:scale-100"
                            }` 
                          : "opacity-0 scale-75 pointer-events-none"
                      }`}
                      title="Minimize dock"
                      aria-label="Minimize dock"
                    >
                      <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.25]" />
                    </button>
                  </div>

                  <div className={`flex items-center justify-center gap-2 transition-opacity duration-200 ${
                    isExpanded ? "pointer-events-auto" : "pointer-events-none"
                  } ${
                    isDockHovered || isDockOpen
                      ? "opacity-100"
                      : "opacity-75 sm:opacity-80 group-hover/dock:opacity-100 group-focus-within/dock:opacity-100"
                  }`}>
                    <div className="flex flex-row items-center gap-1.5 sm:gap-2.5 bg-background/90 dark:bg-background/80 backdrop-blur-xl shadow-lg border border-border/60 px-3 sm:px-4 h-11 sm:h-12 rounded-full hover:shadow-xl transition-all duration-200 transform-gpu isolate">
                      {/* Sort Controls */}
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (sortConfig) {
                              setSortConfig({ ...sortConfig, direction: sortConfig.direction === "asc" ? "desc" : "asc" });
                            }
                          }}
                          disabled={!sortConfig || !isExpanded}
                          className={`flex items-center justify-center w-6 h-6 rounded-full transition-colors ${
                            sortConfig 
                              ? "hover:bg-muted/80 text-foreground cursor-pointer border border-border/40 shadow-xs" 
                              : "text-muted-foreground opacity-40 cursor-default"
                          }`}
                          title={sortConfig ? `Switch to ${sortConfig.direction === 'asc' ? 'descending' : 'ascending'}` : "Select a sort method first"}
                        >
                          {!sortConfig && <ArrowUpDown className="w-3 h-3" />}
                          {sortConfig?.direction === "asc" && <ArrowUp className="w-3 h-3" />}
                          {sortConfig?.direction === "desc" && <ArrowDown className="w-3 h-3" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (sortConfig === null) {
                              setSortConfig({ key: "label", direction: "asc" });
                            } else if (sortConfig.key === "label") {
                              setSortConfig({ key: "value", direction: "desc" });
                            } else {
                              setSortConfig(null);
                            }
                          }}
                          disabled={!isExpanded}
                          className="text-xs font-medium select-none hidden sm:inline cursor-pointer hover:text-primary transition-colors"
                          title="Click to cycle sort: Name → Value → None"
                        >
                          Sort:
                        </button>
                        <Select
                          value={sortConfig === null ? "none" : sortConfig.key}
                          disabled={!isExpanded}
                          onValueChange={(val) => {
                            if (val === "none") setSortConfig(null);
                            if (val === "value") setSortConfig({ key: "value", direction: "desc" });
                            if (val === "label") setSortConfig({ key: "label", direction: "asc" });
                          }}
                        >
                          <SelectTrigger className="h-7 w-[74px] sm:w-[78px] rounded-full text-xs font-medium border-border/50 bg-background/50 shadow-none hover:bg-muted/50 transition-colors focus:ring-0 focus:ring-offset-0 px-2 sm:px-2.5">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-xl border-border/50 min-w-[100px]">
                            <SelectItem value="none" className="text-xs cursor-pointer rounded-lg hover:bg-muted focus:bg-muted py-1.5">None</SelectItem>
                            <SelectItem value="value" className="text-xs cursor-pointer rounded-lg hover:bg-muted focus:bg-muted py-1.5">Value</SelectItem>
                            <SelectItem value="label" className="text-xs cursor-pointer rounded-lg hover:bg-muted focus:bg-muted py-1.5">Name</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-px h-4 sm:h-5 bg-border/60" />

                      {/* Show Labels Toggle */}
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <label htmlFor="show-labels-dock" className="text-xs font-medium cursor-pointer select-none">
                          Labels
                        </label>
                        <Switch
                          id="show-labels-dock"
                          checked={showLabels}
                          disabled={!isExpanded}
                          onCheckedChange={setShowLabels}
                          className="scale-85 sm:scale-90 data-[state=checked]:bg-primary shadow-xs"
                        />
                      </div>

                      <div className="w-px h-4 sm:h-5 bg-border/60" />

                      {/* Show Legend Toggle */}
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <label htmlFor="show-legend-dock" className="text-xs font-medium cursor-pointer select-none">
                          Legend
                        </label>
                        <Switch
                          id="show-legend-dock"
                          checked={showLegend}
                          disabled={!isExpanded}
                          onCheckedChange={setShowLegend}
                          className="scale-85 sm:scale-90 data-[state=checked]:bg-primary shadow-xs"
                        />
                      </div>
                    </div>

                    {/* Edit Data / Hide Data Button */}
                    <Button 
                      size="default" 
                      disabled={!isExpanded}
                      className={`rounded-full shadow-lg h-11 sm:h-12 px-3.5 sm:px-5 gap-1.5 sm:gap-2 font-medium text-xs sm:text-sm transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 ${
                        isExpanded ? "pointer-events-auto" : "pointer-events-none"
                      } ${
                        isDockOpen 
                          ? "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-secondary/15" 
                          : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/15"
                      }`}
                      onClick={() => setIsDockOpen(!isDockOpen)}
                    >
                      {isDockOpen ? (
                        <>
                          <ChevronDown className="w-4 h-4" /> Hide Data
                        </>
                      ) : (
                        <>
                          <Database className="w-4 h-4" /> Edit Data
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

        {/* --- Charts Section --- */}
        <div className={`space-y-6 ${showLabels ? 'fast-chart-labels-visible' : 'fast-chart-labels-hidden'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard
              title="Bar Chart"
              chartRef={barCardRef}
              onCopySvg={() => copyChartSvg(barCardRef.current)}
              onCopyPng={() => copyChartPng(barCardRef.current)}
              onCopyHtml={() => copyChartEmbed({ type: 'bar', data: sortedData, options: { isHorizontal: barHorizontal, showLabels } })}
              onFullscreen={() => openFullscreen("bar")}
              showOrientation
              isHorizontal={barHorizontal}
              onToggleOrientation={() => setBarHorizontal(!barHorizontal)}
            >
              <BarChart 
                data={sortedData} 
                containerRef={barCardRef as React.RefObject<HTMLDivElement>}
                isHorizontal={barHorizontal}
                showLabels={showLabels}
              />
            </ChartCard>

            <ChartCard
              title="Donut Chart"
              chartRef={pieCardRef}
              customActions={
                <div className="flex flex-wrap items-center gap-2">
                  
            <Select value={pieFactIndex.toString()} onValueChange={(val) => setPieFactIndex(Number(val))}>
                    <SelectTrigger className="h-8 w-32 bg-transparent text-xs" style={{ fontSize: 12 }}>
                      <SelectValue placeholder="Fact Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Total</SelectItem>
                      <SelectItem value="1">The most</SelectItem>
                      <SelectItem value="2">The Lowest</SelectItem>
                    </SelectContent>
                  </Select>
                  <label htmlFor="show-fact-text" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
                    Fact Text
                  </label>
                  <Switch
                    id="show-fact-text"
                    checked={showFactText}
                    onCheckedChange={setShowFactText}
                  />
                </div>
              }
              onCopySvg={() => copyChartSvg(pieCardRef.current)}
              onCopyPng={() => copyChartPng(pieCardRef.current)}
              onCopyHtml={() => copyChartEmbed({ type: 'pie', data: sortedData, total, options: { showFactText, factIndex: pieFactIndex, showLegend } })}
              onFullscreen={() => openFullscreen("pie")}
            >
              <div className={`w-full h-full ${!showLegend ? "fast-chart-legend-hidden" : ""}`}>
                <PieChart data={sortedData} total={total} containerRef={pieCardRef as React.RefObject<HTMLDivElement>} showLegend={showLegend} showFactText={showFactText} factIndex={pieFactIndex} onFactIndexChange={setPieFactIndex} />
              </div>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard
              title="100% Stacked Chart"
              chartRef={stackedCardRef}
              onCopySvg={() => copyChartSvg(stackedCardRef.current)}
              onCopyPng={() => copyChartPng(stackedCardRef.current)}
              onCopyHtml={() => copyChartEmbed({ type: 'stacked', data: sortedData, options: { isHorizontal: stackedHorizontal, showLabels, showRadial: stackedRadial, showFactText: showRadialFactText, factIndex: radialFactIndex, showLegend } })}
              onFullscreen={() => openFullscreen("stacked")}
              showOrientation={!stackedRadial}
              isHorizontal={stackedHorizontal}
              onToggleOrientation={() => setStackedHorizontal(!stackedHorizontal)}
              customActions={
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor="show-radial" className="text-xs text-muted-foreground cursor-pointer">
                    Radial
                  </label>
                  <Switch
                    id="show-radial"
                    checked={stackedRadial}
                    onCheckedChange={setStackedRadial}
                  />
                  {stackedRadial && (
                    <>
                      <div className="w-px h-4 bg-border mx-1" />
                      <label htmlFor="show-radial-fact-text" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
                        Fact Text
                      </label>
                      <Switch
                        id="show-radial-fact-text"
                        checked={showRadialFactText}
                        onCheckedChange={setShowRadialFactText}
                      />
                    </>
                  )}
                </div>
              }
            >
              <div className={`w-full h-full ${!showLegend ? "fast-chart-legend-hidden" : ""}`}>
                <StackedChart data={sortedData} isHorizontal={stackedHorizontal} containerRef={stackedCardRef as React.Ref<HTMLDivElement>} showLabels={showLabels} showRadial={stackedRadial} showLegend={showLegend} showFactText={showRadialFactText} factIndex={radialFactIndex} onFactIndexChange={setRadialFactIndex} />
              </div>
            </ChartCard>

            <ChartCard
              title="Line Chart - Linear"
              chartRef={lineCardRef}
              onCopySvg={() => copyChartSvg(lineCardRef.current)}
              onCopyPng={() => copyChartPng(lineCardRef.current)}
              onCopyHtml={() => copyChartEmbed({ type: 'line', data: sortedData, options: { showLabels, showGradientArea, lineColor, showLegend } })}
              onFullscreen={() => openFullscreen("line")}
              customActions={
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label htmlFor="line-color" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
                      Line Color
                    </label>
                    <input
                      id="line-color"
                      type="color"
                      value={lineColor || sortedData[0]?.color || "#3b82f6"}
                      onChange={(e) => setLineColor(e.target.value)}
                      className="sr-only opacity-0 absolute pointer-events-none"
                      tabIndex={-1}
                    />
                    <Select 
                      value={lineColor || sortedData[0]?.color || "#3b82f6"} 
                      onValueChange={(val) => {
                        if (val === "custom_trigger") {
                          document.getElementById('line-color')?.click();
                        } else {
                          setLineColor(val);
                        }
                      }}
                    >
                      <SelectTrigger className="w-fit h-7 gap-2 px-2">
                        <SelectValue asChild>
                          <div className="flex items-center gap-2 w-full text-left">
                            <div 
                              className="w-3 h-3 rounded-full shadow-inner shrink-0" 
                              style={{ backgroundColor: lineColor || sortedData[0]?.color || "#3b82f6" }} 
                            />
                            <span className="truncate text-xs">{lineColor || sortedData[0]?.color || "#3b82f6"}</span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom_trigger" className="pr-4 mb-1 border-b border-border/50 rounded-none cursor-pointer">
                          <div className="flex items-center gap-2 text-foreground font-medium">
                            <span className="text-xs">🎨 Custom Color...</span>
                          </div>
                        </SelectItem>
                        {!(PRESET_COLORS as readonly string[]).includes(lineColor || sortedData[0]?.color || "#3b82f6") && (
                          <SelectItem value={lineColor || sortedData[0]?.color || "#3b82f6"} className="hidden pr-4">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full shadow-inner shrink-0"
                                style={{ backgroundColor: lineColor || sortedData[0]?.color || "#3b82f6" }}
                              />
                              <span className="font-mono text-xs">{lineColor || sortedData[0]?.color || "#3b82f6"}</span>
                            </div>
                          </SelectItem>
                        )}
                        {PRESET_COLORS.map((c) => (
                          <SelectItem key={c} value={c} className="pr-4 cursor-pointer">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full shadow-inner shrink-0"
                                style={{ backgroundColor: c }}
                              />
                              <span className="font-mono text-xs">{c}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="show-gradient" className="text-xs text-muted-foreground cursor-pointer">
                      Gradient area
                    </label>
                    <Switch
                      id="show-gradient"
                      checked={showGradientArea}
                      onCheckedChange={setShowGradientArea}
                    />
                  </div>
                </div>
              }
            >
              <LineChart 
                data={sortedData} 
                containerRef={lineCardRef as React.Ref<HTMLDivElement>}
                showLabels={showLabels}
                showGradientArea={showGradientArea}
                lineColor={lineColor}
              />
            </ChartCard>
          </div>
        </div>
      </div>

      {/* --- Fullscreen Modals --- */}
      <FullscreenModal showLabels={showLabels}
        isOpen={fullscreenChart === "bar"}
        onClose={closeFullscreen}
        chartType="bar"
        onCopySvg={() => copyChartSvg(fsRef.current)}
        onCopyPng={() => copyChartPng(fsRef.current)}
        showOrientation
        isHorizontal={barHorizontal}
        onToggleOrientation={() => setBarHorizontal(!barHorizontal)}
      >
        {fullscreenChart === "bar" && (
          <BarChart containerRef={fsRef} data={sortedData} isHorizontal={barHorizontal} showLabels={showLabels} />
        )}
      </FullscreenModal>

      <FullscreenModal showLabels={showLabels}
        isOpen={fullscreenChart === "pie"}
        onClose={closeFullscreen}
        chartType="pie"
        onCopySvg={() => copyChartSvg(fsRef.current)}
        onCopyPng={() => copyChartPng(fsRef.current)}
        customActions={
          <div className="flex items-center gap-2">
            
            <Select value={pieFactIndex.toString()} onValueChange={(val) => setPieFactIndex(Number(val))}>
              <SelectTrigger className="h-8 w-32 bg-transparent text-xs" style={{ fontSize: 12 }}>
                <SelectValue placeholder="Fact Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Total</SelectItem>
                <SelectItem value="1">The most</SelectItem>
                <SelectItem value="2">The Lowest</SelectItem>
              </SelectContent>
            </Select>
            <label htmlFor="fs-show-fact-text" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
              Fact Text
            </label>
            <Switch
              id="fs-show-fact-text"
              checked={showFactText}
              onCheckedChange={setShowFactText}
            />
          </div>
        }
      >
        {fullscreenChart === "pie" && (
          <div className={`w-full h-full ${!showLegend ? "fast-chart-legend-hidden" : ""}`}>
            <PieChart containerRef={fsRef as React.RefObject<HTMLDivElement>} data={sortedData} total={total} showLegend={showLegend} showFactText={showFactText} isFullscreen={fullscreenChart === "pie"} factIndex={pieFactIndex} onFactIndexChange={setPieFactIndex} />
          </div>
        )}
      </FullscreenModal>

      <FullscreenModal showLabels={showLabels}
        isOpen={fullscreenChart === "stacked"}
        onClose={closeFullscreen}
        chartType="stacked"
        onCopySvg={() => copyChartSvg(fsRef.current)}
        onCopyPng={() => copyChartPng(fsRef.current)}
        showOrientation={!stackedRadial}
        isHorizontal={stackedHorizontal}
        onToggleOrientation={() => setStackedHorizontal(!stackedHorizontal)}
        customActions={
          <div className="flex items-center gap-2">
            <label htmlFor="fullscreen-show-radial" className="text-xs text-muted-foreground cursor-pointer">
              Radial
            </label>
            <Switch
              id="fullscreen-show-radial"
              checked={stackedRadial}
              onCheckedChange={setStackedRadial}
            />
            {stackedRadial && (
              <>
                <div className="w-px h-4 bg-border mx-1" />
                <label htmlFor="fs-show-radial-fact-text" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
                  Fact Text
                </label>
                <Switch
                  id="fs-show-radial-fact-text"
                  checked={showRadialFactText}
                  onCheckedChange={setShowRadialFactText}
                />
              </>
            )}
          </div>
        }
      >
        {fullscreenChart === "stacked" && (
          <div className={`w-full h-full ${!showLegend ? "fast-chart-legend-hidden" : ""}`}>
            <StackedChart containerRef={fsRef as React.RefObject<HTMLDivElement>} data={sortedData} isHorizontal={stackedHorizontal} showLabels={showLabels} showRadial={stackedRadial} isFullscreen={fullscreenChart === "stacked"} showLegend={showLegend} showFactText={showRadialFactText} factIndex={radialFactIndex} onFactIndexChange={setRadialFactIndex} />
          </div>
        )}
      </FullscreenModal>

      <FullscreenModal showLabels={showLabels}
        isOpen={fullscreenChart === "line"}
        onClose={closeFullscreen}
        chartType="line"
        onCopySvg={() => copyChartSvg(fsRef.current)}
        onCopyPng={() => copyChartPng(fsRef.current)}
        customActions={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="fullscreen-line-color" className="text-xs text-muted-foreground cursor-pointer">
                Line Color
              </label>
              <Select value={lineColor || sortedData[0]?.color || "#3b82f6"} onValueChange={(color) => setLineColor(color)}>
                <SelectTrigger id="fullscreen-line-color" className="w-fit h-7 gap-2 px-2">
                  <SelectValue asChild>
                    <div className="flex items-center gap-2 w-full text-left">
                      <div 
                        className="w-3 h-3 rounded-full shadow-inner shrink-0" 
                        style={{ backgroundColor: lineColor || sortedData[0]?.color || "#3b82f6" }} 
                      />
                      <span className="truncate text-xs">{lineColor || sortedData[0]?.color || "#3b82f6"}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PRESET_COLORS.map((c) => (
                    <SelectItem key={c} value={c} className="pr-4">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full shadow-inner shrink-0"
                          style={{ backgroundColor: c }}
                        />
                        <span className="font-mono text-xs">{c}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="fullscreen-show-gradient" className="text-xs text-muted-foreground cursor-pointer">
                Gradient area
              </label>
              <Switch
                id="fullscreen-show-gradient"
                checked={showGradientArea}
                onCheckedChange={setShowGradientArea}
              />
            </div>
          </div>
        }
      >
        {fullscreenChart === "line" && (
          <LineChart containerRef={fsRef as React.RefObject<HTMLDivElement>} data={sortedData} showLabels={showLabels} showGradientArea={showGradientArea} lineColor={lineColor} />
        )}
      </FullscreenModal>
    </>
  );
}
