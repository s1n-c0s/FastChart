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

import { X, Maximize2 } from "lucide-react";

import {
  BarChart,
  PieChart,
  LineChart,
  StackedChart
} from "../components/charts";

// Constants
const PRESET_COLORS = [
  "#3b82f6", "#22c55e", "#ef4444", 
  "#f59e0b", "#a855f7", "#06b6d4"
] as const;

const INITIAL_DATA: Datum[] = [
  { id: generateId(), label: "A", value: 12, color: PRESET_COLORS[0] },
  { id: generateId(), label: "B", value: 30, color: PRESET_COLORS[1] },
  { id: generateId(), label: "C", value: 18, color: PRESET_COLORS[2] },
];

const INITIAL_MARKDOWN = `Label,Value,Color\nitem1,"5",#F032E6\nitem2,"4",#46F0F0\nitem3,"5",#06b6d4`;

// Types
type SortConfig = {
  key: "label" | "value";
  direction: "asc" | "desc";
} | null;

type ChartType = "bar" | "pie" | "stacked" | "line";

// -----------------------------------------------------------------------------
// SortableRow Component
// -----------------------------------------------------------------------------

interface SortableRowProps {
  row: Datum;
  onUpdateLabel: (id: string, label: string) => void;
  onUpdateValue: (id: string, value: string) => void;
  onUpdateColor: (id: string, color: string) => void;
  onRemove: (id: string) => void;
  presetColors: readonly string[];
}

const SortableRow = React.memo(({
  row,
  onUpdateLabel,
  onUpdateValue,
  onUpdateColor,
  onRemove,
  presetColors,
}: SortableRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: row.id });
  const [localLabel, setLocalLabel] = useState(row.label);
  const [localValue, setLocalValue] = useState<number | "">(row.value);
  
  // Debounce timers
  const labelTimerRef = useRef<number | undefined>(undefined); 
  const valueTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => setLocalLabel(row.label), [row.label]);
  useEffect(() => setLocalValue(row.value), [row.value]);
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (labelTimerRef.current) window.clearTimeout(labelTimerRef.current);
      if (valueTimerRef.current) window.clearTimeout(valueTimerRef.current);
    };
  }, []);
  
  const commitLabelUpdate = useCallback((newLabel: string) => {
    if (newLabel !== row.label) {
      onUpdateLabel(row.id, newLabel);
    }
  }, [row.id, row.label, onUpdateLabel]);

  const commitValueUpdate = useCallback((newValue: number | "") => {
    const finalValue = newValue === "" ? 0 : newValue;
    const currentStoredValue = row.value;
    
    if (finalValue !== currentStoredValue) {
      onUpdateValue(row.id, String(finalValue));
    }
  }, [row.id, row.value, onUpdateValue]);

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLabel = e.target.value;
    setLocalLabel(newLabel);
    
    if (labelTimerRef.current) window.clearTimeout(labelTimerRef.current);
    labelTimerRef.current = window.setTimeout(() => {
      commitLabelUpdate(newLabel);
    }, 300);
  };

  const handleLabelBlur = () => {
    if (labelTimerRef.current) window.clearTimeout(labelTimerRef.current);
    commitLabelUpdate(localLabel);
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value === "" ? "" : Number(e.target.value);
    setLocalValue(newValue);
    
    if (valueTimerRef.current) window.clearTimeout(valueTimerRef.current);
    valueTimerRef.current = window.setTimeout(() => {
      commitValueUpdate(newValue);
    }, 300);
  };
  
  const handleValueBlur = () => {
    if (valueTimerRef.current) window.clearTimeout(valueTimerRef.current);
    commitValueUpdate(localValue);
  };

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
            onChange={handleLabelChange}
            onBlur={handleLabelBlur}
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
          onChange={handleValueChange}
          onBlur={handleValueBlur}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        />
      </td>
      <td className="py-2 pr-2">
        <Select value={row.color} onValueChange={(color) => onUpdateColor(row.id, color)}>
          <SelectTrigger className="w-full h-9">
            <SelectValue asChild>
              <div className="flex items-center gap-2 w-full text-left">
                <div 
                  className={styles.colorCircle} 
                  style={{ backgroundColor: row.color }} 
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
                    style={{ ['--preview-color' as string]: c }}
                  />
                  <span className="font-mono text-xs">{c}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="py-2 pr-2">
        <RemoveButton onClick={() => onRemove(row.id)} label={row.label} />
      </td>
    </tr>
  );
});

