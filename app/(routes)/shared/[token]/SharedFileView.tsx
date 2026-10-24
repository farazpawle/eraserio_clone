"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertCircle, Eye, Edit, MessageSquare } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import dynamic from "next/dynamic";
import WSHeader from "../../workspace/_components/WSHeader";
import WorkspaceLayout from "../../workspace/_components/WorkspaceLayout";

// Editor.js and Excalidraw touch the DOM on import, so they can't render on the server.
const Editor = dynamic(() => import("../../workspace/_components/Editor"), { ssr: false });
const WSCanvas = dynamic(() => import("../../workspace/_components/WSCanvas"), { ssr: false });
import { toast } from "sonner";
import type { ResolvedShare } from "@/lib/data/shares";
import type { Json } from "@/types/database";
import { useEditorView } from "@/app/_hooks/useEditorView";
import { useSaveStatus, type SaveState } from "@/app/_hooks/useSaveStatus";

const REFUSED: Record<Exclude<ResolvedShare["status"], "ok">, string> = {
  not_found: "This share link is invalid.",
  revoked: "This share link has been revoked.",
  expired: "This share link has expired.",
};

const SharedFileView = ({ token, share }: { token: string; share: ResolvedShare }) => {
  const router = useRouter();
  const [saveSignal, setSaveSignal] = useState(0);
  const { view, shown, setView, narrow } = useEditorView(share.status === "ok" ? share.file.id : token);
  const { status, report } = useSaveStatus();
  // Comments are not built yet, so a comment link is read-only like a view link.
  const isReadOnly = share.status !== "ok" || share.permission !== "edit";

  useEffect(() => {
    if (share.status !== "ok") toast.error(REFUSED[share.status]);
  }, [share.status]);

  // Every save goes through the server, which re-checks the token.
  const saveVia = useCallback(
    (column: "document" | "whiteboard") => async (content: Json) => {
      const res = await fetch(`/api/shared/${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [column]: content }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "" }));
        throw new Error(error || "Could not save changes");
      }
    },
    [token]
  );
  // Stable identities: the panes must not see a new save function on every render.
  const saveDocument = useMemo(() => saveVia("document"), [saveVia]);
  const saveWhiteboard = useMemo(() => saveVia("whiteboard"), [saveVia]);
  const reportDoc = useCallback((state: SaveState) => report("doc", state), [report]);
  const reportCanvas = useCallback((state: SaveState) => report("canvas", state), [report]);

  const handleSave = () => {
    if (isReadOnly) {
      toast.error("You don't have permission to save changes");
      return;
    }
    setSaveSignal((prev) => prev + 1);
  };

  if (share.status !== "ok") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-g-bg p-4">
        <div className="max-w-md w-full">
          <Alert className="border-g-danger bg-g-panel text-g-text">
            <AlertCircle className="h-4 w-4 text-g-danger" />
            <AlertDescription>{REFUSED[share.status]}</AlertDescription>
          </Alert>
          <div className="mt-4 text-center">
            <Button onClick={() => router.push("/")} variant="outline">
              Go to Homepage
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { file, permission } = share;
  const PermissionIcon = permission === "edit" ? Edit : permission === "comment" ? MessageSquare : Eye;

  return (
    <WorkspaceLayout
      shown={shown}
      header={
        <WSHeader
          fileName={file.name}
          readOnly={isReadOnly}
          view={view}
          narrow={narrow}
          onViewChange={setView}
          status={status}
          onSave={handleSave}
        />
      }
      banner={
        <div className="flex flex-none items-center justify-between gap-2 border-b border-g-line bg-g-panel-2 px-4 py-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-g-accent-soft px-2.5 py-1 font-medium capitalize text-g-accent">
            <PermissionIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {permission} access
          </span>
          {isReadOnly && <span className="text-g-muted">Read-only</span>}
        </div>
      }
      doc={
        <Editor
          fileId={file.id}
          fileData={file}
          saveSignal={saveSignal}
          onStatus={reportDoc}
          readOnly={isReadOnly}
          onSave={saveDocument}
        />
      }
      canvas={
        <WSCanvas
          fileId={file.id}
          fileData={file}
          saveSignal={saveSignal}
          onStatus={reportCanvas}
          readOnly={isReadOnly}
          onSave={saveWhiteboard}
        />
      }
      initialLeftWidth={50}
    />
  );
};

export default SharedFileView;
