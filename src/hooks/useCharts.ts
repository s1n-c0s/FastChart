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
  try {
    const svg = containerEl?.querySelector("svg") as SVGSVGElement | null;
    if (!svg) return;

    // Clone SVG and apply computed styles to preserve text colors
    const clone = svg.cloneNode(true) as SVGSVGElement;
    
    // Apply computed styles to all elements
    const origElements = svg.querySelectorAll('*');
    const cloneElements = clone.querySelectorAll('*');
    
    cloneElements.forEach((el, index) => {
      const origEl = origElements[index];
      if (origEl) {
        const computedStyle = window.getComputedStyle(origEl);
        
        if (computedStyle.fill) {
          (el as SVGElement).setAttribute('fill', computedStyle.fill);
        }
        if (computedStyle.stroke) {
          (el as SVGElement).setAttribute('stroke', computedStyle.stroke);
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

    // Specifically handle text elements to preserve colors and fonts
    const textElements = clone.querySelectorAll('text, tspan');
    const origTextElements = svg.querySelectorAll('text, tspan');
    textElements.forEach((el, index) => {
      const origEl = origTextElements[index] as Element;
      if (origEl) {
        const computedStyle = window.getComputedStyle(origEl);
        if (computedStyle.fill) {
          (el as SVGElement).setAttribute('fill', computedStyle.fill);
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

    const svgData = new XMLSerializer().serializeToString(clone);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    // ตั้งค่าขนาด canvas ตาม SVG
    const svgBounds = svg.getBoundingClientRect();
    canvas.width = svgBounds.width * 2; // เพิ่มความชัด x2
    canvas.height = svgBounds.height * 2;

    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = async () => {
      if (ctx) {
        // ตั้ง background เป็น transparent
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(async (blob) => {
          if (blob) {
            await navigator.clipboard.write([
              new ClipboardItem({ "image/png": blob })
            ]);
            toast.success("PNG Copied to Clipboard!");
          }
          URL.revokeObjectURL(url);
        }, "image/png");
      }
    };
    img.src = url;
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