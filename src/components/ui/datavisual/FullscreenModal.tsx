import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { ChartType } from "@/types";
import React from "react";

interface FullscreenModalProps {
  chartType: ChartType;
  isOpen: boolean;
  onClose: () => void;
  onCopySvg: () => void;
  onOrientationChange?: () => void;
  isHorizontal?: boolean;
  children: React.ReactNode;
}

export function FullscreenModal({
  chartType,
  isOpen,
  onClose,
  onCopySvg,
  onOrientationChange,
  isHorizontal,
  children
}: FullscreenModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fullscreenModal"
      onClick={handleBackdropClick}
    >
      <div className="fullscreenContent">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold capitalize">{chartType} Chart - Full Screen</h2>
          <div className="flex items-center gap-2">
            {(chartType === "bar" || chartType === "stacked") && onOrientationChange && (
              <Button
                variant="secondary"
                aria-label={`Toggle ${chartType} chart orientation`}
                onClick={onOrientationChange}
              >
                {isHorizontal ? "Vertical" : "Horizontal"}
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={onCopySvg}
              aria-label={`Copy ${chartType} chart as SVG`}
            >
              Copy SVG
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 p-4">
          {children}
        </div>
      </div>
    </div>
  );
}