'use client';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MinimapProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  viewportBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  canvasBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  zoom: number;
  onViewportChange: (x: number, y: number) => void;
  className?: string;
  isVisible?: boolean;
  onToggleVisibility?: () => void;
  onClose?: () => void;
}

const Minimap: React.FC<MinimapProps> = ({
  canvasRef,
  viewportBounds,
  canvasBounds,
  zoom,
  onViewportChange,
  className,
  isVisible = true,
  onToggleVisibility,
  onClose,
}) => {
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const minimapSize = { width: 200, height: 150 };
  const scale = Math.min(
    minimapSize.width / canvasBounds.width,
    minimapSize.height / canvasBounds.height
  );

  // Update minimap canvas
  const updateMinimap = useCallback(() => {
    if (!minimapRef.current || !isVisible || isCollapsed) return;

    const minimapCtx = minimapRef.current.getContext('2d');
    
    if (!minimapCtx) return;

    // Clear minimap
    minimapCtx.clearRect(0, 0, minimapSize.width, minimapSize.height);
    
    // Draw background
    minimapCtx.fillStyle = '#f8f9fa';
    minimapCtx.fillRect(0, 0, minimapSize.width, minimapSize.height);
    
    // Draw viewport indicator
    const viewportX = (viewportBounds.x - canvasBounds.x) * scale;
    const viewportY = (viewportBounds.y - canvasBounds.y) * scale;
    const viewportWidth = viewportBounds.width * scale;
    const viewportHeight = viewportBounds.height * scale;
    
    minimapCtx.strokeStyle = '#3b82f6';
    minimapCtx.lineWidth = 2;
    minimapCtx.strokeRect(viewportX, viewportY, viewportWidth, viewportHeight);
    
    // Fill viewport with semi-transparent overlay
    minimapCtx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    minimapCtx.fillRect(viewportX, viewportY, viewportWidth, viewportHeight);
  }, [viewportBounds, canvasBounds, scale, isVisible, isCollapsed]);

  // Handle minimap click/drag
  const handleMinimapInteraction = useCallback((event: React.MouseEvent) => {
    if (!minimapRef.current || isCollapsed) return;
    
    const rect = minimapRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convert minimap coordinates to canvas coordinates
    const canvasX = (x / scale) + canvasBounds.x;
    const canvasY = (y / scale) + canvasBounds.y;
    
    // Center viewport on clicked position
    const newViewportX = canvasX - (viewportBounds.width / 2);
    const newViewportY = canvasY - (viewportBounds.height / 2);
    
    onViewportChange(newViewportX, newViewportY);
  }, [scale, canvasBounds, viewportBounds, onViewportChange, isCollapsed]);

  const handleMouseDown = (event: React.MouseEvent) => {
    setIsDragging(true);
    handleMinimapInteraction(event);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (isDragging) {
      handleMinimapInteraction(event);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Update minimap when dependencies change
  useEffect(() => {
    if (isVisible && !isCollapsed) {
      updateMinimap();
    }
  }, [updateMinimap, isVisible, isCollapsed]);

  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Minimap
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            <Minimize2 className="h-3 w-3" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Close Minimap"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Minimap Canvas */}
      {!isCollapsed && (
        <div className="p-2">
          <canvas
            ref={minimapRef}
            width={minimapSize.width}
            height={minimapSize.height}
            className="border border-gray-200 dark:border-gray-600 rounded cursor-pointer"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              cursor: isDragging ? 'grabbing' : 'grab'
            }}
          />
          
          {/* Zoom indicator */}
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-center">
            Zoom: {Math.round(zoom * 100)}%
          </div>
        </div>
      )}
    </div>
  );
};

export { Minimap };
export type { MinimapProps };