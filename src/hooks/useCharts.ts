import { useCallback, useRef, useState } from 'react';
import * as htmlToImage from 'html-to-image';
import toast from 'react-hot-toast';
import type { ChartType } from '@/types';

export function useCharts() {
  const [stackedHorizontal, setStackedHorizontal] = useState(true);
  const [barHorizontal, setBarHorizontal] = useState(true);
  const [stackedRadial, setStackedRadial] = useState(false);
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
      
      // Apply computed styles to preserve text colors and other styling
      const allElements = clone.querySelectorAll('*');
      const origAllElements = svg.querySelectorAll('*');
      allElements.forEach((el, index) => {
        const origEl = origAllElements[index] as Element;
        const computedStyle = window.getComputedStyle(origEl);
        
        // Apply important computed properties
        if (computedStyle.fill) {
          (el as SVGElement).setAttribute('fill', computedStyle.fill);
        }
        if (computedStyle.stroke) {
          (el as SVGElement).setAttribute('stroke', computedStyle.stroke);
        }
        if (computedStyle.color) {
          (el as SVGElement).setAttribute('color', computedStyle.color);
        }
        if (computedStyle.fontFamily) {
          (el as SVGElement).setAttribute('font-family', computedStyle.fontFamily);
        }
        if (computedStyle.fontSize) {
          (el as SVGElement).setAttribute('font-size', computedStyle.fontSize);
        }
        if (computedStyle.fontWeight) {
          (el as SVGElement).setAttribute('font-weight', computedStyle.fontWeight);
        }
        if (computedStyle.fontStyle) {
          (el as SVGElement).setAttribute('font-style', computedStyle.fontStyle);
        }
      });

      // Specifically handle text elements to preserve their colors and fonts
      const textElements = clone.querySelectorAll('text, tspan');
      const origTextElements = svg.querySelectorAll('text, tspan');
      textElements.forEach((el, index) => {
        const origEl = origTextElements[index] as Element;
        if (origEl) {
          const computedStyle = window.getComputedStyle(origEl);
          if (computedStyle.fill) {
            (el as SVGElement).setAttribute('fill', computedStyle.fill);
          }
          if (computedStyle.color) {
            (el as SVGElement).style.color = computedStyle.color;
          }
          if (computedStyle.fontFamily) {
            (el as SVGElement).setAttribute('font-family', computedStyle.fontFamily);
          }
          if (computedStyle.fontSize) {
            (el as SVGElement).setAttribute('font-size', computedStyle.fontSize);
          }
          if (computedStyle.fontWeight) {
            (el as SVGElement).setAttribute('font-weight', computedStyle.fontWeight);
          }
          if (computedStyle.fontStyle) {
            (el as SVGElement).setAttribute('font-style', computedStyle.fontStyle);
          }
        }
      });

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

  const copyChartPng = useCallback(async (containerEl: HTMLElement | null) => {
    if (!containerEl) return;
    try {
      const dataUrl = await htmlToImage.toPng(containerEl, {
        backgroundColor: 'transparent',
        pixelRatio: 2 // High resolution
      });
      
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob })
        ]);
        toast.success("PNG Copied to Clipboard!");
      }
    } catch {
      toast.error("Failed to copy PNG.");
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
    stackedRadial,
    setStackedRadial,
    fullscreenChart,
    barCardRef,
    pieCardRef,
    stackedCardRef,
    lineCardRef,
    copyChartSvg,
    copyChartPng,
    openFullscreen,
    closeFullscreen
  };
}