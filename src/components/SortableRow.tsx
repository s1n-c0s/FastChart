import React, { useEffect, useRef, useState, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RemoveButton } from "@/components/ui/RemoveButton";
import type { Datum } from "@/types";
import styles from "./DataVisualizer.module.css";

interface SortableRowProps {
  row: Datum;
  onUpdateLabel: (id: string, label: string) => void;
  onUpdateValue: (id: string, value: string) => void;
  onUpdateColor: (id: string, color: string) => void;
  onRemove: (id: string) => void;
  presetColors: readonly string[];
}

export const SortableRow = React.memo(({
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
