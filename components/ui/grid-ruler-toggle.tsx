'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Grid3X3, Ruler, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';

interface GridRulerToggleProps {
  showGrid: boolean;
  showRuler: boolean;
  gridSize: number;
  gridColor: string;
  rulerColor: string;
  onToggleGrid: () => void;
  onToggleRuler: () => void;
  onGridSizeChange: (size: number) => void;
  onGridColorChange: (color: string) => void;
  onRulerColorChange: (color: string) => void;
  className?: string;
  disabled?: boolean;
}

const GridRulerToggle: React.FC<GridRulerToggleProps> = ({
  showGrid,
  showRuler,
  gridSize,
  gridColor,
  rulerColor,
  onToggleGrid,
  onToggleRuler,
  onGridSizeChange,
  onGridColorChange,
  onRulerColorChange,
  className,
  disabled = false,
}) => {
  const gridSizes = [10, 20, 25, 50, 100];
  const colors = [
    { name: 'Light Gray', value: '#e5e7eb' },
    { name: 'Gray', value: '#9ca3af' },
    { name: 'Dark Gray', value: '#4b5563' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Red', value: '#ef4444' },
  ];

  return (
    <div className={cn(
      "flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-1",
      className
    )}>
      {/* Grid Toggle */}
      <Button
        variant={showGrid ? "default" : "ghost"}
        size="sm"
        onClick={onToggleGrid}
        disabled={disabled}
        className={cn(
          "h-8 w-8 p-0",
          showGrid 
            ? "bg-blue-500 hover:bg-blue-600 text-white" 
            : "hover:bg-gray-100 dark:hover:bg-gray-700"
        )}
        title="Toggle Grid (Ctrl + G)"
      >
        <Grid3X3 className="h-4 w-4" />
      </Button>

      {/* Grid Settings Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="h-8 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Grid Settings"
          >
            <div className="w-1 h-1 bg-gray-400 rounded-full" />
            <div className="w-1 h-1 bg-gray-400 rounded-full" />
            <div className="w-1 h-1 bg-gray-400 rounded-full" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Grid Settings</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuCheckboxItem
            checked={showGrid}
            onCheckedChange={onToggleGrid}
          >
            Show Grid
          </DropdownMenuCheckboxItem>
          
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs">Grid Size</DropdownMenuLabel>
          {gridSizes.map((size) => (
            <DropdownMenuCheckboxItem
              key={size}
              checked={gridSize === size}
              onCheckedChange={() => onGridSizeChange(size)}
            >
              {size}px
            </DropdownMenuCheckboxItem>
          ))}
          
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs">Grid Color</DropdownMenuLabel>
          {colors.map((color) => (
            <DropdownMenuItem
              key={color.value}
              onClick={() => onGridColorChange(color.value)}
              className="flex items-center gap-2"
            >
              <div 
                className="w-4 h-4 rounded border border-gray-300"
                style={{ backgroundColor: color.value }}
              />
              <span className={cn(
                "text-sm",
                gridColor === color.value && "font-medium"
              )}>
                {color.name}
              </span>
              {gridColor === color.value && (
                <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Separator */}
      <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />

      {/* Ruler Toggle */}
      <Button
        variant={showRuler ? "default" : "ghost"}
        size="sm"
        onClick={onToggleRuler}
        disabled={disabled}
        className={cn(
          "h-8 w-8 p-0",
          showRuler 
            ? "bg-blue-500 hover:bg-blue-600 text-white" 
            : "hover:bg-gray-100 dark:hover:bg-gray-700"
        )}
        title="Toggle Ruler (Ctrl + R)"
      >
        <Ruler className="h-4 w-4" />
      </Button>

      {/* Ruler Settings Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="h-8 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Ruler Settings"
          >
            <div className="w-1 h-1 bg-gray-400 rounded-full" />
            <div className="w-1 h-1 bg-gray-400 rounded-full" />
            <div className="w-1 h-1 bg-gray-400 rounded-full" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Ruler Settings</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuCheckboxItem
            checked={showRuler}
            onCheckedChange={onToggleRuler}
          >
            Show Ruler
          </DropdownMenuCheckboxItem>
          
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs">Ruler Color</DropdownMenuLabel>
          {colors.map((color) => (
            <DropdownMenuItem
              key={color.value}
              onClick={() => onRulerColorChange(color.value)}
              className="flex items-center gap-2"
            >
              <div 
                className="w-4 h-4 rounded border border-gray-300"
                style={{ backgroundColor: color.value }}
              />
              <span className={cn(
                "text-sm",
                rulerColor === color.value && "font-medium"
              )}>
                {color.name}
              </span>
              {rulerColor === color.value && (
                <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export { GridRulerToggle };
export type { GridRulerToggleProps };