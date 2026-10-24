import React, { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Excalidraw, MainMenu, WelcomeScreen, getSceneVersion } from "@excalidraw/excalidraw";
// 0.18 no longer injects its styles via JS; this must be imported explicitly.
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { AppState, BinaryFiles, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Workflow } from "lucide-react";
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
import { isDiagramFrame } from "@/lib/diagram/block";
import { parseFlow } from "@/lib/diagram/parse/flow";
import DiagramCodePanel from "./diagram/DiagramCodePanel";
import { useDiagramEditor } from "./diagram/useDiagramEditor";

const canvasButton =
  "flex h-9 items-center gap-1.5 rounded-lg border border-g-line bg-g-panel px-3 text-sm text-g-text hover:bg-g-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-g-accent max-md:h-11";

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
  const container = useRef<HTMLDivElement>(null);
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const diagram = useDiagramEditor(api, { readOnly: !!readOnly });
  const activeCode = diagram.active?.data.code;
  const nodeNames = useMemo(() => (activeCode === undefined ? [] : parseFlow(activeCode).model.nodes.map((n) => n.id)), [activeCode]);
  // Viewers cannot change the scene, so the diagrams they can read are the ones it opened with.
  const viewerDiagrams = useMemo(
    () => (readOnly ? initialElements.filter((el) => isDiagramFrame(el) && !el.isDeleted) : []),
    [readOnly, initialElements]
  );

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

  const handleChange = (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
    diagram.onSceneChange(elements, appState);
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

  const closePanel = () => {
    diagram.close();
    container.current?.focus();
  };

  if (!fileData || !initialFiles) {
    return <CanvasLoading message="Loading canvas..." />;
  }

  return (
    <div ref={container} tabIndex={-1} className="h-full relative outline-none">
      <div className="h-full">
        <Excalidraw
          excalidrawAPI={setApi}
          theme={actualTheme}
          initialData={{ elements: initialElements, files: initialFiles }}
          onChange={handleChange}
          renderTopRightUI={
            readOnly
              ? undefined
              : () => (
                  <button type="button" className={canvasButton} onClick={() => void diagram.insert()}>
                    <Workflow className="h-4 w-4" aria-hidden />
                    Diagram
                  </button>
                )
          }
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
      {/* Excalidraw hides its top-right UI from viewers on phones, so this sits over the canvas. */}
      {viewerDiagrams.length > 0 && !diagram.active && (
        <button
          type="button"
          className={`${canvasButton} absolute right-3 top-3 z-10`}
          onClick={() => diagram.open(viewerDiagrams[0].id)}
        >
          <Workflow className="h-4 w-4" aria-hidden />
          Diagram code
        </button>
      )}
      {diagram.active && (
        <DiagramCodePanel
          key={diagram.active.frameId}
          code={diagram.active.data.code}
          errors={diagram.errors}
          nodeNames={nodeNames}
          readOnly={!!readOnly}
          onChange={diagram.setCode}
          onClose={closePanel}
          header={
            viewerDiagrams.length > 1 && (
              <select
                aria-label="Diagram"
                value={diagram.active.frameId}
                onChange={(e) => diagram.open(e.target.value)}
                className="h-8 max-w-[10rem] rounded-md border border-g-line bg-g-panel px-2 text-xs text-g-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-g-accent max-md:h-11"
              >
                {viewerDiagrams.map((d) => (
                  <option key={d.id} value={d.id}>
                    {(d as { name?: string | null }).name || "Diagram"}
                  </option>
                ))}
              </select>
            )
          }
        />
      )}
    </div>
  );
};

export default WSCanvas;
