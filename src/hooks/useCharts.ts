import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import type { ChartType } from '@/types';

export function useCharts() {
  const [stackedHorizontal, setStackedHorizontal] = useState(true);
  const [barHorizontal, setBarHorizontal] = useState(true);
  const [fullscreenChart, setFullscreenChart] = useState<ChartType | null>(null);

  const barCardRef = useRef<HTMLDivElement>(null);
  const pieCardRef = useRef<HTMLDivElement>(null);
  const stackedCardRef = useRef<HTMLDivElement>(null);
  const lineCardRef = useRef<HTMLDivElement>(null);

  const copyChartSvg = useCallback(async (containerEl: HTMLElement | null) => {
    try {
      const svg = containerEl?.querySelector("svg") as SVGSVGElement | null;
      if (!svg) return;
      const clone = svg.cloneNode(true) as SVGSVGElement;
      if (!clone.getAttribute("xmlns")) {
        clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      }

      const xml = new XMLSerializer().serializeToString(clone);
      await navigator.clipboard.writeText(xml);
      toast.success("SVG Copied to Clipboard!", {
        duration: 850,
        style: {
          background: "#0EC04F",
          color: "#ffffff",
        },
      });
    } catch {
      toast.error("Failed to copy SVG.");
    }
  }, []);

  const openFullscreen = useCallback((chartType: ChartType) => {
    setFullscreenChart(chartType);
  }, []);

  const closeFullscreen = useCallback(() => {
    setFullscreenChart(null);
  }, []);

  return {
    stackedHorizontal,
    setStackedHorizontal,
    barHorizontal,
    setBarHorizontal,
    fullscreenChart,
    barCardRef,
    pieCardRef,
    stackedCardRef,
    lineCardRef,
    copyChartSvg,
    openFullscreen,
    closeFullscreen
  };
}