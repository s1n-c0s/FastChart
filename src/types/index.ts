export type Datum = {
  id: string;
  label: string;
  value: number;
  color: string;
  [key: string]: string | number;  // Allow additional properties for stacked chart data
};

export type SortConfig = {
  key: "label" | "value";
  direction: "asc" | "desc";
} | null;

export type ChartType = "bar" | "pie" | "stacked" | "line";