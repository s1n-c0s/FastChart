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
        if (cs.fill) (el as SVGElement).setAttribute('fill', cs.fill);
        if (cs.stroke) (el as SVGElement).setAttribute('stroke', cs.stroke);
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

  const copyChartPng = useCallback(async (containerEl: HTMLElement | null) => {
    if (!containerEl) return;
    try {
      // Temporarily remove elements from DOM to guarantee they aren't copied
      const hiddenElements = Array.from(containerEl.querySelectorAll('[data-hide-on-copy="true"]'));
      const parents = hiddenElements.map(el => el.parentNode);
      const nextSiblings = hiddenElements.map(el => el.nextSibling);
      
      hiddenElements.forEach(el => el.remove());

      const cardEl = containerEl.closest('.bg-card') || document.body;
      const bgColor = window.getComputedStyle(cardEl).backgroundColor;

      const dataUrl = await htmlToImage.toPng(containerEl, {
        backgroundColor: bgColor === 'rgba(0, 0, 0, 0)' ? '#ffffff' : bgColor,
        pixelRatio: 2, // High resolution
        filter: (node) => {
          return node.getAttribute ? node.getAttribute("data-hide-on-copy") !== "true" : true;
        }
      });
      
      // Restore elements to the DOM
      hiddenElements.forEach((el, index) => {
        if (parents[index]) {
          parents[index]?.insertBefore(el, nextSiblings[index]);
        }
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