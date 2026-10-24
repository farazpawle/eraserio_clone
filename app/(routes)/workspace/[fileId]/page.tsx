"use client";
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import WSHeader from "../_components/WSHeader";
import WorkspaceLayout from "../_components/WorkspaceLayout";
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
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Skeleton } from "@/components/ui/skeleton";
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

  // Show loading state while fetching file data
  if (isLoadingFile) {
    return (
      <div className="h-screen bg-white dark:bg-gray-900">
        {/* Header skeleton */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex justify-between items-center">
          <div className="flex gap-2 items-center">
            <Skeleton className="h-10 w-10 rounded" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="flex gap-4 items-center">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>

        {/* Main loading content */}
        <div className="h-[calc(100vh-73px)] flex items-center justify-center bg-gray-50 dark:bg-gray-800">
          <div className="text-center space-y-4">
            <div data-testid="loading-spinner">
              <LoadingSpinner size="lg" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Loading your workspace...
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Please wait while we fetch your file data
              </p>
            </div>

            {/* Skeleton representation of workspace */}
            <div className="mt-8 flex gap-4 max-w-4xl">
              <div className="flex-1 space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-32 w-full" />
              </div>
              <div className="w-1 bg-gray-300 dark:bg-gray-600" />
              <div className="flex-1 space-y-4">
                <div className="flex justify-center space-x-2">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
                <Skeleton className="h-48 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if file loading failed
  if (loadingError) {
    return (
      <div className="h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-red-500 dark:text-red-400">
            <svg className="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Failed to Load File
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {loadingError}
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

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
      doc={<Editor fileData={fileData} fileId={params.fileId} saveSignal={saveSignal} onStatus={reportDoc} />}
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