SortableRow.displayName = "SortableRow";

// -----------------------------------------------------------------------------
// Chart Card Component
// -----------------------------------------------------------------------------

interface ChartCardProps {
  title: string;
  chartRef: React.RefObject<HTMLDivElement>;
  onCopySvg: () => void;
  onFullscreen: () => void;
  children: React.ReactNode;
  showOrientation?: boolean;
  isHorizontal?: boolean;
  onToggleOrientation?: () => void;
}

const ChartCard = React.memo(({
  title,
  chartRef,
  onCopySvg,
  onFullscreen,
  children,
  showOrientation,
  isHorizontal,
  onToggleOrientation,
}: ChartCardProps) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChartAreaClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Don't trigger if clicking on buttons or tooltips
    if (
      target.closest('button') ||
      target.closest('[role="tooltip"]') ||
      target.closest('.recharts-tooltip-wrapper') ||
      target.tagName === 'BUTTON'
    ) {
      return;
    }

    // Click anywhere in the entire card content area opens fullscreen
    onFullscreen();
  }, [onFullscreen]);

  const handleButtonClick = useCallback((e: React.MouseEvent) => {
    // Stop propagation to prevent triggering fullscreen when clicking buttons
    e.stopPropagation();
  }, []);

  const handleMouseEnter = useCallback(() => {
    setShowTooltip(true);
    // Clear existing timeout if any
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    // Hide tooltip after 2.5 seconds
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 2500);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setShowTooltip(false);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={chartRef} 
      className="rounded-lg border p-4 min-h-[380px] cursor-pointer relative group"
      onClick={handleChartAreaClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-medium">{title}</h3>
        <div className="flex items-center gap-2" onClick={handleButtonClick}>
          {showOrientation && onToggleOrientation && (
            <Button variant="secondary" onClick={onToggleOrientation}>
              {isHorizontal ? "Vertical" : "Horizontal"}
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={onCopySvg}>
            Copy SVG
          </Button>
          <Button size="sm" variant="secondary" onClick={onFullscreen}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="h-[calc(100%-3rem)] relative">
        <div className={`absolute inset-0 z-10 transition-opacity pointer-events-none flex items-center justify-center ${showTooltip ? 'opacity-100' : 'opacity-0'}`}>
          <div className="bg-black/50 text-white px-3 py-1 rounded-md text-xs font-medium">
            Click to fullscreen
          </div>
        </div>
        {/* Wrapper to ensure entire area is clickable, including empty space */}
        <div className="h-full w-full min-h-full">
          {children}
        </div>
      </div>
    </div>
  );
});

ChartCard.displayName = "ChartCard";

// -----------------------------------------------------------------------------
// Fullscreen Modal Component
// -----------------------------------------------------------------------------

interface FullscreenModalProps {
  chartType: string;
  isOpen: boolean;
  onClose: () => void;
  onCopySvg: () => void;
  children: React.ReactNode;
  showOrientation?: boolean;
  isHorizontal?: boolean;
  onToggleOrientation?: () => void;
}

const FullscreenModal = React.memo(({
  chartType,
  isOpen,
  onClose,
  onCopySvg,
  children,
  showOrientation,
  isHorizontal,
  onToggleOrientation,
}: FullscreenModalProps) => {
  // Lazy render chart content only when modal is open
  const [shouldRenderChart, setShouldRenderChart] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      // Small delay to allow modal animation to start first
      const timer = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setShouldRenderChart(true);
        });
      });
      return () => cancelAnimationFrame(timer);
    } else {
      setShouldRenderChart(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.fullscreenModal} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.fullscreenContent}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold capitalize">{chartType} Chart - Full Screen</h2>
          <div className="flex items-center gap-2">
            {showOrientation && onToggleOrientation && (
              <Button variant="secondary" onClick={onToggleOrientation}>
                {isHorizontal ? "Vertical" : "Horizontal"}
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={onCopySvg}>
              Copy SVG
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className={styles.chartContent}>
          {shouldRenderChart ? children : <div className="h-full w-full flex items-center justify-center">Loading...</div>}
        </div>
      </div>
    </div>
  );
});

