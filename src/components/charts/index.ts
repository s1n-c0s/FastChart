// ไฟล์: src/components/charts/index.ts

// Components (สันนิษฐานว่าใช้ Named/Default Export ที่แก้ไขแล้ว)
export { BarChart } from './bar-chart'
export { LineChart } from './line-chart'
export { PieChart } from './pie-chart'
export { StackedChart } from './stacked-chart'
export { default as AreaGradientChart } from './area-gradient-chart'

// ---
// Types
export type { BarChartProps } from './bar-chart'
export type { LineChartProps } from './line-chart'
export type { PieChartProps } from './pie-chart'
export type { StackedChartProps } from './stacked-chart'

// ⭐️ แก้ไข: AreaGradientChartProps ต้องดึง Default Export (ถ้าเป็น Type เดียวที่เหลือ)
export type { default as AreaGradientChartProps } from './area-gradient-chart'