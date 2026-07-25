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
      
      // Remove elements that should not be copied
      const hiddenElements = clone.querySelectorAll('[data-hide-on-copy="true"]');
      hiddenElements.forEach(el => el.remove());

      // Apply computed styles to preserve text colors and other styling
      
      // We need to map cloned elements back to their original elements to get computed styles
      // Since we removed some nodes, we must re-query the original DOM matching the remaining nodes
      // However, iterating origAllElements index-to-index is dangerous if we removed nodes!
      // Let's do it safely by checking the original structure.
      
      // To keep it simple, apply styles BEFORE removing nodes, then remove them.
      const cloneTemp = svg.cloneNode(true) as SVGSVGElement;
      const allTempElements = cloneTemp.querySelectorAll('*');
      const origTempElements = svg.querySelectorAll('*');
      
      allTempElements.forEach((el, index) => {
        const origEl = origTempElements[index] as Element;
        const computedStyle = window.getComputedStyle(origEl);
        
        if (computedStyle.opacity === '0' || computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
          (el as SVGElement).setAttribute('data-hide-on-copy', 'true');
          return;
        }

        // Apply important computed properties. 
        // We ALWAYS apply colors and fonts (except font-size) because they might use CSS variables (like var(--color))
        // which need to be resolved to absolute values for the copied SVG.
        if (computedStyle.fill) {
          (el as SVGElement).setAttribute('fill', computedStyle.fill);
        }
        if (computedStyle.stroke) {
          (el as SVGElement).setAttribute('stroke', computedStyle.stroke);
        }
        if (computedStyle.color) {
          (el as SVGElement).setAttribute('color', computedStyle.color);
          (el as SVGElement).style.color = computedStyle.color;
        }
        if (computedStyle.fontFamily) {
          (el as SVGElement).setAttribute('font-family', computedStyle.fontFamily);
        }
        // ONLY skip font-size if it already exists, to prevent browser minimum font size clamping (e.g., 12px)
        // from breaking dynamically scaled down text like in the StackedChart labels.
        if (computedStyle.fontSize && !origEl.hasAttribute('font-size')) {
          (el as SVGElement).setAttribute('font-size', computedStyle.fontSize);
        }
        if (computedStyle.fontWeight) {
          (el as SVGElement).setAttribute('font-weight', computedStyle.fontWeight);
        }
        if (computedStyle.fontStyle) {
          (el as SVGElement).setAttribute('font-style', computedStyle.fontStyle);
        }
      });

      // Now remove hidden elements AFTER styling
      const hiddenElementsToRemove = cloneTemp.querySelectorAll('[data-hide-on-copy="true"]');
      hiddenElementsToRemove.forEach(el => el.remove());

      if (!cloneTemp.getAttribute("xmlns")) {
        cloneTemp.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      }
      
      // Inject fact text overlay if it exists
      const factOverlayEl = containerEl?.querySelector('.fact-text-overlay') as SVGSVGElement;
      if (factOverlayEl) {
        const overlayClone = factOverlayEl.cloneNode(true) as SVGSVGElement;
        const hiddenInOverlay = overlayClone.querySelectorAll('[data-hide-on-copy="true"]');
        hiddenInOverlay.forEach((el: Element) => el.remove());
        cloneTemp.innerHTML += overlayClone.innerHTML;
      }

      const xml = new XMLSerializer().serializeToString(cloneTemp);
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

  const copyChartHtml = useCallback(async (containerEl: HTMLElement | null) => {
    if (!containerEl) return;
    try {
      const clone = containerEl.cloneNode(true) as HTMLElement;
      const allTempElements = clone.querySelectorAll('*');
      const origTempElements = containerEl.querySelectorAll('*');
      
      allTempElements.forEach((el, index) => {
        const origEl = origTempElements[index] as Element;
        if (!origEl) return;
        const computedStyle = window.getComputedStyle(origEl);
        
        if (el instanceof HTMLElement) {
          el.style.color = computedStyle.color;
          el.style.backgroundColor = computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' ? computedStyle.backgroundColor : 'transparent';
          el.style.fontFamily = computedStyle.fontFamily;
          el.style.fontSize = computedStyle.fontSize;
          el.style.fontWeight = computedStyle.fontWeight;
          el.style.display = computedStyle.display;
          if (computedStyle.display === 'flex') {
            el.style.flexDirection = computedStyle.flexDirection;
            el.style.alignItems = computedStyle.alignItems;
            el.style.justifyContent = computedStyle.justifyContent;
            el.style.gap = computedStyle.gap;
          }
          el.style.padding = computedStyle.padding;
          el.style.margin = computedStyle.margin;
          el.style.border = computedStyle.border;
          el.style.borderRadius = computedStyle.borderRadius;
          el.style.position = computedStyle.position;
          if (computedStyle.position === 'absolute') {
            el.style.top = computedStyle.top;
            el.style.left = computedStyle.left;
            el.style.right = computedStyle.right;
            el.style.bottom = computedStyle.bottom;
          }
        } else if (el instanceof SVGElement) {
          if (computedStyle.fill) el.setAttribute('fill', computedStyle.fill);
          if (computedStyle.stroke) el.setAttribute('stroke', computedStyle.stroke);
          if (computedStyle.color) el.setAttribute('color', computedStyle.color);
          if (computedStyle.fontFamily) el.setAttribute('font-family', computedStyle.fontFamily);
          if (computedStyle.fontSize) el.setAttribute('font-size', computedStyle.fontSize);
          if (computedStyle.fontWeight) el.setAttribute('font-weight', computedStyle.fontWeight);
        }
      });
      
      const hiddenElements = clone.querySelectorAll('[data-hide-on-copy="true"]');
      hiddenElements.forEach(el => el.remove());

      const rootStyle = window.getComputedStyle(containerEl);
      clone.style.backgroundColor = rootStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' ? rootStyle.backgroundColor : 'transparent';
      clone.style.color = rootStyle.color;
      clone.style.fontFamily = rootStyle.fontFamily;
      clone.style.display = rootStyle.display;
      clone.style.width = rootStyle.width;
      clone.style.height = rootStyle.height;

      const htmlString = clone.outerHTML;
      
      // We write as plain text so that website builders (like WordPress) 
      // don't try to parse and strip the SVG/styles during a rich-text paste.
      // The user can then paste this raw code into a 'Custom HTML' block.
      await navigator.clipboard.writeText(htmlString);
      
      toast.success("HTML Code Copied!", {
        duration: 850,
      });
    } catch {
      toast.error("Failed to copy HTML.");
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
    copyChartHtml,
    openFullscreen,
    closeFullscreen
  };
}