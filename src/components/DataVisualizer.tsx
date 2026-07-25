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
import { Database, X, ChevronDown, Copy, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
    copyChartSvg, copyChartPng, copyChartHtml,
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
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isDockOpen && dockRef.current && !dockRef.current.contains(target)) {
        setIsDockOpen(false);
      }
    };
    
    const handleEscapeDock = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDockOpen) {
        setIsDockOpen(false);
      }
    };

    if (isDockOpen) {
      document.addEventListener("mousedown", handleClickOutside, true);
      document.addEventListener("keydown", handleEscapeDock);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      document.removeEventListener("keydown", handleEscapeDock);
    };
  }, [isDockOpen]);



  return (
    <>
      <div className="p-4 space-y-6" data-testid="data-visualizer">

        {/* --- Data Input Section (Float Dock) --- */}
        <div 
          ref={dockRef}
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center transition-all duration-300 pointer-events-none`}
        >
          {/* Paper Panel */}
          <div 
            className={`pointer-events-auto bg-background/90 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-border/50 rounded-2xl overflow-hidden transition-all duration-300 origin-bottom flex flex-col transform-gpu isolate ${
              isDockOpen ? "w-[95vw] sm:w-[85vw] md:w-[800px] h-[75vh] max-h-[750px] opacity-100 mb-4 scale-100" : "w-0 h-0 opacity-0 mb-0 scale-95"
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

          {/* Toggle Buttons */}
          <div className="pointer-events-auto flex flex-wrap justify-center items-center gap-2 sm:gap-3 w-full px-2">
            <div className="flex flex-col sm:flex-row justify-center items-center gap-y-3 sm:gap-4 bg-background/90 backdrop-blur-xl shadow-xl border border-border/50 py-3 sm:py-0 px-4 sm:px-5 min-h-[56px] rounded-[24px] sm:rounded-full transition-all duration-300 hover:shadow-2xl max-w-[95vw] transform-gpu isolate">
              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 justify-between sm:justify-center w-[160px] sm:w-auto">
                <button
                  onClick={() => {
                    if (sortConfig) {
                      setSortConfig({ ...sortConfig, direction: sortConfig.direction === "asc" ? "desc" : "asc" });
                    }
                  }}
                  disabled={!sortConfig}
                  className={`flex items-center justify-center w-7 h-7 rounded-full transition-colors ${
                    sortConfig 
                      ? "hover:bg-muted/80 text-foreground cursor-pointer shadow-sm border border-border/40" 
                      : "text-muted-foreground opacity-50 cursor-default"
                  }`}
                  title={sortConfig ? `Switch to ${sortConfig.direction === 'asc' ? 'descending' : 'ascending'}` : "Select a sort method first"}
                >
                  {!sortConfig && <ArrowUpDown className="w-3.5 h-3.5" />}
                  {sortConfig?.direction === "asc" && <ArrowUp className="w-3.5 h-3.5" />}
                  {sortConfig?.direction === "desc" && <ArrowDown className="w-3.5 h-3.5" />}
                </button>
                <span className="text-sm font-medium select-none hidden sm:inline ml-1">Sort:</span>
                <Select
                  value={sortConfig === null ? "none" : sortConfig.key}
                  onValueChange={(val) => {
                    if (val === "none") setSortConfig(null);
                    if (val === "value") setSortConfig({ key: "value", direction: "desc" });
                    if (val === "label") setSortConfig({ key: "label", direction: "asc" });
                  }}
                >
                  <SelectTrigger className="h-8 w-[80px] rounded-full text-xs font-medium border-border/50 bg-background/50 shadow-sm hover:bg-muted/50 transition-colors focus:ring-0 focus:ring-offset-0">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-xl border-border/50 min-w-[100px]">
                    <SelectItem value="none" className="text-sm cursor-pointer rounded-lg hover:bg-muted focus:bg-muted py-2">None</SelectItem>
                    <SelectItem value="value" className="text-sm cursor-pointer rounded-lg hover:bg-muted focus:bg-muted py-2">Value</SelectItem>
                    <SelectItem value="label" className="text-sm cursor-pointer rounded-lg hover:bg-muted focus:bg-muted py-2">Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="hidden sm:block w-px h-6 bg-border/50" />

              {/* Show Labels Toggle */}
              <div className="flex items-center gap-2.5 justify-between sm:justify-center w-[160px] sm:w-auto">
                <label htmlFor="show-labels-dock" className="text-sm font-medium cursor-pointer select-none">
                  Labels
                </label>
                <Switch
                  id="show-labels-dock"
                  checked={showLabels}
                  onCheckedChange={setShowLabels}
                  className="data-[state=checked]:bg-primary shadow-sm"
                />
              </div>

              <div className="hidden sm:block w-px h-6 bg-border/50" />

              {/* Show Legend Toggle */}
              <div className="flex items-center gap-2.5 justify-between sm:justify-center w-[160px] sm:w-auto">
                <label htmlFor="show-legend-dock" className="text-sm font-medium cursor-pointer select-none">
                  Legend
                </label>
                <Switch
                  id="show-legend-dock"
                  checked={showLegend}
                  onCheckedChange={setShowLegend}
                  className="data-[state=checked]:bg-primary shadow-sm"
                />
              </div>
            </div>
            
            <Button 
              size="lg" 
              className={`rounded-full shadow-xl h-14 px-6 gap-2 font-medium text-base transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 active:scale-95 ${
                isDockOpen ? "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-secondary/20" : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20"
              }`}
              onClick={() => setIsDockOpen(!isDockOpen)}
            >
              {isDockOpen ? (
                <>
                  <ChevronDown className="w-5 h-5" /> Hide Data
                </>
              ) : (
                <>
                  <Database className="w-5 h-5" /> Edit Data
                </>
              )}
            </Button>
          </div>
        </div>

        {/* --- Charts Section --- */}
        <div className={`space-y-6 ${showLabels ? 'fast-chart-labels-visible' : 'fast-chart-labels-hidden'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard
              title="Bar Chart"
              chartRef={barCardRef}
              onCopySvg={() => copyChartSvg(barCardRef.current)}
              onCopyPng={() => copyChartPng(barCardRef.current)}
              onCopyHtml={() => copyChartHtml(barCardRef.current)}
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
              onCopyHtml={() => copyChartHtml(pieCardRef.current)}
              onFullscreen={() => openFullscreen("pie")}
            >
              <div className={`w-full h-full ${!showLegend ? "fast-chart-legend-hidden" : ""}`}>
                <PieChart data={sortedData} total={total} containerRef={pieCardRef as React.RefObject<HTMLDivElement>} showFactText={showFactText} factIndex={pieFactIndex} onFactIndexChange={setPieFactIndex} />
              </div>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard
              title="100% Stacked Chart"
              chartRef={stackedCardRef}
              onCopySvg={() => copyChartSvg(stackedCardRef.current)}
              onCopyPng={() => copyChartPng(stackedCardRef.current)}
              onCopyHtml={() => copyChartHtml(stackedCardRef.current)}
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
                <StackedChart data={sortedData} isHorizontal={stackedHorizontal} containerRef={stackedCardRef as React.Ref<HTMLDivElement>} showLabels={showLabels} showRadial={stackedRadial} showFactText={showRadialFactText} factIndex={radialFactIndex} onFactIndexChange={setRadialFactIndex} />
              </div>
            </ChartCard>

            <ChartCard
              title="Line Chart - Linear"
              chartRef={lineCardRef}
              onCopySvg={() => copyChartSvg(lineCardRef.current)}
              onCopyPng={() => copyChartPng(lineCardRef.current)}
              onCopyHtml={() => copyChartHtml(lineCardRef.current)}
              onFullscreen={() => openFullscreen("line")}
              customActions={
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label htmlFor="line-color" className="text-xs text-muted-foreground cursor-pointer">
                      Line Color
                    </label>
                    <input
                      id="line-color"
                      type="color"
                      value={lineColor || sortedData[0]?.color || "#3b82f6"}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLineColor(e.target.value)}
                      className="w-5 h-5 p-0 cursor-pointer rounded-md border-border/50"
                    />
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
        <BarChart containerRef={fsRef} data={sortedData} isHorizontal={barHorizontal} showLabels={showLabels} />
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
            <PieChart containerRef={fsRef as React.RefObject<HTMLDivElement>} data={sortedData} total={total} showFactText={showFactText} isFullscreen={fullscreenChart === "pie"} factIndex={pieFactIndex} onFactIndexChange={setPieFactIndex} />
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
        <div className={`w-full h-full ${!showLegend ? "fast-chart-legend-hidden" : ""}`}>
          <StackedChart containerRef={fsRef as React.RefObject<HTMLDivElement>} data={sortedData} isHorizontal={stackedHorizontal} showLabels={showLabels} showRadial={stackedRadial} isFullscreen={fullscreenChart === "stacked"} showFactText={showRadialFactText} factIndex={radialFactIndex} onFactIndexChange={setRadialFactIndex} />
        </div>
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
              <input
                id="fullscreen-line-color"
                type="color"
                value={lineColor || sortedData[0]?.color || "#3b82f6"}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLineColor(e.target.value)}
                className="w-5 h-5 p-0 cursor-pointer rounded-md border-border/50"
              />
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
        <LineChart containerRef={fsRef as React.RefObject<HTMLDivElement>} data={sortedData} showLabels={showLabels} showGradientArea={showGradientArea} lineColor={lineColor} />
      </FullscreenModal>
    </>
  );
}
