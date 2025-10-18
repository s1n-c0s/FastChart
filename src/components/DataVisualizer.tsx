"use client";

import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RemoveButton } from "@/components/ui/RemoveButton";
import toast, { Toaster } from "react-hot-toast";
import { X, Maximize2 } from "lucide-react";

// Components ใหม่สำหรับ Shadcn Select
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
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  Cell,
  Label,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Datum = {
  id: string;
  label: string;
  value: number;
  color: string;
};

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b last:border-0"
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
              {" "}
              {/* ปรับความสูงให้เข้ากับ input */}
              <SelectValue asChild>
                <div className="flex items-center gap-2 w-full text-left">
                  {/* วงกลมสีเล็กๆ ที่แสดงใน Select Box ขณะที่ยังไม่ได้เปิด */}
                  <div
                    className="size-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: row.color }}
                  />
                  <span className="truncate text-sm">{row.color}</span>
                </div>
              </SelectValue>
            </SelectTrigger>

            <SelectContent>
              {presetColors.map((c) => (
                <SelectItem key={c} value={c} className="pr-4">
                  {/* เนื้อหาที่กำหนดเอง: วงกลมสีจริง */}
                  <div className="flex items-center gap-2">
                    <div
                      className="size-4 rounded-full border border-gray-300 dark:border-gray-700 flex-shrink-0"
                      style={{ backgroundColor: c }}
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

  const barCardRef = useRef<HTMLDivElement>(null);
  const pieCardRef = useRef<HTMLDivElement>(null);
  const stackedCardRef = useRef<HTMLDivElement>(null);
  const lineCardRef = useRef<HTMLDivElement>(null);

  async function copyChartSvg(containerEl: HTMLElement | null) {
    try {
      const svg = containerEl?.querySelector("svg") as SVGSVGElement | null;
      if (!svg) return;
      const clone = svg.cloneNode(true) as SVGSVGElement;
      if (!clone.getAttribute("xmlns")) {
        clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      }

      const xml = new XMLSerializer().serializeToString(clone);
      await navigator.clipboard.writeText(xml);
      // ✅ Copy SVG: ใช้ toast ธรรมดา + สไตล์สีเขียวโดยตรง + ไอคอน
      toast.success("SVG Copied to Clipboard!", {
        duration: 850,
        style: {
          background: "#0EC04F", // สีเขียวเข้ม
          color: "#ffffff",
        },
      });
    } catch {
      // ✅ Error: ใช้ toast.error ดึงสไตล์สีดำ/ไอคอนแดงจาก Default Toaster
      toast.error("Failed to copy SVG.");
    }
  }

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
    const obj: Record<string, number | string> = { name: "All" };
    for (const d of sortedData) {
      obj[d.id] = Math.max(0, isFinite(d.value) ? d.value : 0);
    }
    return [obj];
  }, [sortedData]);
  const idToLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of sortedData) m.set(d.id, d.label);
    return m;
  }, [sortedData]);
  const labelToId = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of sortedData) m.set(d.label, d.id);
    return m;
  }, [sortedData]);
  const idToValue = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of sortedData)
      m.set(d.id, Math.max(0, isFinite(d.value) ? d.value : 0));
    return m;
  }, [sortedData]);
  const stackedSum = useMemo(() => {
    return sortedData.reduce(
      (s, d) => s + Math.max(0, isFinite(d.value) ? d.value : 0),
      0
    );
  }, [sortedData]);

  function StackedTooltip({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ name?: string; value: number } & Record<string, unknown>>;
  }) {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div className="rounded-md border bg-background p-2 text-xs shadow-sm">
        <div className="font-medium mb-1">All</div>
        <div className="space-y-0.5">
          {payload.map((p, idx) => {
            const maybeDataKey = (p as unknown as { dataKey?: string }).dataKey;
            const name = p.name ?? "";
            const id = maybeDataKey ?? labelToId.get(name) ?? name;
            const label = idToLabel.get(id) ?? id;
            const raw = idToValue.get(id) ?? 0;
            const percent = stackedSum > 0 ? (raw / stackedSum) * 100 : 0;
            return (
              <div
                key={idx}
                className="flex items-center justify-between gap-4"
              >
                <span>{label}</span>
                <span>
                  {raw} ({percent.toFixed(1)}%)
                </span>
              </div>
            );
          })}
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
    // ✅ Add Row: ใช้ toast ธรรมดา + ไอคอน ✅ (Black Version)
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

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
      // Only close if clicking on the backdrop, not the modal content
      if (e.target === e.currentTarget) {
        closeFullscreen();
      }
    };

    return (
      <div 
        className="fixed z-50 bg-black/80 flex items-center justify-center" 
        style={{ 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          width: '100vw', 
          height: '100vh',
          margin: 0,
          padding: '1rem'
        }}
        onClick={handleBackdropClick}
      >
        <div className="bg-background rounded-lg border w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold capitalize">{chartType} Chart - Full Screen</h2>
            <div className="flex items-center gap-2">
              {/* Vertical/Horizontal toggle for bar and stacked charts */}
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
              {/* Copy SVG button */}
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
          <div className="flex-1 p-4">
            {children}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Data Visualizer</h1>
        <p className="text-sm text-muted-foreground">
          Edit values in either panel to update the charts live. Click
          Label/Value headers to sort.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* --- Left Panel: Data Table --- */}
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
                    // ✅ Transform: ใช้ toast ธรรมดา + ไอคอน ✅ (Black Version)
                    toast.success("Data transformed successfully!", {
                      duration: 900,
                    });
                  } else {
                    // ✅ Error: ใช้ toast.error ดึงสไตล์สีดำ/ไอคอนแดง
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
                    // ✅ Load CSV: ใช้ toast ธรรมดา + ไอคอน ✅ (Black Version)
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
                    // ✅ Load Markdown: ใช้ toast ธรรมดา + ไอคอน ✅ (Black Version)
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div ref={barCardRef} className="rounded-lg border p-4 h-[380px]">
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
                onClick={() => copyChartSvg(barCardRef.current)}
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
          <ResponsiveContainer width="100%" height="90%">
            <BarChart
              data={sortedData}
              margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
              layout={barHorizontal ? "horizontal" : "vertical"}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              {barHorizontal ? (
                <>
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                </>
              ) : (
                <>
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} />
                </>
              )}
              <Tooltip />
              <Bar dataKey="value" radius={barHorizontal ? [6, 6, 0, 0] : [0, 6, 6, 0]}>
                {sortedData.map((entry) => (
                  <Cell key={entry.id} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div ref={pieCardRef} className="rounded-lg border p-4 h-[380px]">
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
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
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
                  }}
                />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

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
          <BarChart
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
              <Bar key={d.id} dataKey={d.id} stackId="one" name={d.label}>
                <Cell fill={d.color} />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div ref={lineCardRef} className="rounded-lg border p-4 h-[320px]">
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
        <ResponsiveContainer width="100%" height="90%">
          <LineChart
            data={sortedData}
            margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <Tooltip />
            <Line
              type="linear"
              dataKey="value"
              stroke="oklch(0.488 0.243 264.376)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* --- Full-screen Modals --- */}
      <FullscreenModal chartType="bar">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sortedData}
            margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
            layout={barHorizontal ? "horizontal" : "vertical"}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            {barHorizontal ? (
              <>
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
              </>
            ) : (
              <>
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} />
              </>
            )}
            <Tooltip />
            <Bar dataKey="value" radius={barHorizontal ? [6, 6, 0, 0] : [0, 6, 6, 0]}>
              {sortedData.map((entry) => (
                <Cell key={entry.id} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </FullscreenModal>

      <FullscreenModal chartType="pie">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
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
                }}
              />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </FullscreenModal>

      <FullscreenModal chartType="stacked">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
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
              <Bar key={d.id} dataKey={d.id} stackId="one" name={d.label}>
                <Cell fill={d.color} />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </FullscreenModal>

      <FullscreenModal chartType="line">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={sortedData}
            margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <Tooltip />
            <Line
              type="linear"
              dataKey="value"
              stroke="oklch(0.488 0.243 264.376)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </FullscreenModal>

      {/* --- Toaster Component: Centralized Configuration --- */}
      <Toaster
        position="bottom-center"
        reverseOrder={false}
        gutter={3}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          // 1. Default Style: เป็นพื้นฐานสำหรับ toast() และใช้เป็นพื้นหลังสำหรับ toast.error()
          className: "",
          duration: 900,
          style: {
            background: "black",
            color: "#ffff",
          },
          // 💡 Icon Theme สำหรับ Black Toast (ใช้กับ toast() และ toast.error)
          iconTheme: {
            primary: "white",
            secondary: "black",
          },

          // ❌ ลบ Success Style ออก เพราะ Copy SVG กำหนดสไตล์โดยตรงแล้ว

          // 3. Error Style: ใช้ Default background (black) แต่ Override ไอคอนเป็นสีแดง
          error: {
            duration: 900,
            iconTheme: {
              primary: "#ef4444", // red-500
              secondary: "black",
            },
          },
        }}
      />
    </div>
  );
}
