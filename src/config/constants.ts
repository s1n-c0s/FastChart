export const PRESET_COLORS = [
  "#3b82f6", // blue-500
  "#22c55e", // green-500
  "#ef4444", // red-500
  "#f59e0b", // amber-500
  "#a855f7", // purple-500
  "#06b6d4", // cyan-500
] as const;

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