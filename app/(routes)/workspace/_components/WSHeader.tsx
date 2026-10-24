"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Share2 } from "lucide-react";
import FileShareModal from "@/components/ui/file-share-modal";
import type { FileRow } from "@/lib/data/files";
import type { Scene } from "@/lib/canvas/persist";
import type { AppUser } from "@/hooks/useUser";
import type { EditorView } from "@/app/_hooks/useEditorView";
import type { SaveState } from "@/app/_hooks/useSaveStatus";
import FileNameField from "./FileNameField";
import ViewSwitch from "./ViewSwitch";
import ExportMenu from "./ExportMenu";
import UserMenu from "./UserMenu";

const STATUS: Record<SaveState, { label: string; dot: string }> = {
  saved: { label: "Saved", dot: "bg-g-ok" },
  unsaved: { label: "Unsaved changes", dot: "bg-g-c-orange" },
  saving: { label: "Saving…", dot: "bg-g-faint animate-pulse motion-reduce:animate-none" },
  error: { label: "Save failed", dot: "bg-g-danger" },
};

type WSHeaderProps = {
  fileName: string;
  teamName?: string;
  // Only signed-in editors have this; link holders get no share, export or rename.
  fileData?: FileRow;
  readOnly?: boolean;
  view: EditorView;
  narrow: boolean;
  onViewChange: (view: EditorView) => void;
  status: SaveState;
  onSave: () => void;
  onRename?: (name: string) => Promise<void>;
  getScene?: () => Scene | null;
  user?: AppUser | null;
};

const WSHeader = ({
  fileName,
  teamName,
  fileData,
  readOnly = false,
  view,
  narrow,
  onViewChange,
  status,
  onSave,
  onRename,
  getScene,
  user = null,
}: WSHeaderProps) => {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const showFileTools = !!fileData && !readOnly;
  const { label, dot } = STATUS[status];

  return (
    <>
      <header className="flex h-[52px] flex-none items-center gap-3 border-b border-g-line bg-g-panel px-3 max-sm:gap-2 max-sm:px-2">
        <Link
          href="/dashboard"
          aria-label="Back to dashboard"
          className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-g-accent text-g-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-g-accent focus-visible:ring-offset-2 focus-visible:ring-offset-g-panel max-md:h-11 max-md:w-11"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path d="M5 4h14v16H3z" fill="currentColor" />
            <path d="M10 9h6M9 13h7M8 17h5" stroke="var(--g-accent)" strokeWidth="2" fill="none" />
          </svg>
        </Link>

        <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          {teamName && (
            <>
              <span className="hidden whitespace-nowrap text-g-muted lg:inline">{teamName}</span>
              <span className="hidden text-g-faint lg:inline" aria-hidden="true">
                /
              </span>
            </>
          )}
          <FileNameField
            name={fileName}
            editable={!!onRename && !readOnly}
            onCommit={onRename ?? (async () => {})}
          />
        </nav>

        <ViewSwitch value={view} onChange={onViewChange} narrow={narrow} />

        <div className="flex flex-none items-center gap-2">
          {!readOnly && (
            <span
              role="status"
              aria-live="polite"
              title={label}
              className="flex items-center gap-1.5 text-xs text-g-faint"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
              <span className="max-lg:sr-only">{label}</span>
            </span>
          )}

          {user && !readOnly && <UserMenu user={user} />}

          {showFileTools && getScene && <ExportMenu file={fileData} getScene={getScene} />}

          {!readOnly && (
            <button
              type="button"
              onClick={onSave}
              disabled={status === "saving"}
              className="inline-flex h-9 items-center rounded-md border border-g-line-2 bg-g-panel-2 px-3 text-sm font-medium text-g-text hover:bg-g-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-g-accent disabled:opacity-60 max-md:min-h-11"
            >
              Save
            </button>
          )}

          {showFileTools && (
            <button
              type="button"
              aria-label="Share"
              onClick={() => setIsShareOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-g-accent px-3 text-sm font-semibold text-g-accent-ink hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-g-accent focus-visible:ring-offset-2 focus-visible:ring-offset-g-panel max-md:min-h-11 max-md:min-w-11 max-md:justify-center"
            >
              <Share2 className="h-[18px] w-[18px]" />
              <span className="hidden sm:inline">Share</span>
            </button>
          )}
        </div>
      </header>

      {showFileTools && (
        <FileShareModal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} file={fileData} teamName={teamName} />
      )}
    </>
  );
};

export default WSHeader;
