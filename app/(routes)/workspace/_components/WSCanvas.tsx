import React, { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Excalidraw, MainMenu, WelcomeScreen, getSceneVersion } from "@excalidraw/excalidraw";
// 0.18 no longer injects its styles via JS; this must be imported explicitly.
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { BinaryFiles } from "@excalidraw/excalidraw/types";
import { createClient } from "@/lib/supabase/client";
import { saveWhiteboard } from "@/lib/data/files";
import { supabaseCanvasFileStore, type CanvasFileStore } from "@/lib/data/canvasFiles";
import { loadSceneFiles, persistCanvas, type Scene } from "@/lib/canvas/persist";
import type { SharedFile } from "@/lib/data/shares";
import type { Json } from "@/types/database";
import { useTheme } from "@/app/_context/ThemeContext";
import { useSaveSignal, type SaveState } from "@/app/_hooks/useSaveStatus";
import { CanvasLoading } from "@/components/ui/canvas-loading";
import { toast } from "sonner";

const WSCanvas = ({
  saveSignal,
  onStatus,
  fileId,
  fileData,
  readOnly,
  onSave,
  fileStore,
  sceneRef,
}: {
  saveSignal?: number;
  onStatus?: (state: SaveState) => void;
  fileId: any;
  fileData?: SharedFile;
  readOnly?: boolean;
  onSave?: (content: Json) => Promise<void>;
  // Where pasted images are stored. Defaults to the signed-in user's Supabase bucket.
  fileStore?: CanvasFileStore;
  // Kept current with the latest elements and images, so the header can export them.
  sceneRef?: MutableRefObject<Scene | null>;
}) => {
  const { actualTheme } = useTheme();
  const db = useMemo(() => createClient(), []);
  const store = useMemo(() => fileStore ?? supabaseCanvasFileStore(db, fileId), [fileStore, db, fileId]);
  const uploaded = useRef(new Set<string>());
  const scene = useRef<Scene | null>(null);
  const savedVersion = useRef<number | null>(null);
  const saving = useRef(false);
  const [initialFiles, setInitialFiles] = useState<BinaryFiles | null>(null);
  const initialElements = useMemo(() => (fileData?.whiteboard ?? []) as unknown as ExcalidrawElement[], [fileData?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Excalidraw only reads initialData when it mounts, so the images must be here first.
  useEffect(() => {
    if (!fileData) return;
    let cancelled = false;
    loadSceneFiles({ store, uploaded: uploaded.current }, initialElements)
      .catch((error) => {
        console.error("Error loading canvas images:", error);
        toast.error("Some images could not be loaded");
        return {} as BinaryFiles;
      })
      .then((files) => {
        if (!cancelled) setInitialFiles(files);
      });
    return () => {
      cancelled = true;
    };
  }, [fileData?.id, store, initialElements]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (elements: readonly ExcalidrawElement[], _appState: unknown, files: BinaryFiles) => {
    const next = { elements, files };
    scene.current = next;
    if (sceneRef) sceneRef.current = next;
    if (readOnly) return;

    // Excalidraw's first onChange after load is the starting point, not an edit.
    const version = getSceneVersion(elements);
    if (savedVersion.current === null) {
      savedVersion.current = version;
    } else if (!saving.current && version !== savedVersion.current) {
      onStatus?.("unsaved");
    }
  };

  const save = useCallback(async () => {
    const current = scene.current;
    if (readOnly || !current) return;

    const version = getSceneVersion(current.elements);
    saving.current = true;
    onStatus?.("saving");
    try {
      await persistCanvas(
        { store, uploaded: uploaded.current, saveElements: onSave ?? ((content) => saveWhiteboard(db, fileId, content)) },
        current
      );
      savedVersion.current = version;
      const latest = scene.current ? getSceneVersion(scene.current.elements) : version;
      onStatus?.(latest === version ? "saved" : "unsaved");
    } catch (error) {
      console.error("Error saving canvas:", error);
      onStatus?.("error");
      toast.error(error instanceof Error ? error.message : "Failed to save canvas");
    } finally {
      saving.current = false;
    }
  }, [readOnly, store, onSave, db, fileId, onStatus]);

  useSaveSignal(saveSignal, save);

  if (!fileData || !initialFiles) {
    return <CanvasLoading message="Loading canvas..." />;
  }

  return (
    <div className="h-full relative">
      <div className="h-full">
        <Excalidraw
          theme={actualTheme}
          initialData={{ elements: initialElements, files: initialFiles }}
          onChange={handleChange}
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
