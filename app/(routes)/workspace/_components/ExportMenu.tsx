"use client";
import React, { useState } from "react";
import { Download, FileImage, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useExportContext } from "@/app/_context/ExportContext";
import { exportCanvas, type CanvasExportFormat, type Scene } from "@/lib/canvas/export";
import type { FileRow } from "@/lib/data/files";

const hasShapes = (scene: Scene | null) => !!scene && scene.elements.some((el) => !el.isDeleted);

// Export choices for the whole file: the document as PDF, the canvas as PNG or SVG.
// Menu content mounts each time it opens, so the canvas check here is always current.
export const ExportItems = ({ file, getScene }: { file: FileRow; getScene: () => Scene | null }) => {
  const { exportSingleFile } = useExportContext();
  const [canvasReady] = useState(() => hasShapes(getScene()));

  const exportCanvasAs = async (format: CanvasExportFormat) => {
    const scene = getScene();
    if (!scene) return;
    try {
      await exportCanvas(format, scene, file.name);
    } catch (error) {
      console.error(`${format.toUpperCase()} export error:`, error);
      toast.error(`Failed to export ${format.toUpperCase()}`);
    }
  };

  const item = "cursor-pointer gap-2 max-md:min-h-11";

  return (
    <>
      <DropdownMenuItem className={item} onClick={() => exportSingleFile(file, "pdf")}>
        <FileText className="h-4 w-4" />
        Document as PDF
      </DropdownMenuItem>
      <DropdownMenuItem className={item} disabled={!canvasReady} onClick={() => exportCanvasAs("png")}>
        <ImageIcon className="h-4 w-4" />
        Canvas as PNG
      </DropdownMenuItem>
      <DropdownMenuItem className={item} disabled={!canvasReady} onClick={() => exportCanvasAs("svg")}>
        <FileImage className="h-4 w-4" />
        Canvas as SVG
      </DropdownMenuItem>
    </>
  );
};

const ExportMenu = ({ file, getScene }: { file: FileRow; getScene: () => Scene | null }) => {
  const { exportState } = useExportContext();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Export"
          disabled={exportState.isExporting}
          className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-g-muted hover:bg-g-hover hover:text-g-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-g-accent disabled:opacity-50 max-md:min-h-11 max-md:min-w-11 max-md:justify-center"
        >
          <Download className="h-[18px] w-[18px]" />
          <span className="hidden md:inline">Export</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 border-g-line bg-g-panel text-g-text">
        <ExportItems file={file} getScene={getScene} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportMenu;
