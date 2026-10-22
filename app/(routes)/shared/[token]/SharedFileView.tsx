"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertCircle, Eye, Edit, MessageSquare } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import WSHeader from "../../wokspace/_components/WSHeader";
import Editor from "../../wokspace/_components/Editor";
import WSCanvas from "../../wokspace/_components/WSCanvas";
import { ResizablePane } from "@/components/ui/resizable-pane";
import { toast } from "sonner";
import type { ResolvedShare } from "@/lib/data/shares";
import type { Json } from "@/types/database";

const REFUSED: Record<Exclude<ResolvedShare["status"], "ok">, string> = {
  not_found: "This share link is invalid.",
  revoked: "This share link has been revoked.",
  expired: "This share link has expired.",
};

const SharedFileView = ({ token, share }: { token: string; share: ResolvedShare }) => {
  const router = useRouter();
  const [triggerSave, setTriggerSave] = useState(0);
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

  const handleSave = () => {
    if (isReadOnly) {
      toast.error("You don't have permission to save changes");
      return;
    }
    setTriggerSave((prev) => prev + 1);
  };

  if (share.status !== "ok") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900 p-4">
        <div className="max-w-md w-full">
          <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-200">{REFUSED[share.status]}</AlertDescription>
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
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      {/* No fileData: link holders get no share/export controls. */}
      <WSHeader onSave={handleSave} fileName={file.name} />

      <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-2">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-800 rounded-full">
            <PermissionIcon className="h-4 w-4" />
            <span className="text-xs font-medium text-blue-800 dark:text-blue-200 capitalize">{permission} Access</span>
          </div>
          {isReadOnly && <div className="text-xs text-blue-600 dark:text-blue-400">Read-only mode</div>}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ResizablePane
          leftPanel={
            <Editor
              fileId={file.id}
              fileData={file}
              triggerSave={triggerSave}
              readOnly={isReadOnly}
              onSave={saveVia("document")}
            />
          }
          rightPanel={
            <WSCanvas
              fileId={file.id}
              fileData={file}
              triggerSave={triggerSave}
              readOnly={isReadOnly}
              onSave={saveVia("whiteboard")}
            />
          }
          initialLeftWidth={50}
          minLeftWidth={30}
          maxLeftWidth={70}
        />
      </div>
    </div>
  );
};

export default SharedFileView;