FullscreenModal.displayName = "FullscreenModal";

// -----------------------------------------------------------------------------
// Main Component: DataVisualizer
// -----------------------------------------------------------------------------

export default function DataVisualizer() {
  const [data, setData] = useState<Datum[]>(INITIAL_DATA);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [markdownInput, setMarkdownInput] = useState(INITIAL_MARKDOWN);
  const [barHorizontal, setBarHorizontal] = useState(true);
  const [stackedHorizontal, setStackedHorizontal] = useState(true);
  const [fullscreenChart, setFullscreenChart] = useState<ChartType | null>(null);
  const [showStackedTooltip, setShowStackedTooltip] = useState(false);
  const stackedTooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // State to manually trigger chart re-render for non-structural changes (label/color)
  const [chartUpdateKey, setChartUpdateKey] = useState(0); 

  const [, startTransition] = React.useTransition();

  const barCardRef = useRef<HTMLDivElement>(null!);
  const pieCardRef = useRef<HTMLDivElement>(null!);
  const stackedCardRef = useRef<HTMLDivElement>(null!);
  const lineCardRef = useRef<HTMLDivElement>(null!);

  // Chart key now depends on the manual counter
  const chartKey = useMemo(() => chartUpdateKey, [chartUpdateKey]); 

  // Memoized calculations
  const total = useMemo(
    () => data.reduce((sum, d) => sum + (isFinite(d.value) ? d.value : 0), 0),
    [data]
  );

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;
    
    return [...data].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "asc" ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const chartData = useMemo(() => sortedData, [sortedData]);
  
  // Defer chart data updates when in fullscreen for smoother performance
  const deferredChartData = React.useDeferredValue(chartData);
  
  // Use deferred data when fullscreen is open, otherwise use regular data
  const fullscreenChartData = fullscreenChart ? deferredChartData : chartData;
  
  // -----------------------------------------------------------------------------
  // Handlers (Order adjusted to fix Code 2304, 2448, 2454)
  // -----------------------------------------------------------------------------

  // 1. copyChartSvg: ต้องประกาศก่อนถูกเรียกใช้ใน JSX (ChartCard/FullscreenModal)
  const copyChartSvg = useCallback(async (containerEl: HTMLElement | null) => {
    if (!containerEl) {
      toast.error("Cannot copy chart: Container not found");
      return;
    }

    try {
      let chartSvg: SVGSVGElement | null = null;
      
      for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
        const wrapper = containerEl.querySelector('.recharts-wrapper');
        if (wrapper) {
          chartSvg = wrapper.querySelector('svg');
          if (chartSvg) break;
        }
      }

      if (!chartSvg) {
        toast.error("Cannot find chart to copy");
        return;
      }

      const box = chartSvg.getBoundingClientRect();
      const newSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      newSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      newSvg.setAttribute("width", Math.round(box.width).toString());
      newSvg.setAttribute("height", Math.round(box.height).toString());
      newSvg.setAttribute("viewBox", `0 0 ${Math.round(box.width)} ${Math.round(box.height)}`);
      
      Array.from(chartSvg.childNodes).forEach(node => {
        newSvg.appendChild(node.cloneNode(true));
      });
      
      await navigator.clipboard.writeText(newSvg.outerHTML);
      
      toast.success("Chart copied!", {
        duration: 850,
        style: { background: "#0EC04F", color: "#ffffff" },
      });
    } catch (error) {
      console.error("SVG Copy Error:", error);
      toast.error("Failed to copy chart");
    }
  }, []);

  // 2. parseMarkdownTable: ต้องประกาศก่อนถูกเรียกใช้ใน transformData
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

  // 3. setDataAndForceUpdate: ฟังก์ชันช่วยเหลือที่ใช้ในการอัปเดต State
  const setDataAndForceUpdate = useCallback((
    updater: (prev: Datum[]) => Datum[], 
    shouldForceChartUpdate: boolean = true
  ) => {
    setData((prev) => {
      const newData = updater(prev);
      if (shouldForceChartUpdate) {
        setChartUpdateKey(k => k + 1);
      }
      return newData;
    });
  }, []);

  // Toggle functions (ไม่เปลี่ยนแปลง)
  const toggleBarOrientation = useCallback(() => {
    startTransition(() => {
      setBarHorizontal((v) => !v);
    });
  }, []);

  const toggleStackedOrientation = useCallback(() => {
    startTransition(() => {
      setStackedHorizontal((v) => !v);
    });
  }, []);

  // Data Update Handlers (ใช้ setDataAndForceUpdate)
  // When fullscreen is open, use startTransition for smoother updates
  const updateLabel = useCallback((id: string, label: string) => {
    if (fullscreenChart) {
      startTransition(() => {
        setDataAndForceUpdate(prev => prev.map(d => (d.id === id ? { ...d, label } : d)));
      });
    } else {
      setDataAndForceUpdate(prev => prev.map(d => (d.id === id ? { ...d, label } : d)));
    }
  }, [setDataAndForceUpdate, fullscreenChart]);

  const updateColor = useCallback((id: string, color: string) => {
    if (fullscreenChart) {
      startTransition(() => {
        setDataAndForceUpdate(prev => prev.map(d => (d.id === id ? { ...d, color } : d)));
      });
    } else {
      setDataAndForceUpdate(prev => prev.map(d => (d.id === id ? { ...d, color } : d)));
    }
  }, [setDataAndForceUpdate, fullscreenChart]);

  const updateValue = useCallback((id: string, next: string) => {
    const parsed = Number(next);
    const finalValue = isFinite(parsed) ? parsed : 0;

    const updateFn = () => {
      setData((prev) => {
        const originalValue = prev.find(d => d.id === id)?.value;
        const newData = prev.map(d => (d.id === id ? { ...d, value: finalValue } : d));
        
        if (originalValue !== finalValue) {
            setChartUpdateKey(prevKey => prevKey + 1); 
        }
        return newData;
      });
    };

    if (fullscreenChart) {
      startTransition(updateFn);
    } else {
      updateFn();
    }
  }, [fullscreenChart]); 

  const addRow = useCallback(() => {
    const nextIndex = data.length;
    setDataAndForceUpdate((prev) => [
      ...prev,
      {
        id: generateId(),
        label: `Item ${nextIndex + 1}`,
        value: 0,
        color: PRESET_COLORS[nextIndex % PRESET_COLORS.length],
      },
    ]);
    toast.success("Row added!", { duration: 900 });
  }, [data.length, setDataAndForceUpdate]);

 const removeRow = useCallback((id: string) => {
    let removed = false;
    
    setDataAndForceUpdate((prev) => {
      // ตรวจสอบว่ามีข้อมูลเหลืออย่างน้อย 1 แถว 
      if (prev.length > 1) {
        const newData = prev.filter((d) => d.id !== id);
        if (newData.length < prev.length) {
            removed = true; 
        }
        return newData;
      }
      return prev; // ไม่ลบ ถ้าเหลือแค่ 1 แถว
    });

    // เพิ่มการแจ้งเตือน (Toast Notification) 
    if (removed) {
        toast.error("Row removed!", { duration: 900 });
    } 
}, [setDataAndForceUpdate]);

  // Sort Handler
  const requestSort = useCallback((key: "label" | "value") => {
    setSortConfig((prev) => {
      const newConfig = (() => {
        if (!prev || prev.key !== key) return { key, direction: "asc" as "asc" | "desc" };
        if (prev.direction === "asc") return { key, direction: "desc" as "asc" | "desc" };
        return null;
      })();
      
      setChartUpdateKey(k => k + 1); 
      return newConfig;
    });
  }, []);

  // Drag End Handler
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    if (sortConfig) return;

    const { active, over } = event;
    if (over && active.id !== over.id) {
      setDataAndForceUpdate((prev) => {
        const oldIndex = prev.findIndex((d) => d.id === active.id);
        const newIndex = prev.findIndex((d) => d.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, [sortConfig, setDataAndForceUpdate]);

  // Transform Data Handler (ใช้ parseMarkdownTable)
  const transformData = useCallback(() => {
    const rows = parseMarkdownTable(markdownInput);
    if (rows.length) {
      setDataAndForceUpdate(() => rows);
      setSortConfig(null);
      toast.success("Data transformed successfully!", { duration: 900 });
    } else {
      toast.error("Error: Invalid data format or no data found.");
    }
  }, [markdownInput, parseMarkdownTable, setDataAndForceUpdate]);

  // Load Example Handler
  const loadExample = useCallback((type: "csv" | "markdown") => {
    const examples = {
      csv: `Label,Value,Color\nA, 12, #3b82f6\nB, 30, #22c55e\nC, 18, #ef4444`,
      markdown: "| Label | Value | Color |\n|------:|------:|:-----:|\n| A     | 12    | #3b82f6 |\n| B     | 30    | #22c55e |\n| C     | 18    | #ef4444 |"
    };
    setMarkdownInput(examples[type]);
    setSortConfig(null);
    setChartUpdateKey(prev => prev + 1); 
    toast.success(`${type.toUpperCase()} Example loaded!`, { duration: 900 });
  }, []);

  // Export Handlers
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

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Optimized fullscreen handlers with startTransition for smooth opening
  const openFullscreen = useCallback((chartType: ChartType) => {
    startTransition(() => {
      setFullscreenChart(chartType);
    });
  }, []);

  const closeFullscreen = useCallback(() => {
    startTransition(() => {
      setFullscreenChart(null);
    });
  }, []);

  // Cleanup stacked tooltip timeout on unmount
  useEffect(() => {
    return () => {
      if (stackedTooltipTimeoutRef.current) {
        clearTimeout(stackedTooltipTimeoutRef.current);
      }
    };
  }, []);

  // Fullscreen escape key handler
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
        <div>
          <h1 className="text-2xl font-semibold">Data Visualizer</h1>
          <p className="text-sm text-muted-foreground">
            Edit values in either panel to update the charts live. Click Label/Value headers to sort.
          </p>
        </div>

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
                    <SortableContext items={sortedData.map((d) => d.id)} strategy={verticalListSortingStrategy}>
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
            <h2 className="text-lg font-medium mb-3">Paste Data</h2>
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

        {/* Charts */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard
              title="Bar Chart"
              chartRef={barCardRef}
              onCopySvg={() => copyChartSvg(barCardRef.current)}
              onFullscreen={() => openFullscreen("bar")}
              showOrientation
              isHorizontal={barHorizontal}
              onToggleOrientation={toggleBarOrientation}
            >
              <BarChart 
                key={`bar-${chartKey}`}
                data={chartData} 
                containerRef={barCardRef} 
                isHorizontal={barHorizontal} 
              />
            </ChartCard>

            <ChartCard
              title="Pie Chart - Donut with Total"
              chartRef={pieCardRef}
              onCopySvg={() => copyChartSvg(pieCardRef.current)}
              onFullscreen={() => openFullscreen("pie")}
            >
              <PieChart 
                key={`pie-${chartKey}`}
                data={chartData} 
                total={total} 
                containerRef={pieCardRef} 
              />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div 
              ref={stackedCardRef} 
              className="rounded-lg border p-4 h-[400px] cursor-pointer relative group"
              onClick={(e) => {
                const target = e.target as HTMLElement;
                // Don't trigger if clicking on buttons or tooltips
                if (
                  target.closest('button') ||
                  target.closest('[role="tooltip"]') ||
                  target.closest('.recharts-tooltip-wrapper') ||
                  target.tagName === 'BUTTON'
                ) {
                  return;
                }
                // Click anywhere in the entire card (including title) opens fullscreen
                openFullscreen("stacked");
              }}
              onMouseEnter={() => {
                setShowStackedTooltip(true);
                if (stackedTooltipTimeoutRef.current) {
                  clearTimeout(stackedTooltipTimeoutRef.current);
                }
                stackedTooltipTimeoutRef.current = setTimeout(() => {
                  setShowStackedTooltip(false);
                }, 2500);
              }}
              onMouseLeave={() => {
                if (stackedTooltipTimeoutRef.current) {
                  clearTimeout(stackedTooltipTimeoutRef.current);
                  stackedTooltipTimeoutRef.current = null;
                }
                setShowStackedTooltip(false);
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-medium">100% Stacked Chart</h3>
                <div 
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button variant="secondary" onClick={toggleStackedOrientation}>
                    {stackedHorizontal ? "Vertical" : "Horizontal"}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => copyChartSvg(stackedCardRef.current)}>
                    Copy SVG
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => openFullscreen("stacked")}>
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="h-[calc(100%-3rem)] relative">
                <div className={`absolute inset-0 z-10 transition-opacity pointer-events-none flex items-center justify-center ${showStackedTooltip ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="bg-black/50 text-white px-3 py-1 rounded-md text-xs font-medium">
                    Click to fullscreen
                  </div>
                </div>
                {/* Wrapper to ensure entire area is clickable, including empty space */}
                <div className="h-full w-full min-h-full">
                  <StackedChart 
                    key={`stacked-${chartKey}`}
                    data={chartData} 
                    containerRef={stackedCardRef} 
                    isHorizontal={stackedHorizontal} 
                  />
                </div>
              </div>
            </div>

            <ChartCard
              title="Line Chart - Linear"
              chartRef={lineCardRef}
              onCopySvg={() => copyChartSvg(lineCardRef.current)}
              onFullscreen={() => openFullscreen("line")}
            >
              <LineChart 
                key={`line-${chartKey}`}
                data={chartData} 
                containerRef={lineCardRef} 
              />
            </ChartCard>
          </div>
        </div>
      </div>

      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 900,
          style: { background: "black", color: "#ffff" },
          iconTheme: { primary: "white", secondary: "black" },
          error: { iconTheme: { primary: "#ef4444", secondary: "black" } },
        }}
      />

      {/* Fullscreen Modals */}
      <FullscreenModal
        chartType="bar"
        isOpen={fullscreenChart === "bar"}
        onClose={closeFullscreen}
        onCopySvg={() => copyChartSvg(chartRefs.bar.current)}
        showOrientation
        isHorizontal={barHorizontal}
        onToggleOrientation={toggleBarOrientation}
      >
        <BarChart key={`full-bar-${chartKey}`} data={fullscreenChartData} isHorizontal={barHorizontal} />
      </FullscreenModal>

      <FullscreenModal
        chartType="pie"
        isOpen={fullscreenChart === "pie"}
        onClose={closeFullscreen}
        onCopySvg={() => copyChartSvg(chartRefs.pie.current)}
      >
        <PieChart key={`full-pie-${chartKey}`} data={fullscreenChartData} total={total} isFullscreen={true} />
      </FullscreenModal>

      <FullscreenModal
        chartType="stacked"
        isOpen={fullscreenChart === "stacked"}
        onClose={closeFullscreen}
        onCopySvg={() => copyChartSvg(chartRefs.stacked.current)}
        showOrientation
        isHorizontal={stackedHorizontal}
        onToggleOrientation={toggleStackedOrientation}
      >
        <StackedChart key={`full-stacked-${chartKey}`} data={fullscreenChartData} isHorizontal={stackedHorizontal} />
      </FullscreenModal>

      <FullscreenModal
        chartType="line"
        isOpen={fullscreenChart === "line"}
        onClose={closeFullscreen}
        onCopySvg={() => copyChartSvg(chartRefs.line.current)}
      >
        <LineChart key={`full-line-${chartKey}`} data={fullscreenChartData} />
      </FullscreenModal>
    </>
  );
}