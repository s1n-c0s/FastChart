"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Database, X, ChevronDown } from "lucide-react";

export default function DataVisualizer() {
  // --- 1. จัดการข้อมูล (Data Layer) ---
  const { 
    data, setData, total, updateLabel, updateValue, updateColor, removeRow 
  } = useDataManipulation(INITIAL_DATA);
  
  const { sortedData, sortConfig, requestSort } = useSort(data);

  // --- 2. จัดการแผนภูมิ (Chart Layer) ---
  const {
    barHorizontal, setBarHorizontal,
    stackedHorizontal, setStackedHorizontal,
    stackedRadial, setStackedRadial,
    fullscreenChart, openFullscreen, closeFullscreen,
    copyChartSvg, copyChartPng,
    barCardRef, pieCardRef, stackedCardRef, lineCardRef
  } = useCharts();

  // --- 3. Local UI State ---
  const [markdownInput, setMarkdownInput] = useState(INITIAL_MARKDOWN);
  const [showLabels, setShowLabels] = useState(false);
  const [showGradientArea, setShowGradientArea] = useState(true);
  const [isDockOpen, setIsDockOpen] = useState(false);

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

  const chartRefs = { bar: barCardRef, pie: pieCardRef, stacked: stackedCardRef, line: lineCardRef };

  return (
    <>
      <div className="p-4 space-y-6" data-testid="data-visualizer">
        {/* --- Header --- */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Data Visualizer</h1>
            <p className="text-base text-muted-foreground">
              Edit values in either panel to update the charts live.
            </p>
          </div>
        </div>

        {/* --- Data Input Section (Float Dock) --- */}
        <div 
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center transition-all duration-300 pointer-events-none`}
        >
          {/* Paper Panel */}
          <div 
            className={`pointer-events-auto bg-background/95 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-border/50 rounded-2xl overflow-hidden transition-all duration-300 origin-bottom flex flex-col ${
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
          <div className="pointer-events-auto flex items-center gap-3">
            <div className="flex items-center gap-3 bg-background/95 backdrop-blur-xl shadow-xl border border-border/50 px-5 h-14 rounded-full transition-all duration-300 hover:shadow-2xl">
              <label htmlFor="show-labels-dock" className="text-sm font-medium cursor-pointer select-none">
                Show Labels
              </label>
              <Switch
                id="show-labels-dock"
                checked={showLabels}
                onCheckedChange={setShowLabels}
              />
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard
              title="Bar Chart"
              chartRef={barCardRef}
              onCopySvg={() => copyChartSvg(barCardRef.current)}
              onCopyPng={() => copyChartPng(barCardRef.current)}
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
              title="Pie Chart - Donut with Total"
              chartRef={pieCardRef}
              onCopySvg={() => copyChartSvg(pieCardRef.current)}
              onCopyPng={() => copyChartPng(pieCardRef.current)}
              onFullscreen={() => openFullscreen("pie")}
            >
              <PieChart 
                data={sortedData} 
                total={total} 
                containerRef={pieCardRef as React.RefObject<HTMLDivElement>}
              />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard
              title="100% Stacked Chart"
              chartRef={stackedCardRef}
              onCopySvg={() => copyChartSvg(stackedCardRef.current)}
              onCopyPng={() => copyChartPng(stackedCardRef.current)}
              onFullscreen={() => openFullscreen("stacked")}
              showOrientation={!stackedRadial}
              isHorizontal={stackedHorizontal}
              onToggleOrientation={() => setStackedHorizontal(!stackedHorizontal)}
              customActions={
                <div className="flex items-center gap-2">
                  <label htmlFor="show-radial" className="text-xs text-muted-foreground cursor-pointer">
                    Radial
                  </label>
                  <Switch
                    id="show-radial"
                    checked={stackedRadial}
                    onCheckedChange={setStackedRadial}
                  />
                </div>
              }
            >
              <StackedChart 
                data={sortedData} 
                containerRef={stackedCardRef as React.RefObject<HTMLDivElement>}
                isHorizontal={stackedHorizontal}
                showLabels={showLabels}
                showRadial={stackedRadial}
              />
            </ChartCard>

            <ChartCard
              title="Line Chart - Linear"
              chartRef={lineCardRef}
              onCopySvg={() => copyChartSvg(lineCardRef.current)}
              onCopyPng={() => copyChartPng(lineCardRef.current)}
              onFullscreen={() => openFullscreen("line")}
              customActions={
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
              }
            >
              <LineChart 
                data={sortedData} 
                containerRef={lineCardRef as React.RefObject<HTMLDivElement>}
                showLabels={showLabels}
                showGradientArea={showGradientArea}
              />
            </ChartCard>
          </div>
        </div>
      </div>

      {/* --- Fullscreen Modals --- */}
      <FullscreenModal
        isOpen={fullscreenChart === "bar"}
        onClose={closeFullscreen}
        chartType="bar"
        onCopySvg={() => copyChartSvg(chartRefs.bar.current)}
        onCopyPng={() => copyChartPng(chartRefs.bar.current)}
        showOrientation
        isHorizontal={barHorizontal}
        onToggleOrientation={() => setBarHorizontal(!barHorizontal)}
      >
        <BarChart data={sortedData} isHorizontal={barHorizontal} showLabels={showLabels} />
      </FullscreenModal>

      <FullscreenModal
        isOpen={fullscreenChart === "pie"}
        onClose={closeFullscreen}
        chartType="pie"
        onCopySvg={() => copyChartSvg(chartRefs.pie.current)}
        onCopyPng={() => copyChartPng(chartRefs.pie.current)}
      >
        <PieChart data={sortedData} total={total} isFullscreen={true} />
      </FullscreenModal>

      <FullscreenModal
        isOpen={fullscreenChart === "stacked"}
        onClose={closeFullscreen}
        chartType="stacked"
        onCopySvg={() => copyChartSvg(chartRefs.stacked.current)}
        onCopyPng={() => copyChartPng(chartRefs.stacked.current)}
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
          </div>
        }
      >
        <StackedChart data={sortedData} isHorizontal={stackedHorizontal} showLabels={showLabels} showRadial={stackedRadial} isFullscreen={fullscreenChart === "stacked"} />
      </FullscreenModal>

      <FullscreenModal
        isOpen={fullscreenChart === "line"}
        onClose={closeFullscreen}
        chartType="line"
        onCopySvg={() => copyChartSvg(chartRefs.line.current)}
        onCopyPng={() => copyChartPng(chartRefs.line.current)}
        customActions={
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
        }
      >
        <LineChart data={sortedData} showLabels={showLabels} showGradientArea={showGradientArea} />
      </FullscreenModal>
    </>
  );
}
