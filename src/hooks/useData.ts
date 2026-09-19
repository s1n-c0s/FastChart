import { useState, useMemo, useCallback } from 'react';
import type { Datum, SortConfig } from '@/types';

export const useSort = (data: Datum[]) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  const sortedData = useMemo(() => {
    if (sortConfig === null) return data;
    const sortableData = [...data];

    sortableData.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
    return sortableData;
  }, [data, sortConfig]);

  const requestSort = useCallback((key: "label" | "value") => {
    setSortConfig((prev) => {
      let direction: "asc" | "desc" = "asc";
      if (prev && prev.key === key && prev.direction === "asc") {
        direction = "desc";
      } else if (prev && prev.key === key && prev.direction === "desc") {
        return null;
      }
      return { key, direction };
    });
  }, []);

  return { sortedData, sortConfig, requestSort, setSortConfig };
};

export const useDataManipulation = (initialData: Datum[]) => {
  const [data, setData] = useState<Datum[]>(initialData);

  const total = useMemo(() => {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = data[i].value;
      if (isFinite(v)) sum += v;
    }
    return sum;
  }, [data]);

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

  const removeRow = useCallback((id: string) => {
    setData((prev) =>
      prev.length > 1 ? prev.filter((d) => d.id !== id) : prev
    );
  }, []);

  return {
    data,
    setData,
    total,
    updateLabel,
    updateValue,
    updateColor,
    removeRow,
  };
};