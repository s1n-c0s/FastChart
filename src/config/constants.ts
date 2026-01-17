import type { Datum } from "@/types";
import { generateId } from "@/lib/utils/data-parser";

export const PRESET_COLORS = [
  "#3b82f6", // blue-500
  "#22c55e", // green-500
  "#ef4444", // red-500
  "#f59e0b", // amber-500
  "#a855f7", // purple-500
  "#06b6d4", // cyan-500
] as const;

export const INITIAL_DATA: Datum[] = [
  { id: generateId(), label: "A", value: 12, color: PRESET_COLORS[0] },
  { id: generateId(), label: "B", value: 30, color: PRESET_COLORS[1] },
  { id: generateId(), label: "C", value: 18, color: PRESET_COLORS[2] },
];

export const INITIAL_MARKDOWN = `Label,Value,Color\nitem1,"5",#F032E6\nitem2,"4",#46F0F0\nitem3,"5",#06b6d4`;

export const TOAST_CONFIG = {
  position: "bottom-center" as const,
  reverseOrder: false,
  gutter: 3,
  containerClassName: "",
  containerStyle: {},
  toastOptions: {
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
        primary: "#ef4444", // red-500
        secondary: "black",
      },
    },
  },
};