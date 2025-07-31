'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw, Maximize } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitToScreen: () => void;
  className?: string;
  disabled?: boolean;
  minZoom?: number;
  maxZoom?: number;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitToScreen,
  className,
  disabled = false,
  minZoom = 0.1,
  maxZoom = 5,
}) => {
  const zoomPercentage = Math.round(zoom * 100);
  const canZoomIn = zoom < maxZoom;
  const canZoomOut = zoom > minZoom;

  return (
    <div className={cn(
      "flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-1",
      className
    )}>
      {/* Zoom Out Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onZoomOut}
        disabled={disabled || !canZoomOut}
        className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Zoom Out (Ctrl + -)"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>

      {/* Zoom Percentage Display */}
      <div className="px-2 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[60px] text-center">
        {zoomPercentage}%
      </div>

      {/* Zoom In Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onZoomIn}
        disabled={disabled || !canZoomIn}
        className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Zoom In (Ctrl + +)"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>

      {/* Separator */}
      <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />

      {/* Reset Zoom Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onResetZoom}
        disabled={disabled}
        className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Reset Zoom (Ctrl + 0)"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>

      {/* Fit to Screen Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onFitToScreen}
        disabled={disabled}
        className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Fit to Screen (Ctrl + Shift + 0)"
      >
        <Maximize className="h-4 w-4" />
      </Button>
    </div>
  );
};

export { ZoomControls };
export type { ZoomControlsProps };