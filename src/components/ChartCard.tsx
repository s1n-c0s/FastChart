import React, { type ReactNode, useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, Code, Maximize, Pencil } from "lucide-react";

interface ChartCardProps {
  title?: string;
  showTitle?: boolean;
  onTitleChange?: (newTitle: string) => void;
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
  preventClickOnElements?: string[];
}

export function ChartCard({
  title,
  showTitle = true,
  onTitleChange,
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
  preventClickOnElements = [],
}: ChartCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [currentTitle, setCurrentTitle] = useState(title || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCurrentTitle(title || "");
  }, [title]);

  useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleFinishEditing = useCallback(() => {
    setIsEditingTitle(false);
    const trimmed = currentTitle.trim();
    if (trimmed && trimmed !== title) {
      onTitleChange?.(trimmed);
    } else {
      setCurrentTitle(title || "");
    }
  }, [currentTitle, title, onTitleChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleFinishEditing();
    } else if (e.key === "Escape") {
      setCurrentTitle(title || "");
      setIsEditingTitle(false);
    }
  }, [handleFinishEditing, title]);

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
    
    // Check custom elements that shouldn't trigger fullscreen
    if (preventClickOnElements.some(selector => target.closest(selector))) {
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
        <div className="flex items-center gap-2 max-w-full sm:max-w-[50%]">
          {onCopyHtml && (
            <Button
              size="sm"
              variant="outline"
              onClick={onCopyHtml}
              title="Copy chart as HTML"
              className="h-8 w-8 p-0 shrink-0"
            >
              <Code className="w-4 h-4" />
            </Button>
          )}
          {showTitle && (
            isEditingTitle ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <input
                  ref={inputRef}
                  type="text"
                  value={currentTitle}
                  onChange={(e) => setCurrentTitle(e.target.value)}
                  onBlur={handleFinishEditing}
                  onKeyDown={handleKeyDown}
                  className="text-lg font-semibold bg-muted/60 px-2 py-0.5 rounded border border-primary/50 outline-none w-full min-w-[120px]"
                  aria-label="Edit chart title"
                />
              </div>
            ) : (
              <div 
                className={`group/title flex items-center gap-1.5 min-w-0 ${onTitleChange ? "cursor-pointer" : ""}`}
                onClick={onTitleChange ? () => setIsEditingTitle(true) : undefined}
                title={onTitleChange ? "Click to edit title" : undefined}
              >
                <h3 className="text-lg font-semibold truncate">{currentTitle}</h3>
                {onTitleChange && (
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground/60 opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0" />
                )}
              </div>
            )
          )}
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
        className="w-full h-96 relative cursor-pointer overflow-hidden rounded-xl"
        onClick={handleChartClick}
      >
        {showTooltip && (
          <div data-hide-on-copy="true" className="absolute bottom-4 right-4 z-10 pointer-events-none">
            <div className="bg-black/70 p-2 rounded-md shadow-sm backdrop-blur-sm flex items-center justify-center">
              <Maximize className="w-4 h-4 text-white" />
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
