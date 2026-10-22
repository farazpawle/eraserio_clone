import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Excalidraw, MainMenu, WelcomeScreen, exportToCanvas, exportToSvg } from "@excalidraw/excalidraw";
import { createClient } from "@/lib/supabase/client";
import { saveWhiteboard } from "@/lib/data/files";
import type { SharedFile } from "@/lib/data/shares";
import type { Json } from "@/types/database";
import { useTheme } from "@/app/_context/ThemeContext";
import { CanvasLoading } from "@/components/ui/canvas-loading";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import { toast } from "sonner";
import { generateExportFileName } from "@/lib/exportUtils";
import { Download, FileImage, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const WSCanvas = ({
  onSaveTrigger,
  fileId,
  fileData,
  triggerSave,
  readOnly,
  onSave,
}: {
  onSaveTrigger?: any;
  fileId: any;
  fileData?: SharedFile;
  triggerSave?: number;
  readOnly?: boolean;
  onSave?: (content: Json) => Promise<void>;
}) => {
  const { actualTheme } = useTheme();
  const db = useMemo(() => createClient(), []);
  const [savedCanvasdata, setsavedCanvasData] = useState<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [isExporting, setIsExporting] = useState(false);
  const saveWhiteBoard = useCallback(() => {
    if (!savedCanvasdata) return;
    
    setSaveStatus('loading');
    
    const content = savedCanvasdata as Json;
    (onSave ? onSave(content) : saveWhiteboard(db, fileId, content))
    .then(() => {
      setSaveStatus('success');
      toast.success('Canvas saved successfully');
      
      // Reset status after 2 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    })
    .catch(error => {
      console.error('Error saving canvas:', error);
      setSaveStatus('error');
      toast.error(error?.message ?? 'Failed to save canvas');
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    });
  }, [savedCanvasdata, db, fileId, onSave]);

  // Export canvas to PNG
  const exportToPNG = async () => {
    if (!savedCanvasdata) {
      toast.error('Canvas not ready for export');
      return;
    }

    try {
      setIsExporting(true);
      toast.info('Preparing PNG export...');

      const canvas = await exportToCanvas({
        elements: savedCanvasdata,
        appState: {},
        files: {},
        getDimensions: () => ({ width: 1920, height: 1080 })
      });

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const fileName = generateExportFileName(fileData?.name ?? '', 'png');
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${fileName}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          toast.success('Canvas exported as PNG successfully!');
        } else {
          toast.error('Failed to generate PNG');
        }
      }, 'image/png', 0.9);
    } catch (error) {
      console.error('PNG export error:', error);
      toast.error('Failed to export PNG');
    } finally {
      setIsExporting(false);
    }
  };

  // Export canvas to SVG
  const exportToSVG = async () => {
    if (!savedCanvasdata) {
      toast.error('Canvas not ready for export');
      return;
    }

    try {
      setIsExporting(true);
      toast.info('Preparing SVG export...');

      const svg = await exportToSvg({
        elements: savedCanvasdata,
        appState: {},
        files: {},
      });

      // Convert SVG to blob and download
      const svgBlob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
      const fileName = generateExportFileName(fileData?.name ?? '', 'svg');
      const url = URL.createObjectURL(svgBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Canvas exported as SVG successfully!');
    } catch (error) {
      console.error('SVG export error:', error);
      toast.error('Failed to export SVG');
    } finally {
      setIsExporting(false);
    }
  };
  useEffect(() => {
    if (onSaveTrigger) {
      saveWhiteBoard();
    }
  }, [onSaveTrigger, saveWhiteBoard]);

  useEffect(() => {
    if (triggerSave && triggerSave > 0 && !readOnly) {
      saveWhiteBoard();
    }
  }, [triggerSave, saveWhiteBoard, readOnly]);
  
  useEffect(() => {
    if (fileData) {
      // Simulate loading time for canvas initialization
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [fileData]);
  // Show loading state while canvas is initializing
  if (isLoading || !fileData) {
    return <CanvasLoading message="Loading canvas..." />;
  }

  return (
    <div className="h-full relative">
      {/* Save status indicator */}
      {saveStatus !== 'idle' && (
        <div className="absolute top-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <ProgressIndicator 
            status={saveStatus} 
            message={
              saveStatus === 'loading' ? 'Saving canvas...' :
              saveStatus === 'success' ? 'Canvas saved!' :
              'Save failed'
            }
            className="px-3 py-2"
          />
        </div>
      )}

      {/* Export Toolbar */}
      <div className="absolute top-4 left-4 z-50">
        {/* Export dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isExporting || !savedCanvasdata}
              className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Export Canvas</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={exportToPNG}
              disabled={isExporting}
              className="cursor-pointer"
            >
              <Image className="mr-2 h-4 w-4" />
              Export as PNG
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={exportToSVG}
              disabled={isExporting}
              className="cursor-pointer"
            >
              <FileImage className="mr-2 h-4 w-4" />
              Export as SVG
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      
      <div className="h-full">
        <Excalidraw
          theme={actualTheme}
          initialData={{
            elements: (fileData?.whiteboard ?? []) as any
          }}
          onChange={(excalidrawElements, appState, files) => {
            if (!readOnly) {
              setsavedCanvasData(excalidrawElements);
            }
          }}
          viewModeEnabled={readOnly || false}
          UIOptions={{
            canvasActions: {
              saveToActiveFile: false,
              loadScene: false,
              export: readOnly ? false : undefined,
              toggleTheme: false,
            },
          }}
        >
          <WelcomeScreen>
            <WelcomeScreen.Hints.ToolbarHint />
            <WelcomeScreen.Center>
              <WelcomeScreen.Center.Logo />
              <WelcomeScreen.Center.Heading>
                Welcome to Your Canvas!
              </WelcomeScreen.Center.Heading>
              <WelcomeScreen.Center.Menu>
                <WelcomeScreen.Center.MenuItemHelp />
              </WelcomeScreen.Center.Menu>
            </WelcomeScreen.Center>
          </WelcomeScreen>
          <MainMenu>
            <MainMenu.DefaultItems.ClearCanvas />
            <MainMenu.DefaultItems.ChangeCanvasBackground />
          </MainMenu>
        </Excalidraw>
      </div>
    </div>
  );
};

export default WSCanvas;
