"use client";
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import WSHeader from "../_components/WSHeader";
import WorkspaceLayout from "../_components/WorkspaceLayout";
import { DocEyebrow, WorkspaceError, WorkspaceSkeleton } from "../_components/WorkspaceStates";
import { createClient } from "@/lib/supabase/client";
import { getFile, renameFile, type FileRow } from "@/lib/data/files";
import { listMyTeams } from "@/lib/data/teams";
import type { Scene } from "@/lib/canvas/persist";
import { useUser } from "@/hooks/useUser";
import { useEditorView } from "@/app/_hooks/useEditorView";
import { useSaveStatus, type SaveState } from "@/app/_hooks/useSaveStatus";
import { useKeyboardShortcutsContext } from "@/app/_context/KeyboardShortcutsContext";
import { SHORTCUT_CATEGORIES } from "@/app/_hooks/useKeyboardShortcuts";
import { toast } from "sonner";
import dynamic from "next/dynamic";

// Editor.js and Excalidraw touch the DOM on import, so they can't render on the server.
const Editor = dynamic(() => import("../_components/Editor"), { ssr: false });
const WSCanvas = dynamic(() => import("../_components/WSCanvas"), { ssr: false });

const Workspace = ({ params }: any) => {
  const db = useMemo(() => createClient(), []);
  // Each press of Save (button or shortcut) bumps this; the panes save when it changes.
  const [saveSignal, setSaveSignal] = useState(0);
  const [fileData, setFileData] = useState<FileRow>();
  const [teamName, setTeamName] = useState<string>();
  const [isLoadingFile, setIsLoadingFile] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const { user } = useUser();
  const { view, shown, setView, narrow } = useEditorView(params.fileId);
  const { status, report } = useSaveStatus();
  const {
    registerShortcuts,
    unregisterShortcuts,
    shortcutConfigs,
  } = useKeyboardShortcutsContext();

  useEffect(() => {
    const getFileData = async () => {
      if (params.fileId) {
        setIsLoadingFile(true);
        setLoadingError(null);
        try {
          const result = await getFile(db, params.fileId);

          if (!result) {
            setLoadingError('File not found or you don\'t have permission to access it.');
            return;
          }

          setFileData(result);
        } catch (error) {
          console.error('Error fetching file data:', error);
          setLoadingError('Failed to load file. Please try again.');
          toast.error('Failed to load file');
        } finally {
          setIsLoadingFile(false);
        }
      }
    };

    getFileData();
  }, [db, params.fileId]); // Proper dependencies without causing infinite loop

  // The breadcrumb shows the team name; a failed lookup just leaves it out.
  const teamId = fileData?.team_id;
  useEffect(() => {
    if (!teamId) return;
    let cancelled = false;
    Promise.resolve()
      .then(() => listMyTeams(db))
      .then((teams) => {
        if (!cancelled) setTeamName(teams?.find((team) => team.id === teamId)?.name);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [db, teamId]);

  const handleSave = useCallback(() => {
    setSaveSignal((prev) => prev + 1);
  }, []);

  const handleRename = useCallback(
    async (name: string) => {
      await renameFile(db, params.fileId, name);
      setFileData((prev) => (prev ? { ...prev, name } : prev));
    },
    [db, params.fileId]
  );

  const reportDoc = useCallback((state: SaveState) => report("doc", state), [report]);
  const reportCanvas = useCallback((state: SaveState) => report("canvas", state), [report]);
  const getScene = useCallback(() => sceneRef.current, []);

  // Register workspace-specific shortcuts. Save follows the user's configured key;
  // the view keys are fixed (saved settings replace the customisable list entirely).
  useEffect(() => {
    const saveConfig = shortcutConfigs.find(config => config.id === 'save');
    const viewShortcuts = [
      { key: "1", view: "doc", description: "Show the document only" },
      { key: "2", view: "both", description: "Show document and canvas" },
      { key: "3", view: "canvas", description: "Show the canvas only" },
    ] as const;

    registerShortcuts([
      ...(saveConfig
        ? [
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
          ]
        : []),
      ...viewShortcuts.map(({ key, view: target, description }) => ({
        key,
        altKey: true,
        action: () => setView(target),
        description,
        category: SHORTCUT_CATEGORIES.VIEW,
        allowInInput: true,
      })),
    ]);

    return () => {
      unregisterShortcuts();
    };
  }, [registerShortcuts, unregisterShortcuts, handleSave, setView, shortcutConfigs]);

  if (isLoadingFile) return <WorkspaceSkeleton />;
  if (loadingError) return <WorkspaceError message={loadingError} />;

  return (
    <WorkspaceLayout
      shown={shown}
      header={
        <WSHeader
          fileName={fileData?.name ?? ""}
          teamName={teamName}
          fileData={fileData}
          view={view}
          narrow={narrow}
          onViewChange={setView}
          status={status}
          onSave={handleSave}
          onRename={handleRename}
          getScene={getScene}
          user={user}
        />
      }
      doc={
        <div className="ws-doc-inner">
          {fileData && <DocEyebrow updatedAt={fileData.updated_at} />}
          <Editor fileData={fileData} fileId={params.fileId} saveSignal={saveSignal} onStatus={reportDoc} />
        </div>
      }
      canvas={
        <WSCanvas
          fileData={fileData}
          fileId={params.fileId}
          saveSignal={saveSignal}
          onStatus={reportCanvas}
          sceneRef={sceneRef}
        />
      }
    />
  );
};

export default Workspace;
