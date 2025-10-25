"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RemoveButton } from "@/components/ui/RemoveButton";
import toast, { Toaster } from "react-hot-toast";
import { generateId } from "@/lib/utils/data-parser";
import type { Datum } from "@/types";
import styles from "./DataVisualizer.module.css";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  Bar,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  BarChart as RechartsBarChart,
  PieChart as RechartsPieChart,
  Pie,
  Line,
  Label,
  LineChart as RechartsLineChart,
  ResponsiveContainer
} from "recharts";
import { X, Maximize2 } from "lucide-react";

import {
  BarChart,
  PieChart,
  LineChart
} from "../components/charts";

// 💡 SortableRow is already a good component separation.
function SortableRow({
  row,
  onUpdateLabel,
  onUpdateValue,
  onUpdateColor,
  onRemove,
  presetColors,
}: {
  row: Datum;
  onUpdateLabel: (id: string, label: string) => void;
  onUpdateValue: (id: string, value: string) => void;
  onUpdateColor: (id: string, color: string) => void;
  onRemove: (id: string) => void;
  presetColors: string[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: row.id });

  const [localLabel, setLocalLabel] = useState(row.label);
  const [localValue, setLocalValue] = useState<number | "">(row.value);

  useEffect(() => {
    setLocalLabel(row.label);
  }, [row.label]);

  useEffect(() => {
    setLocalValue(row.value);
  }, [row.value]);

  return (
    <tr
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={styles.sortableRow}
      {...attributes}
    >
      <td className="py-2 pr-2">
        <div className="flex items-center gap-2">
          <button
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
            aria-label={`Drag to reorder ${row.label}`}
          >
            ⋮⋮
          </button>
          <input
            className="w-full rounded-md border bg-background px-2 py-1"
            aria-label={`Label for row ${row.label}`}
            placeholder="Label"
            value={localLabel}
            onChange={(e) => setLocalLabel(e.target.value)}
            onBlur={() => onUpdateLabel(row.id, localLabel)}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          />
        </div>
      </td>
      <td className="py-2 pr-2">
        <input
          className="w-full rounded-md border bg-background px-2 py-1"
          type="number"
          aria-label={`Value for ${row.label}`}
          placeholder="0"
          value={localValue}
          onChange={(e) =>
            setLocalValue(e.target.value === "" ? "" : Number(e.target.value))
          }
          onBlur={() =>
            onUpdateValue(row.id, String(localValue === "" ? 0 : localValue))
          }
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        />
      </td>

      {/* TD Color: ใช้ Shadcn Select */}
      <td className="py-2 pr-2">
        <div className="flex items-center gap-2">
          <Select
            value={row.color}
            onValueChange={(newColor) => onUpdateColor(row.id, newColor)}
          >
            <SelectTrigger className="w-full h-9">
              <SelectValue asChild>
                <div className="flex items-center gap-2 w-full text-left">
                  <div
                    className={styles.colorCircle}
                    data-color={row.color}
                  />
                  <span className="truncate text-sm">{row.color}</span>
                </div>
              </SelectValue>
            </SelectTrigger>

            <SelectContent>
              {presetColors.map((c) => (
                <SelectItem key={c} value={c} className="pr-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={styles.colorPreview}
                      data-color={c}
                    />
                    <span className="font-mono text-xs">{c}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </td>

      <td className="py-2 pr-2">
        <RemoveButton onClick={() => onRemove(row.id)} label={row.label} />
      </td>
    </tr>
  );
}

export default function DataVisualizer() {
  const presetColors = [
    "#3b82f6", // blue-500
    "#22c55e", // green-500
    "#ef4444", // red-500
    "#f59e0b", // amber-500
    "#a855f7", // purple-500
    "#06b6d4", // cyan-500
  ];

  const [data, setData] = useState<Datum[]>([
    { id: generateId(), label: "A", value: 12, color: presetColors[0] },
    { id: generateId(), label: "B", value: 30, color: presetColors[1] },
    { id: generateId(), label: "C", value: 18, color: presetColors[2] },
  ]);
  const [stackedHorizontal, setStackedHorizontal] = useState(true);
  const [barHorizontal, setBarHorizontal] = useState(true);
  const [fullscreenChart, setFullscreenChart] = useState<string | null>(null);
  const [markdownInput, setMarkdownInput] = useState<string>(
    `Label,Value,Color\nitem1,"5",#F032E6\nitem2,"4",#46F0F0\nitem3,"5",#06b6d4`
  );

  const [sortConfig, setSortConfig] = useState<{
    key: "label" | "value";
    direction: "asc" | "desc";
  } | null>(null);

  const barCardRef = useRef<HTMLDivElement>(null!);
  const pieCardRef = useRef<HTMLDivElement>(null!);
  const stackedCardRef = useRef<HTMLDivElement>(null!);
  const lineCardRef = useRef<HTMLDivElement>(null!);

  const copyChartSvg = useCallback(async (containerEl: HTMLElement | null) => {
    if (!containerEl) {
      console.error("Container element is null");
      toast.error("Cannot copy chart: Container not found");
      return;
    }

    try {
      // Maximum retry attempts
      const maxRetries = 3;
      let chartSvg: SVGSVGElement | null = null;
      
      // Try to find the chart SVG with retries
      for (let i = 0; i < maxRetries; i++) {
        // Wait between attempts
        await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
        
        // Find the recharts wrapper and SVG
        const wrapper = containerEl.querySelector('.recharts-wrapper');
        if (wrapper) {
          chartSvg = wrapper.querySelector('svg');
          if (chartSvg) break;
        }
      }

      if (!chartSvg) {
        console.error("No chart SVG found after retries");
        toast.error("Cannot find chart to copy");
        return;
      }

      // Get accurate dimensions
      const box = chartSvg.getBoundingClientRect();
      const width = Math.round(box.width);
      const height = Math.round(box.height);
      
      // Create new SVG element with namespace
      const newSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      newSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      newSvg.setAttribute("width", width.toString());
      newSvg.setAttribute("height", height.toString());
      newSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      
      // Copy all child nodes
      Array.from(chartSvg.childNodes).forEach(node => {
        newSvg.appendChild(node.cloneNode(true));
      });
      
      // Convert to string
      const svgString = newSvg.outerHTML;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(svgString);
      
      toast.success("Chart copied!", {
        duration: 850,
        style: {
          background: "#0EC04F",
          color: "#ffffff",
        },
      });

    } catch (error) {
      console.error("SVG Copy Error:", error);
      if (error instanceof Error) {
        console.error(error.message);
      }
      toast.error("Failed to copy chart");
    }
  }, []);

  function parseMarkdownTable(md: string): Datum[] {
    const lines = md
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return [];

    const result: Datum[] = [];
    let itemCount = 0;

    const isMarkdownTable = lines.some((l) => l.includes("|"));

    if (!isMarkdownTable) {
      // LOGIC: ประมวลผลเป็น CSV

      const headerLine = lines[0]?.toLowerCase().replace(/\s/g, "") || "";
      const dataLines = lines.slice(1);

      let labelIndex = 0;
      let valueIndex = 1;
      let colorIndexCSV = 2;
      let hasHeader = false;

      if (headerLine.includes("label") && headerLine.includes("value")) {
        const headerParts = headerLine.split(",").map((s) => s.trim());
        labelIndex = headerParts.indexOf("label");
        valueIndex = headerParts.indexOf("value");
        colorIndexCSV = headerParts.indexOf("color");
        hasHeader = true;
      }

      const linesToProcess = hasHeader ? dataLines : lines;

      linesToProcess.forEach((line) => {
        const parts = line.split(",").map((s) => s.trim());

        if (parts.length >= 2) {
          const rawLabel = parts[labelIndex] || "";
          const rawValue = parts[valueIndex] || "";
          const rawColor = parts[colorIndexCSV] || "";

          const label = hasHeader ? rawLabel : parts[0];
          const valueStr = hasHeader ? rawValue : parts[1];
          const colorStr =
            hasHeader && parts.length > 2 ? rawColor : parts[2] || "";

          const value = Number(valueStr.replace(/["\s,]/g, ""));

          if (isFinite(value)) {
            const color =
              colorStr || presetColors[itemCount % presetColors.length];

            result.push({
              id: generateId(),
              label: label || `Item ${itemCount + 1}`,
              value: Math.max(0, value),
              color,
            });
            itemCount++;
          }
        } else if (
          parts.length === 1 &&
          isFinite(Number(parts[0].replace(/["\s,]/g, "")))
        ) {
          // รองรับกรณีพิเศษ: หากมีแค่ค่าเดียว (value)
          const value = Number(parts[0].replace(/["\s,]/g, ""));
          if (isFinite(value)) {
            const color = presetColors[itemCount % presetColors.length];
            result.push({
              id: generateId(),
              label: `Item ${itemCount + 1}`,
              value: Math.max(0, value),
              color,
            });
            itemCount++;
          }
        }
      });

      if (result.length > 0) return result;
    }

    // LOGIC: ประมวลผล Markdown Table
    let startIdx = 0;
    if (lines.length > 1 && /-\s*-/.test(lines[1])) {
      startIdx = 2;
    } else if (lines.length > 0 && /\|/.test(lines[0])) {
      startIdx = 1;
    }

    itemCount = 0;
    const markdownResult: Datum[] = [];

    for (let i = startIdx; i < lines.length; i++) {
      const row = lines[i];
      if (!row.includes("|")) continue;
      const parts = row
        .split("|")
        .map((s) => s.trim())
        .filter(
          (s, idx, arr) =>
            !(idx === 0 && s === "") && !(idx === arr.length - 1 && s === "")
        );
      if (parts.length < 2) continue;

      const valueStr = parts[1] || "0";
      const value = Number(valueStr.replace(/["\s,]/g, ""));

      if (isFinite(value)) {
        const label = parts[0] || `Item ${itemCount + 1}`;
        const colorStr = parts[2] || "";
        const color = colorStr || presetColors[itemCount % presetColors.length];

        markdownResult.push({
          id: generateId(),
          label,
          value: Math.max(0, value),
          color,
        });
        itemCount++;
      }
    }

    if (markdownResult.length > 0) return markdownResult;

    return result;
  }

  // 💡 Optimization: useMemo hooks help prevent re-calculation unless dependencies change
  const total = useMemo(
    () => data.reduce((sum, d) => sum + (isFinite(d.value) ? d.value : 0), 0),
    [data]
  );

  const sortedData = useMemo(() => {
    const sortableData = [...data];

    if (sortConfig !== null) {
      sortableData.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableData;
  }, [data, sortConfig]);

  const requestSort = (key: "label" | "value") => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    } else if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "desc"
    ) {
      setSortConfig(null);
      return;
    }
    setSortConfig({ key, direction });
  };

  // Memoized data for stacked chart
  const stackedData = useMemo(() => {
    const total = sortedData.reduce((sum, d) => sum + Math.max(0, isFinite(d.value) ? d.value : 0), 0);
    return [
      {
        name: "All",
        ...sortedData.reduce((acc, d) => ({
          ...acc,
          [d.label]: Math.max(0, isFinite(d.value) ? d.value : 0) / (total || 1)
        }), {})
      }
    ];
  }, [sortedData]);

  function StackedTooltip({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ name?: string; value: number; fill?: string } & Record<string, unknown>>;
  }) {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className={styles.stackedTooltipWrapper}>
        <div className={styles.stackedTooltipTitle}>Details</div>
        <div className={styles.stackedTooltipContent}>
          {payload.map((entry, idx) => (
            <div key={idx} className={styles.stackedTooltipRow}>
              <div className={styles.stackedTooltipLabel}>
                <div
                  className={styles.colorCircle}
                  data-color={entry.fill}
                />
                <span>{entry.name}</span>
              </div>
              <span>{Math.round(entry.value * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 💡 Refactored to use useCallback for stable function references
  const updateLabel = useCallback((id: string, label: string) => {
    setData((prev) => prev.map((d) => (d.id === id ? { ...d, label } : d)));
  }, []);
  const updateValue = useCallback((id: string, next: string) => {
    const parsed = Number(next);
    setData((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, value: isFinite(parsed) ? parsed : 0 } : d
      )
    );
  }, []);
  const updateColor = useCallback((id: string, color: string) => {
    setData((prev) => prev.map((d) => (d.id === id ? { ...d, color } : d)));
  }, []);

  function addRow() {
    const nextIndex = data.length;
    setData((prev) => [
      ...prev,
      {
        id: generateId(),
        label: `Item ${nextIndex + 1}`,
        value: 0,
        color: presetColors[nextIndex % presetColors.length],
      },
    ]);
    toast.success("Row added!", { duration: 900 });
  }

  function removeRow(id: string) {
    setData((prev) =>
      prev.length > 1 ? prev.filter((d) => d.id !== id) : prev
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    if (sortConfig !== null) return;

    const { active, over } = event;
    if (over && active.id !== over.id) {
      setData((prev) => {
        const oldIndex = prev.findIndex((d) => d.id === active.id);
        const newIndex = prev.findIndex((d) => d.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const isDndEnabled = sortConfig === null;

  // Full-screen functions
  const openFullscreen = (chartType: string) => {
    setFullscreenChart(chartType);
  };

  const closeFullscreen = () => {
    setFullscreenChart(null);
  };

  // Handle escape key to close fullscreen and body scroll lock
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && fullscreenChart) {
        closeFullscreen();
      }
    };

    if (fullscreenChart) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [fullscreenChart]);

  // Full-screen modal component
  const FullscreenModal = ({ chartType, children }: { chartType: string; children: React.ReactNode }) => {
    if (fullscreenChart !== chartType) return null;

    return (
      <div 
        className={styles.fullscreenModal}
        onClick={(e) => e.target === e.currentTarget && closeFullscreen()}
      >
        <div className={styles.fullscreenContent}>
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold capitalize">{chartType} Chart - Full Screen</h2>
            <div className="flex items-center gap-2">
              {(chartType === "bar" || chartType === "stacked") && (
                <Button
                  variant="secondary"
                  aria-label={`Toggle ${chartType} chart orientation`}
                  onClick={() => {
                    if (chartType === "bar") {
                      setBarHorizontal((v) => !v);
                    } else if (chartType === "stacked") {
                      setStackedHorizontal((v) => !v);
                    }
                  }}
                >
                  {chartType === "bar" 
                    ? (barHorizontal ? "Vertical" : "Horizontal")
                    : (stackedHorizontal ? "Vertical" : "Horizontal")
                  }
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const refs = {
                    bar: barCardRef,
                    pie: pieCardRef,
                    stacked: stackedCardRef,
                    line: lineCardRef
                  };
                  const ref = refs[chartType as keyof typeof refs];
                  if (ref?.current) {
                    copyChartSvg(ref.current);
                  }
                }}
                aria-label={`Copy ${chartType} chart as SVG`}
              >
                Copy SVG
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeFullscreen}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className={styles.chartContent}>
            {children}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="p-4 space-y-6" data-testid="data-visualizer">
        <div>
          <h1 className="text-2xl font-semibold">Data Visualizer</h1>
          <p className="text-sm text-muted-foreground">
            Edit values in either panel to update the charts live. Click
            Label/Value headers to sort.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Data Tables */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-medium">
                Data Table{" "}
                {sortConfig && (
                  <span className="text-sm text-primary">(Sorted)</span>
                )}
              </h2>
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground">
                  Total: {total.toLocaleString()}
                </div>
                <Button variant="secondary" onClick={addRow}>
                  Add Row
                </Button>
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
                        aria-label="Sort by Label"
                      >
                        Label
                        {sortConfig?.key === "label" && (
                          <span aria-hidden="true">
                            {sortConfig.direction === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                        {isDndEnabled && (
                          <span className="text-xs text-muted-foreground ml-1">
                            (Drag)
                          </span>
                        )}
                      </button>
                    </th>
                    <th className="text-left py-2 pr-2 min-w-[120px]">
                      <button
                        className="inline-flex items-center gap-1 font-semibold hover:text-foreground/80 transition-colors"
                        onClick={() => requestSort("value")}
                        aria-label="Sort by Value"
                      >
                        Value
                        {sortConfig?.key === "value" && (
                          <span aria-hidden="true">
                            {sortConfig.direction === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className="text-left py-2 pr-2 min-w-[120px]">Color</th>
                    <th className="text-left py-2 pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={sortedData.map((d) => d.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {sortedData.map((row) => (
                        <SortableRow
                          key={row.id}
                          row={row}
                          onUpdateLabel={updateLabel}
                          onUpdateValue={updateValue}
                          onUpdateColor={updateColor}
                          onRemove={removeRow}
                          presetColors={presetColors}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </tbody>
              </table>
            </div>
          </div>

          {/* --- Right Panel: Markdown Input --- */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-medium">Paste Data</h2>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <textarea
                className="min-h-[160px] w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
                aria-label="Markdown table input"
                value={markdownInput}
                onChange={(e) => setMarkdownInput(e.target.value)}
              />
              <div className="flex items-center justify-between gap-2">
                <Button
                  onClick={() => {
                    const rows = parseMarkdownTable(markdownInput);
                    if (rows.length) {
                      setData(rows);
                      toast.success("Data transformed successfully!", {
                        duration: 900,
                      });
                    } else {
                      toast.error("Error: Invalid data format or no data found.");
                    }
                    setSortConfig(null);
                  }}
                >
                  Transform to Table
                </Button>

                {/* Grouped Buttons (ButtonGroup Style) */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMarkdownInput(
                        `Label,Value,Color\nA, 12, #3b82f6\nB, 30, #22c55e\nC, 18, #ef4444`
                      );
                      setSortConfig(null);
                      toast.success("CSV Example loaded!", { duration: 900 });
                    }}
                    aria-label="Load CSV Example"
                  >
                    CSV Example
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMarkdownInput(
                        "| Label | Value | Color |\n|------:|------:|:-----:|\n| A     | 12    | #3b82f6 |\n| B     | 30    | #22c55e |\n| C     | 18    | #ef4444 |"
                      );
                      setSortConfig(null);
                      toast.success("Markdown Example loaded!", {
                        duration: 900,
                      });
                    }}
                    aria-label="Load Markdown Example"
                  >
                    Markdown Example
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Accepts Markdown Table (Label | Value | Color) or **Structured CSV
                (Label,Value,Color)**.
              </p>
            </div>
          </div>
        </div>

        {/* --- Charts Section --- */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div ref={barCardRef} className="rounded-lg border p-4 min-h-[380px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-medium">Bar Chart</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    aria-label="Toggle bar chart orientation"
                    onClick={() => setBarHorizontal((v) => !v)}
                  >
                    {barHorizontal ? "Vertical" : "Horizontal"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      await copyChartSvg(barCardRef.current);
                    }}
                    aria-label="Copy Bar Chart as SVG"
                  >
                    Copy SVG
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openFullscreen("bar")}
                    aria-label="Open Bar Chart in full screen"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="h-[calc(100%-3rem)]">
                <BarChart
                  data={sortedData}
                  containerRef={barCardRef}
                  isHorizontal={barHorizontal}
                />
              </div>
            </div>

            <div ref={pieCardRef} className="rounded-lg border p-4 min-h-[380px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-medium">
                  Pie Chart - Donut with Total
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => copyChartSvg(pieCardRef.current)}
                    aria-label="Copy Pie Chart as SVG"
                  >
                    Copy SVG
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openFullscreen("pie")}
                    aria-label="Open Pie Chart in full screen"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="h-[calc(100%-3rem)]">
                <PieChart
                  data={sortedData}
                  total={total}
                  containerRef={pieCardRef}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div ref={stackedCardRef} className="rounded-lg border p-4 h-[320px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-medium">100% Stacked Chart</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    aria-label="Toggle stacked chart orientation"
                    onClick={() => setStackedHorizontal((v) => !v)}
                  >
                    {stackedHorizontal ? "Vertical" : "Horizontal"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => copyChartSvg(stackedCardRef.current)}
                    aria-label="Copy Stacked Chart as SVG"
                  >
                    Copy SVG
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openFullscreen("stacked")}
                    aria-label="Open Stacked Chart in full screen"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height="90%">
                <RechartsBarChart
                  data={stackedData}
                  stackOffset="expand"
                  margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
                  layout={stackedHorizontal ? "vertical" : "horizontal"}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  {stackedHorizontal ? (
                    <>
                      <YAxis
                        type="category"
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        width={60}
                      />
                      <XAxis
                        type="number"
                        domain={[0, 1]}
                        tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                        tickLine={false}
                        axisLine={false}
                      />
                    </>
                  ) : (
                    <>
                      <XAxis
                        type="category"
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        height={60}
                      />
                      <YAxis
                        type="number"
                        domain={[0, 1]}
                        tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                        tickLine={false}
                        axisLine={false}
                      />
                    </>
                  )}
                  <Tooltip content={<StackedTooltip />} />
                  {sortedData.map((d) => (
                    <Bar key={d.id} dataKey={d.label} stackId="stacked" fill={d.color} name={d.label} />
                  ))}
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>

            <div ref={lineCardRef} className="rounded-lg border p-4 min-h-[320px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-medium">Line Chart - Linear</h3>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => copyChartSvg(lineCardRef.current)}
                    aria-label="Copy Line Chart as SVG"
                  >
                    Copy SVG
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openFullscreen("line")}
                    aria-label="Open Line Chart in full screen"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="h-[calc(100%-3rem)]">
                <LineChart
                  data={sortedData}
                  containerRef={lineCardRef}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Toaster
        position="bottom-center"
        reverseOrder={false}
        gutter={3}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          className: "",
          duration: 900,
          style: {
            background: "black",
            color: "#ffff",
          },
          iconTheme: {
            primary: "white",
            secondary: "black",
          },
          error: {
            duration: 900,
            iconTheme: {
              primary: "#ef4444",
              secondary: "black",
            },
          },
        }}
      />

      {/* --- Full-screen Modals --- */}
      {fullscreenChart === "bar" && (
  <FullscreenModal chartType="bar">
    <div className="h-full w-full">
      {barHorizontal ? (
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 20, right: 40, bottom: 20, left: 120 }}
            barCategoryGap="15%"
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <YAxis 
              dataKey="label" 
              type="category" 
              tickLine={false} 
              axisLine={false}
              width={100}
            />
            <Tooltip />
            <Bar 
              dataKey="value" 
              radius={[0, 6, 6, 0]}
              maxBarSize={80}
            >
              {sortedData.map((entry) => (
                <Cell key={entry.id} fill={entry.color} />
              ))}
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart
            data={sortedData}
            layout="horizontal"
            margin={{ top: 40, right: 40, bottom: 80, left: 60 }}
            barCategoryGap="15%"
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="label" 
              tickLine={false} 
              axisLine={false}
              height={80}
            />
            <YAxis 
              type="number" 
              tickLine={false} 
              axisLine={false}
            />
            <Tooltip />
            <Bar 
              dataKey="value" 
              radius={[6, 6, 0, 0]}
              maxBarSize={120}
            >
              {sortedData.map((entry) => (
                <Cell key={entry.id} fill={entry.color} />
              ))}
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
      )}
    </div>
  </FullscreenModal>
)}

      {fullscreenChart === "pie" && (
        <FullscreenModal chartType="pie">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Tooltip />
              <Pie
                data={sortedData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                cornerRadius={6}
                strokeWidth={5}
              >
                {sortedData.map((entry) => (
                  <Cell key={entry.id} fill={entry.color} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-2xl font-bold"
                          >
                            {total.toLocaleString()}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 24}
                            className="fill-muted-foreground text-sm"
                          >
                            Total
                          </tspan>
                        </text>
                      );
                    }
                    return null;
                  }}
                />
              </Pie>
            </RechartsPieChart>
          </ResponsiveContainer>
        </FullscreenModal>
      )}

      {fullscreenChart === "stacked" && (
        <FullscreenModal chartType="stacked">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart
              data={stackedData}
              stackOffset="expand"
              margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
              layout={stackedHorizontal ? "vertical" : "horizontal"}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              {stackedHorizontal ? (
                <>
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                  />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `${Math.round((v as number) * 100)}%`}
                    tickLine={false}
                    axisLine={false}
                  />
                </>
              ) : (
                <>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis
                    tickFormatter={(v) => `${Math.round((v as number) * 100)}%`}
                    tickLine={false}
                    axisLine={false}
                  />
                </>
              )}
              <Tooltip content={<StackedTooltip />} />
              {sortedData.map((d) => (
                <Bar key={d.id} dataKey={d.label} stackId="stacked" name={d.label}>
                  <Cell fill={d.color} />
                </Bar>
              ))}
            </RechartsBarChart>
          </ResponsiveContainer>
        </FullscreenModal>
      )}

      {fullscreenChart === "line" && (
        <FullscreenModal chartType="line">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis width={80} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#8884d8"
                strokeWidth={2}
                data={sortedData}
                dot={{ fill: "#8884d8", strokeWidth: 2 }}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </FullscreenModal>
      )}
    </>
  );
}