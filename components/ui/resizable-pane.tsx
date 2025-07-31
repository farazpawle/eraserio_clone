'use client';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ResizablePaneProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  initialLeftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
  snapPoints?: number[];
  snapThreshold?: number;
  showSnapIndicators?: boolean;
  onResize?: (leftWidth: number) => void;
  className?: string;
  resizerClassName?: string;
  disabled?: boolean;
}

const ResizablePane: React.FC<ResizablePaneProps> = ({
  leftPanel,
  rightPanel,
  initialLeftWidth = 50,
  minLeftWidth = 20,
  maxLeftWidth = 80,
  snapPoints = [25, 33, 50, 67, 75],
  snapThreshold = 3,
  showSnapIndicators = true,
  onResize,
  className,
  resizerClassName,
  disabled = false,
}) => {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapped, setIsSnapped] = useState(false);
  const [nearestSnapPoint, setNearestSnapPoint] = useState<number | null>(null);
  const [showSnapPreview, setShowSnapPreview] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);
  const snapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle mouse down on resizer
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    setShowSnapPreview(true);
  }, [disabled]);

  // Handle mouse move during drag
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current || disabled) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.left;
      
      let newLeftWidth = Math.min(
        Math.max((mouseX / containerWidth) * 100, minLeftWidth),
        maxLeftWidth
      );

      // Find nearest snap point
      let nearestSnap: number | null = null;
      let minDistance = Infinity;
      
      for (const snapPoint of snapPoints) {
        const distance = Math.abs(newLeftWidth - snapPoint);
        if (distance < minDistance && distance <= snapThreshold) {
          minDistance = distance;
          nearestSnap = snapPoint;
        }
      }

      setNearestSnapPoint(nearestSnap);

      // Apply snap if within threshold
      let snapped = false;
      if (nearestSnap !== null) {
        newLeftWidth = nearestSnap;
        snapped = true;
      }

      // Trigger snap feedback
      if (snapped && !isSnapped) {
        setIsSnapped(true);
        // Add haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        
        // Clear previous timeout
        if (snapTimeoutRef.current) {
          clearTimeout(snapTimeoutRef.current);
        }
        
        // Reset snap state after animation
        snapTimeoutRef.current = setTimeout(() => {
          setIsSnapped(false);
        }, 200);
      }

      setLeftWidth(newLeftWidth);
      onResize?.(newLeftWidth);
    },
    [isDragging, minLeftWidth, maxLeftWidth, snapPoints, snapThreshold, isSnapped, onResize, disabled]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsSnapped(false);
    setNearestSnapPoint(null);
    setShowSnapPreview(false);
    
    if (snapTimeoutRef.current) {
      clearTimeout(snapTimeoutRef.current);
      snapTimeoutRef.current = null;
    }
  }, []);

  // Set up global mouse events
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (snapTimeoutRef.current) {
        clearTimeout(snapTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={cn("flex h-full relative", className)}
    >
      {/* Left Panel */}
      <div 
        className="h-full transition-all duration-150 ease-out"
        style={{ width: `${leftWidth}%` }}
      >
        {leftPanel}
      </div>

      {/* Resizer */}
      <div
        ref={resizerRef}
        className={cn(
          "relative flex-shrink-0 group transition-all duration-150",
          "w-1 bg-gray-300 dark:bg-gray-600",
          "hover:w-2 hover:bg-gray-400 dark:hover:bg-gray-500",
          isDragging && "w-2 bg-blue-500 dark:bg-blue-400",
          isSnapped && "bg-green-500 dark:bg-green-400",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-col-resize",
          resizerClassName
        )}
        onMouseDown={handleMouseDown}
      >
        {/* Resizer Handle */}
        <div className={cn(
          "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
          "w-1 h-8 bg-gray-400 dark:bg-gray-500 rounded-full opacity-0",
          "group-hover:opacity-100 transition-opacity duration-150",
          isDragging && "opacity-100 bg-blue-500 dark:bg-blue-400",
          isSnapped && "bg-green-500 dark:bg-green-400"
        )} />
        
        {/* Drag Indicator */}
        {isDragging && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="flex flex-col gap-1">
              <div className="w-0.5 h-1 bg-white rounded-full" />
              <div className="w-0.5 h-1 bg-white rounded-full" />
              <div className="w-0.5 h-1 bg-white rounded-full" />
            </div>
          </div>
        )}
      </div>

      {/* Right Panel */}
      <div 
        className="h-full border-l border-gray-200 dark:border-gray-700 transition-all duration-150 ease-out"
        style={{ width: `${100 - leftWidth}%` }}
      >
        {rightPanel}
      </div>

      {/* Snap Point Indicators */}
      {showSnapIndicators && (isDragging || showSnapPreview) && (
        <div className="absolute inset-0 pointer-events-none z-20">
          {snapPoints.map((snapPoint) => {
            const isNearSnap = nearestSnapPoint === snapPoint;
            const isCurrentPosition = Math.abs(leftWidth - snapPoint) < 0.1;
            
            return (
              <div
                key={snapPoint}
                className={cn(
                  "absolute top-0 bottom-0 w-0.5 transition-all duration-150",
                  isNearSnap 
                    ? "bg-green-500 dark:bg-green-400 opacity-100 scale-y-110" 
                    : isCurrentPosition
                    ? "bg-blue-500 dark:bg-blue-400 opacity-80"
                    : "bg-gray-400 dark:bg-gray-500 opacity-40"
                )}
                style={{ left: `${snapPoint}%` }}
              >
                {/* Snap Point Label */}
                <div className={cn(
                  "absolute top-2 left-1/2 transform -translate-x-1/2",
                  "px-1 py-0.5 text-xs font-medium rounded",
                  "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600",
                  "text-gray-700 dark:text-gray-300 shadow-sm",
                  "transition-all duration-150",
                  isNearSnap ? "scale-110 font-bold" : "scale-100"
                )}>
                  {snapPoint}%
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resize Feedback Overlay */}
      {isDragging && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30">
          <div className={cn(
            "px-3 py-1 rounded-lg shadow-lg border",
            "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600",
            "text-sm font-medium text-gray-700 dark:text-gray-300",
            "transition-all duration-150",
            isSnapped && "bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300"
          )}>
            {Math.round(leftWidth)}% | {Math.round(100 - leftWidth)}%
            {nearestSnapPoint && (
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                (snap to {nearestSnapPoint}%)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export { ResizablePane };
export type { ResizablePaneProps };