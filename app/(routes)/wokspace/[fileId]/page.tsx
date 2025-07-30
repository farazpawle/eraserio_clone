"use client";
import React, { useEffect, useState, useCallback } from "react";
import WSHeader from "../_components/WSHeader";
import Editor from "../_components/Editor";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FILE } from "@/app/dashboard/_components/FileList";
import WSCanvas from "../_components/WSCanvas";
import { useKeyboardShortcutsContext } from "@/app/_context/KeyboardShortcutsContext";
import { SHORTCUT_CATEGORIES } from "@/app/_hooks/useKeyboardShortcuts";
import { toast } from "sonner";
// import ResizablePane from "@/components/ui/resizable-pane";
const Workspace = ({ params }: any) => {
  const convex = useConvex();
  const [triggerSave, settriggerSave] = useState(false);
  const [fileData, setFileData] = useState<FILE | any>();
  const [leftWidth, setLeftWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const {
    registerShortcuts,
    unregisterShortcuts,
    shortcutConfigs,
  } = useKeyboardShortcutsContext();
  
  const getFileData = useCallback(async () => {
    const result = await convex.query(api.files.getFileData, {
      _id: params.fileId,
    });
    setFileData(result);
    console.log(result);
  }, [convex, params.fileId]);

  useEffect(() => {
    params.fileId && getFileData();
  }, [params.fileId, getFileData]);

  // Handle save action
  const handleSave = useCallback(() => {
    settriggerSave(prev => !prev);
  }, []);

  // Register workspace-specific shortcuts
  useEffect(() => {
    const saveConfig = shortcutConfigs.find(config => config.id === 'save');
    
    if (saveConfig) {
      const workspaceShortcuts = [
        {
          key: saveConfig.key,
          ctrlKey: saveConfig.ctrlKey,
          shiftKey: saveConfig.shiftKey,
          altKey: saveConfig.altKey,
          metaKey: saveConfig.metaKey,
          action: handleSave,
          description: saveConfig.description,
          category: saveConfig.category,
        },
      ];

      registerShortcuts(workspaceShortcuts);
    }

    return () => {
      unregisterShortcuts();
    };
  }, [registerShortcuts, unregisterShortcuts, handleSave, shortcutConfigs]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.left;
      
      const newLeftWidth = Math.min(
        Math.max((mouseX / containerWidth) * 100, 25),
        75
      );

      setLeftWidth(newLeftWidth);
    },
    [isDragging]
  );

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);
  return (
    <div>
      <WSHeader onSave={handleSave} fileName={fileData?.fileName} fileData={fileData} />
      {/* workspace layout */}
      <div ref={containerRef} className="flex h-[calc(100vh-73px)]">
        {/* document */}
        <div className="h-full" style={{ width: `${leftWidth}%` }}>
          <Editor
            fileData={fileData}
            fileId={params.fileId}
            onSaveTrigger={triggerSave}
          />
        </div>
        {/* resizer */}
        <div
          className="w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize flex-shrink-0"
          onMouseDown={handleMouseDown}
        />
        {/* whiteboard canvas */}
        <div className="h-full border-l" style={{ width: `${100 - leftWidth}%` }}>
          <WSCanvas 
            onSaveTrigger={triggerSave}
            fileData={fileData}
            fileId={params.fileId}
          />
        </div>
      </div>
    </div>
  );
};

export default Workspace;
