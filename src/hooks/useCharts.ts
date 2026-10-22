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

  const copyChartSvg = useCallback(async (containerEl: HTMLElement | null, chartTitle?: string) => {
    try {
      // Short pause so the chart (including axis labels after a toggle) finishes layout.
      await new Promise(res => setTimeout(res, 80));

      const svg = containerEl?.querySelector("svg.recharts-surface") as SVGSVGElement | null;
      if (!svg) return;

      // Clone once — we only use this single clone for the final output.
      const cloneTemp = svg.cloneNode(true) as SVGSVGElement;
      const allTempElements = cloneTemp.querySelectorAll('*');
      const origTempElements = svg.querySelectorAll('*');

      allTempElements.forEach((el, index) => {
        const origEl = origTempElements[index] as Element;
        if (!origEl) return;
        const cs = window.getComputedStyle(origEl);

        if (cs.opacity === '0' || cs.display === 'none' || cs.visibility === 'hidden') {
          (el as SVGElement).setAttribute('data-hide-on-copy', 'true');
          return;
        }

        // Resolve CSS-variable-based colors & fonts into absolute values.
        if (cs.fill) {
          (el as SVGElement).setAttribute('fill', cs.fill);
          (el as SVGElement).style.fill = cs.fill;
        }
        if (cs.stroke) {
          (el as SVGElement).setAttribute('stroke', cs.stroke);
          (el as SVGElement).style.stroke = cs.stroke;
        }
        if (cs.strokeWidth) (el as SVGElement).setAttribute('stroke-width', cs.strokeWidth);
        if (cs.strokeDasharray) (el as SVGElement).setAttribute('stroke-dasharray', cs.strokeDasharray);
        if (cs.strokeOpacity && cs.strokeOpacity !== '1') (el as SVGElement).setAttribute('stroke-opacity', cs.strokeOpacity);
        if (cs.opacity && cs.opacity !== '1') (el as SVGElement).setAttribute('opacity', cs.opacity);
        if (cs.color) {
          (el as SVGElement).setAttribute('color', cs.color);
          (el as SVGElement).style.color = cs.color;
        }
        if (cs.fontFamily) (el as SVGElement).setAttribute('font-family', cs.fontFamily);
        if (cs.fontSize && !origEl.hasAttribute('font-size')) {
          (el as SVGElement).setAttribute('font-size', cs.fontSize);
        }
        if (cs.fontWeight) (el as SVGElement).setAttribute('font-weight', cs.fontWeight);
        if (cs.fontStyle) (el as SVGElement).setAttribute('font-style', cs.fontStyle);

        // ★ Capture transform + transform-origin so focused pie segments keep their scale.
        // DO NOT override if they already have an inline style!
        if (cs.transform && cs.transform !== 'none' && !(origEl as SVGElement).style.transform) {
          (el as SVGElement).style.transform = cs.transform;
        }
        if (cs.transformOrigin && !(origEl as SVGElement).style.transformOrigin) {
          (el as SVGElement).style.transformOrigin = cs.transformOrigin;
        }
      });

      // Strip hidden elements AFTER styling (so index mapping stays 1:1 above).
      cloneTemp.querySelectorAll('[data-hide-on-copy="true"]').forEach(el => el.remove());

      if (!cloneTemp.getAttribute("xmlns")) {
        cloneTemp.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      }

      // Inject fact-text overlay if it exists.
      const factOverlayEl = containerEl?.querySelector('.fact-text-overlay') as SVGSVGElement;
      if (factOverlayEl) {
        const overlayClone = factOverlayEl.cloneNode(true) as SVGSVGElement;
        overlayClone.querySelectorAll('[data-hide-on-copy="true"]').forEach((el: Element) => el.remove());
        cloneTemp.innerHTML += overlayClone.innerHTML;
      }

      // If title is provided, prepend a title banner and expand the top of the SVG cleanly
      if (chartTitle && chartTitle.trim()) {
        const titleHeight = 44;
        const currentViewBox = cloneTemp.getAttribute("viewBox");
        const svgRect = svg.getBoundingClientRect();
        const baseWidth = svgRect.width || parseFloat(cloneTemp.getAttribute("width") || "500");
        const baseHeight = svgRect.height || parseFloat(cloneTemp.getAttribute("height") || "384");

        // Wrap existing content in a <g> translated down
        const contentGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        contentGroup.setAttribute("transform", `translate(0, ${titleHeight})`);
        while (cloneTemp.firstChild) {
          contentGroup.appendChild(cloneTemp.firstChild);
        }

        // Adjust viewBox or width/height
        if (currentViewBox) {
          const [vx, vy, vw, vh] = currentViewBox.split(/[\s,]+/).map(Number);
          if (!isNaN(vx) && !isNaN(vy) && !isNaN(vw) && !isNaN(vh)) {
            cloneTemp.setAttribute("viewBox", `${vx} ${vy} ${vw} ${vh + titleHeight}`);
          }
        } else {
          cloneTemp.setAttribute("viewBox", `0 0 ${baseWidth} ${baseHeight + titleHeight}`);
        }

        if (cloneTemp.hasAttribute("height")) {
          const origH = parseFloat(cloneTemp.getAttribute("height") || String(baseHeight));
          cloneTemp.setAttribute("height", String(origH + titleHeight));
        }

        const isDark = document.documentElement.classList.contains("dark");
        const textNode = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textNode.setAttribute("x", "16");
        textNode.setAttribute("y", "32");
        textNode.setAttribute("font-size", "24");
        textNode.setAttribute("font-weight", "600");
        textNode.setAttribute("font-family", window.getComputedStyle(document.body).fontFamily || "system-ui, sans-serif");
        textNode.setAttribute("fill", isDark ? "#f3f4f6" : "#111827");
        textNode.textContent = chartTitle.trim();

        cloneTemp.appendChild(textNode);
        cloneTemp.appendChild(contentGroup);
      }

      // Inject hover-state CSS (useful when pasting into browsers / SVG-aware viewers).
      const styleNode = document.createElementNS("http://www.w3.org/2000/svg", "style");
      styleNode.textContent = `
        .my-sector { transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .my-hovered-sector, .my-hovered-sector-static { transform: scale(1.1); }
      `;
      cloneTemp.appendChild(styleNode);

      // Explicitly inline transform on focused pie segments.
      // getComputedStyle().transform on SVG elements can return 'none' even when
      // a CSS stylesheet transform is active, so we must set it by class name.
      const origFocused = Array.from(svg.querySelectorAll('.my-hovered-sector, .my-hovered-sector-static'));
      const cloneFocused = Array.from(cloneTemp.querySelectorAll('.my-hovered-sector, .my-hovered-sector-static'));
      const svgRect = svg.getBoundingClientRect();
      cloneFocused.forEach((el, i) => {
        const svgEl = el as SVGElement;
        svgEl.style.transform = 'scale(1.1)';
        
        const origEl = origFocused[i] as SVGElement;
        if (origEl) {
          const originVal = origEl.style.transformOrigin || window.getComputedStyle(origEl).transformOrigin;
          if (originVal) {
            svgEl.style.transformOrigin = originVal;
            
            // Calculate absolute px for cx, cy
            const parts = originVal.split(' ').map(p => p.trim()).filter(Boolean);
            if (parts.length >= 2) {
              let cx = 0, cy = 0;
              if (parts[0].includes('%')) cx = (parseFloat(parts[0]) / 100) * svgRect.width;
              else cx = parseFloat(parts[0]);
              
              if (parts[1].includes('%')) cy = (parseFloat(parts[1]) / 100) * svgRect.height;
              else cy = parseFloat(parts[1]);
              
              if (!isNaN(cx) && !isNaN(cy)) {
                svgEl.setAttribute('transform', `translate(${cx}, ${cy}) scale(1.1) translate(${-cx}, ${-cy})`);
              }
            }
          }
        }
      });

      const xml = new XMLSerializer().serializeToString(cloneTemp);
      await navigator.clipboard.writeText(xml);
      toast.success("SVG Copied to Clipboard!", {
        duration: 850,
        style: {
          background: "#0EC04F",
          color: "#ffffff",
        },
      });
    } catch (error: any) {
      toast.error(`Failed to copy SVG: ${error?.message || error}`);
    }
  }, []);

  const copyChartPng = useCallback(async (containerEl: HTMLElement | null, chartTitle?: string) => {
    if (!containerEl) return;
    try {
      // Short pause so layout/animations settle
      await new Promise(res => setTimeout(res, 80));

      const hasTitle = Boolean(chartTitle && chartTitle.trim());
      let titleEl: HTMLDivElement | null = null;
      let origOverflow: string = "";
      let origHeight: string = "";

      // Temporarily remove overlay buttons or tooltips marked with data-hide-on-copy
      const hiddenElements = Array.from(containerEl.querySelectorAll('[data-hide-on-copy="true"]'));
      const parents = hiddenElements.map(el => el.parentNode);
      const nextSiblings = hiddenElements.map(el => el.nextSibling);
      hiddenElements.forEach(el => el.remove());

      if (hasTitle) {
        origOverflow = containerEl.style.overflow;
        origHeight = containerEl.style.height;

        const currentHeight = containerEl.getBoundingClientRect().height || 384;
        const titleHeight = 44;

        containerEl.style.overflow = "visible";
        containerEl.style.height = `${currentHeight + titleHeight}px`;

        const isDark = document.documentElement.classList.contains("dark");
        titleEl = document.createElement("div");
        titleEl.textContent = chartTitle!.trim();
        titleEl.style.fontSize = "24px";
        titleEl.style.fontWeight = "600";
        titleEl.style.lineHeight = "1.3";
        titleEl.style.padding = "4px 8px 14px 8px";
        titleEl.style.color = isDark ? "#f3f4f6" : "#111827";
        titleEl.style.fontFamily = window.getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";

        containerEl.insertBefore(titleEl, containerEl.firstChild);
      }

      // Explicitly inline computed styles on text/labels & grid lines for accurate PNG rendering
      const textNodes = Array.from(containerEl.querySelectorAll('text, tspan, .chart-global-label, .recharts-cartesian-axis-tick text'));
      const origTextStyles = textNodes.map((node) => {
        const svgEl = node as SVGElement;
        const cs = window.getComputedStyle(svgEl);
        const originalFill = svgEl.getAttribute("fill");
        const originalColor = svgEl.style.color;
        const originalFillStyle = svgEl.style.fill;

        if (cs.fill && cs.fill !== "none") {
          svgEl.setAttribute("fill", cs.fill);
          svgEl.style.fill = cs.fill;
        }
        if (cs.color) {
          svgEl.style.color = cs.color;
        }

        return {
          el: svgEl,
          fill: originalFill,
          color: originalColor,
          fillStyle: originalFillStyle,
        };
      });

      // Explicitly inline computed stroke & opacity on CartesianGrid lines for PNG rendering
      const gridLines = Array.from(containerEl.querySelectorAll('.recharts-cartesian-grid line, .recharts-cartesian-grid-horizontal line, .recharts-cartesian-grid-vertical line'));
      const origLineStyles = gridLines.map((line) => {
        const svgLine = line as SVGLineElement;
        const cs = window.getComputedStyle(svgLine);
        const originalStroke = svgLine.getAttribute("stroke");
        const originalStrokeOpacity = svgLine.getAttribute("stroke-opacity");
        const originalOpacity = svgLine.getAttribute("opacity");
        const originalStrokeWidth = svgLine.getAttribute("stroke-width");

        if (cs.stroke) svgLine.setAttribute("stroke", cs.stroke);
        if (cs.strokeOpacity) svgLine.setAttribute("stroke-opacity", cs.strokeOpacity);
        if (cs.opacity) svgLine.setAttribute("opacity", cs.opacity);
        if (cs.strokeWidth) svgLine.setAttribute("stroke-width", cs.strokeWidth);

        return {
          el: svgLine,
          stroke: originalStroke,
          strokeOpacity: originalStrokeOpacity,
          opacity: originalOpacity,
          strokeWidth: originalStrokeWidth,
        };
      });

      // Convert directly into PNG blob with transparent background
      const blob = await htmlToImage.toBlob(containerEl, {
        backgroundColor: undefined, // Transparent
        pixelRatio: 2, // High resolution
        filter: (node) => {
          return node.getAttribute ? node.getAttribute("data-hide-on-copy") !== "true" : true;
        }
      });

      // Restore inline styles on text/labels
      origTextStyles.forEach(({ el, fill, color, fillStyle }) => {
        if (fill !== null) el.setAttribute("fill", fill);
        else el.removeAttribute("fill");
        el.style.color = color;
        el.style.fill = fillStyle;
      });

      // Restore inline styles on grid lines
      origLineStyles.forEach(({ el, stroke, strokeOpacity, opacity, strokeWidth }) => {
        if (stroke !== null) el.setAttribute("stroke", stroke);
        else el.removeAttribute("stroke");

        if (strokeOpacity !== null) el.setAttribute("stroke-opacity", strokeOpacity);
        else el.removeAttribute("stroke-opacity");

        if (opacity !== null) el.setAttribute("opacity", opacity);
        else el.removeAttribute("opacity");

        if (strokeWidth !== null) el.setAttribute("stroke-width", strokeWidth);
        else el.removeAttribute("stroke-width");
      });

      // Restore container element
      if (titleEl && titleEl.parentNode) {
        titleEl.parentNode.removeChild(titleEl);
      }
      if (hasTitle) {
        containerEl.style.overflow = origOverflow;
        containerEl.style.height = origHeight;
      }
      hiddenElements.forEach((el, index) => {
        if (parents[index]) {
          parents[index]?.insertBefore(el, nextSiblings[index]);
        }
      });

      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob })
        ]);
        toast.success("PNG Copied to Clipboard!");
      } else {
        throw new Error("Unable to create image blob");
      }
    } catch (error: any) {
      console.error("Failed to copy PNG:", error);
      toast.error(`Failed to copy PNG: ${error?.message || error}`);
    }
  }, []);

  const copyChartEmbed = useCallback(async (config: any) => {
    try {
      const serialized = encodeURIComponent(JSON.stringify(config));
      const url = `${window.location.origin}/embed?config=${serialized}`;
      const iframeCode = `<iframe src="${url}" width="100%" height="400" frameborder="0" style="border-radius: 8px; overflow: hidden; background: transparent;"></iframe>`;
      
      await navigator.clipboard.writeText(iframeCode);
      
      toast.success("Embed Code Copied!", {
        duration: 850,
      });
    } catch {
      toast.error("Failed to copy embed code.");
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
    copyChartEmbed,
    openFullscreen,
    closeFullscreen
  };
}