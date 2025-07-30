import React, { useEffect, useState, useRef } from "react";
import { Excalidraw, MainMenu, WelcomeScreen, exportToCanvas, exportToSvg } from "@excalidraw/excalidraw";
import { FILE } from "@/app/dashboard/_components/FileList";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { putWhiteboard } from "@/convex/files";
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
}: {
  onSaveTrigger: any;
  fileId: any;
  fileData: FILE;
}) => {
  const { actualTheme } = useTheme();
  const updateWhiteBoard = useMutation(api.files.putWhiteboard);
  const [savedCanvasdata, setsavedCanvasData] = useState<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const saveWhiteBoard = () => {
    if (!savedCanvasdata) return;
    
    setSaveStatus('loading');
    
    updateWhiteBoard({
      _id: fileId,
      whiteboard: JSON.stringify(savedCanvasdata)
    })
    .then(resp => {
      console.log(resp);
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
      toast.error('Failed to save canvas');
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    });
  };

  // Export canvas to PNG
  const exportToPNG = async () => {
    if (!excalidrawAPI || !savedCanvasdata) {
      toast.error('Canvas not ready for export');
      return;
    }

    try {
      setIsExporting(true);
      toast.info('Preparing PNG export...');

      const canvas = await exportToCanvas({
        elements: savedCanvasdata,
        appState: excalidrawAPI.getAppState(),
        files: excalidrawAPI.getFiles(),
        getDimensions: () => ({ width: 1920, height: 1080 })
      });

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const fileName = generateExportFileName(fileData.fileName, 'png');
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
    if (!excalidrawAPI || !savedCanvasdata) {
      toast.error('Canvas not ready for export');
      return;
    }

    try {
      setIsExporting(true);
      toast.info('Preparing SVG export...');

      const svg = await exportToSvg({
        elements: savedCanvasdata,
        appState: excalidrawAPI.getAppState(),
        files: excalidrawAPI.getFiles(),
      });

      // Convert SVG to blob and download
      const svgBlob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
      const fileName = generateExportFileName(fileData.fileName, 'svg');
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
    onSaveTrigger && saveWhiteBoard();
  }, [onSaveTrigger]);
  
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

      {/* Export dropdown */}
      <div className="absolute top-4 left-4 z-50">
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
            elements: fileData?.whiteboard ? JSON.parse(fileData.whiteboard) : []
          }}
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          onChange={(excalidrawElements, appState, files) =>
            setsavedCanvasData(excalidrawElements)
          }
          UIOptions={{
            canvasActions: {
              saveToActiveFile: false,
              loadScene: false,
              export: false,
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
