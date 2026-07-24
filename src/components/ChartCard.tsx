import React, { type ReactNode, useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, Code } from "lucide-react";

interface ChartCardProps {
  title: string;
  chartRef: React.RefObject<HTMLDivElement | null>;
  onCopyPng: () => void;
  onCopySvg: () => void;
  onCopyHtml?: () => void;
  onFullscreen: () => void;
  children: ReactNode;
  showOrientation?: boolean;
  isHorizontal?: boolean;
  onToggleOrientation?: () => void;
  customActions?: ReactNode;
}

export function ChartCard({
  title,
  chartRef,
  onCopySvg,
  onCopyPng,
  onCopyHtml,
  onFullscreen,
  children,
  showOrientation = false,
  isHorizontal = false,
  onToggleOrientation,
  customActions,
}: ChartCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    setShowTooltip(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 2500);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setShowTooltip(false);
  }, []);

  const handleChartClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't trigger fullscreen if clicking on buttons or interactive elements
    if (
      target.closest('button') ||
      target.closest('[role="tooltip"]') ||
      target.closest('.recharts-tooltip-wrapper')
    ) {
      return;
    }
    onFullscreen();
  }, [onFullscreen]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      className="rounded-lg border bg-card p-6 shadow-sm relative hover:shadow-md transition-shadow"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-2 mb-4">
        <div className="flex items-center gap-2">
          {onCopyHtml && (
            <Button
              size="sm"
              variant="outline"
              onClick={onCopyHtml}
              title="Copy chart as HTML"
              className="h-8 w-8 p-0"
            >
              <Code className="w-4 h-4" />
            </Button>
          )}
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {customActions}
          {showOrientation && (
            <Button
              size="sm"
              variant="outline"
              onClick={onToggleOrientation}
              title={isHorizontal ? "Switch to vertical" : "Switch to horizontal"}
            >
              {isHorizontal ? "↔" : "↕"}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={onCopySvg}
            title="Copy chart as SVG"
          >
            Copy SVG
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onCopyPng();
            }}
            title="Copy as PNG"
            className="h-8 w-8 p-0"
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div 
        ref={chartRef} 
        className="w-full h-96 relative cursor-pointer"
        onClick={handleChartClick}
      >
        {showTooltip && (
          <div data-hide-on-copy="true" className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div className="bg-black/50 text-white px-3 py-1 rounded-md text-xs font-medium">
              Click to fullscreen
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
