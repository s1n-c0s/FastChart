import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import styles from "./DataVisualizer.module.css";

interface FullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  chartType?: string;
  onCopySvg?: () => void;
  onCopyPng?: () => void;
  onToggleOrientation?: () => void;
  isHorizontal?: boolean;
  showOrientation?: boolean;
  customActions?: ReactNode;
  children?: ReactNode;
}

export function FullscreenModal({
  isOpen,
  onClose,
  chartType = "Chart",
  onCopySvg,
  onCopyPng,
  onToggleOrientation,
  isHorizontal = false,
  showOrientation = false,
  customActions,
  children,
}: FullscreenModalProps) {
  // Lazy render chart content only when modal is open
  const [shouldRenderChart, setShouldRenderChart] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Small delay to allow modal animation to start first
      const timer = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setShouldRenderChart(true);
        });
      });
      return () => cancelAnimationFrame(timer);
    } else {
      setShouldRenderChart(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className={styles.fullscreenModal} 
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={styles.fullscreenContent}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold capitalize">{chartType} Chart - Full Screen</h2>
          <div className="flex items-center gap-2">
            {customActions}
            {showOrientation && onToggleOrientation && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onToggleOrientation}
              >
                {isHorizontal ? "Vertical" : "Horizontal"}
              </Button>
            )}
            {onCopySvg && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onCopySvg}
              >
                Copy SVG
              </Button>
            )}
            {onCopyPng && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onCopyPng}
              >
                Copy PNG
              </Button>
            )}

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
        <div className={styles.chartContent}>
          {shouldRenderChart ? (
            children
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-gray-900 rounded-full mx-auto mb-2" />
                <p className="text-sm text-gray-500">Loading...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
