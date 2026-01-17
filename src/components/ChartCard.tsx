import React, { type ReactNode, useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Maximize2, ImageIcon } from "lucide-react";

interface ChartCardProps {
  title: string;
  chartRef: React.RefObject<HTMLDivElement | null>;
  onCopyPng: () => void;
  onCopySvg: () => void;
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
      className="rounded-lg border bg-card p-6 shadow-sm relative cursor-pointer hover:shadow-md transition-shadow"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleChartClick}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
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
          <Button
            size="sm"
            variant="outline"
            onClick={onFullscreen}
            title="View fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div ref={chartRef} className="w-full h-96 relative">
        {showTooltip && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
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
