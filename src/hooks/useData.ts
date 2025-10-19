import { useState, useMemo } from 'react';
import type { Datum, SortConfig } from '@/types';

export const useSort = (data: Datum[]) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

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

  return { sortedData, sortConfig, requestSort, setSortConfig };
};

export const useDataManipulation = (initialData: Datum[]) => {
  const [data, setData] = useState<Datum[]>(initialData);

  const total = useMemo(
    () => data.reduce((sum, d) => sum + (isFinite(d.value) ? d.value : 0), 0),
    [data]
  );

  const updateLabel = (id: string, label: string) => {
    setData((prev) => prev.map((d) => (d.id === id ? { ...d, label } : d)));
  };

  const updateValue = (id: string, next: string) => {
    const parsed = Number(next);
    setData((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, value: isFinite(parsed) ? parsed : 0 } : d
      )
    );
  };

  const updateColor = (id: string, color: string) => {
    setData((prev) => prev.map((d) => (d.id === id ? { ...d, color } : d)));
  };

  const removeRow = (id: string) => {
    setData((prev) =>
      prev.length > 1 ? prev.filter((d) => d.id !== id) : prev
    );
  };

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