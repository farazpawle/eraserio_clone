"use client";
import React from "react";
import { ResizablePane } from "@/components/ui/resizable-pane";
import type { EditorView } from "@/app/_hooks/useEditorView";

const SHOW = { doc: "left", canvas: "right", both: "both" } as const;

// Shared by the signed-in editor and the share-link page. Panes stay mounted when
// hidden (see ResizablePane), so switching views never loses unsaved work.
const WorkspaceLayout = ({
  header,
  banner,
  doc,
  canvas,
  shown,
  initialLeftWidth = 40,
}: {
  header: React.ReactNode;
  banner?: React.ReactNode;
  doc: React.ReactNode;
  canvas: React.ReactNode;
  shown: EditorView;
  initialLeftWidth?: number;
}) => (
  <div className="flex h-screen flex-col bg-g-bg text-g-text">
    {header}
    {banner}
    <div className="min-h-0 flex-1">
      <ResizablePane
        leftPanel={<div className="ws-doc h-full overflow-auto">{doc}</div>}
        rightPanel={<div className="ws-canvas h-full">{canvas}</div>}
        show={SHOW[shown]}
        initialLeftWidth={initialLeftWidth}
        minLeftWidth={20}
        maxLeftWidth={80}
        snapPoints={[25, 33, 40, 50, 67, 75]}
        snapThreshold={3}
        showSnapIndicators
        className="bg-g-bg"
        resizerClassName="bg-g-line hover:bg-g-accent"
      />
    </div>
  </div>
);

export default WorkspaceLayout;
