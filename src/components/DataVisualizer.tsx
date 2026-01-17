"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import toast, { Toaster } from "react-hot-toast";
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
    fullscreenChart, openFullscreen, closeFullscreen,
    copyChartSvg, copyChartPng,
    barCardRef, pieCardRef, stackedCardRef, lineCardRef
  } = useCharts();

  // --- 3. Local UI State ---
  const [markdownInput, setMarkdownInput] = useState(INITIAL_MARKDOWN);
  const [showLabels, setShowLabels] = useState(false);
  const [showGradientArea, setShowGradientArea] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark") || 
             window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  // --- 4. Dark mode effect ---
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDarkMode]);

  // --- 5. Memoized calculations ---

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

          <label 
            htmlFor="theme-toggle"
            className="flex items-center gap-4 px-6 py-3 rounded-full bg-muted/50 border w-fit shadow-sm cursor-pointer hover:bg-muted transition-colors select-none"
          >
            <span className="text-lg font-semibold">Dark Mode</span>
            <div className="scale-150 origin-center flex items-center">
              <Switch 
                id="theme-toggle"
                checked={isDarkMode} 
                onCheckedChange={setIsDarkMode} 
                aria-label="Toggle dark mode"
              />
            </div>
          </label>
        </div>

        {/* --- Data Input Section --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Data Table */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-medium">
                Data Table {sortConfig && <span className="text-sm text-primary">(Sorted)</span>}
              </h2>
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground">Total: {total.toLocaleString()}</div>
                <Button variant="outline" size="sm" onClick={exportToCSV}>Export CSV</Button>
                <Button variant="outline" size="sm" onClick={exportToMarkdown}>Export MD</Button>
                <Button variant="secondary" onClick={addRow}>Add Row</Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-2 min-w-[160px]">
                      <button
                        className="inline-flex items-center gap-1 font-semibold hover:text-foreground/80 transition-colors"
                        onClick={() => requestSort("label")}
                      >
                        Label
                        {sortConfig?.key === "label" && (
                          <span>{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                        )}
                        {!sortConfig && <span className="text-xs text-muted-foreground ml-1">(Drag)</span>}
                      </button>
                    </th>
                    <th className="text-left py-2 pr-2 min-w-[120px]">
                      <button
                        className="inline-flex items-center gap-1 font-semibold hover:text-foreground/80 transition-colors"
                        onClick={() => requestSort("value")}
                      >
                        Value
                        {sortConfig?.key === "value" && (
                          <span>{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                        )}
                      </button>
                    </th>
                    <th className="text-left py-2 pr-2 min-w-[120px]">Color</th>
                    <th className="text-left py-2 pr-2">Actions</th>
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
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-medium">Paste Data</h2>
              <div className="flex items-center gap-2">
                <label htmlFor="show-labels" className="text-sm text-muted-foreground cursor-pointer">
                  Show labels
                </label>
                <Switch
                  id="show-labels"
                  checked={showLabels}
                  onCheckedChange={setShowLabels}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <textarea
                className="min-h-[160px] w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
                aria-label="Paste CSV or Markdown data"
                placeholder="Paste your data here..."
                value={markdownInput}
                onChange={(e) => setMarkdownInput(e.target.value)}
              />
              <div className="flex items-center justify-between gap-2">
                <Button onClick={transformData}>Transform to Table</Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => loadExample("csv")}>CSV Example</Button>
                  <Button variant="outline" onClick={() => loadExample("markdown")}>Markdown Example</Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Accepts Markdown Table (Label | Value | Color) or CSV (Label,Value,Color).
              </p>
            </div>
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
              showOrientation
              isHorizontal={stackedHorizontal}
              onToggleOrientation={() => setStackedHorizontal(!stackedHorizontal)}
            >
              <StackedChart 
                data={sortedData} 
                containerRef={stackedCardRef as React.RefObject<HTMLDivElement>}
                isHorizontal={stackedHorizontal}
                showLabels={showLabels}
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

      {/* --- Toast Notifications --- */}
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 900,
          style: { background: "black", color: "#ffff" },
          iconTheme: { primary: "white", secondary: "black" },
          error: { iconTheme: { primary: "#ef4444", secondary: "black" } },
        }}
      />

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
        showOrientation
        isHorizontal={stackedHorizontal}
        onToggleOrientation={() => setStackedHorizontal(!stackedHorizontal)}
      >
        <StackedChart data={sortedData} isHorizontal={stackedHorizontal} showLabels={showLabels} />
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
