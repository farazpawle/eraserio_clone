"use client";
import { useCallback, useEffect, useState } from "react";

export type EditorView = "doc" | "both" | "canvas";

const VIEWS: readonly EditorView[] = ["doc", "both", "canvas"];
const NARROW_QUERY = "(max-width: 767px)";
const storageKey = (fileId: string) => `draftboard:view:${fileId}`;

// Storage can be blocked (private window, site data off), so every access is guarded.
export function readStoredView(fileId: string): EditorView {
  try {
    const value = localStorage.getItem(storageKey(fileId));
    return VIEWS.includes(value as EditorView) ? (value as EditorView) : "both";
  } catch {
    return "both";
  }
}

// Phones have no room for two panes side by side, so "both" shows the document.
export function effectiveView(view: EditorView, narrow: boolean): EditorView {
  return narrow && view === "both" ? "doc" : view;
}

export function useEditorView(fileId: string) {
  const [view, setViewState] = useState<EditorView>("both");
  const [narrow, setNarrow] = useState(false);

  // Read after mount so server and first client render agree.
  useEffect(() => setViewState(readStoredView(fileId)), [fileId]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(NARROW_QUERY);
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const setView = useCallback(
    (next: EditorView) => {
      setViewState(next);
      try {
        localStorage.setItem(storageKey(fileId), next);
      } catch {
        // Not remembered, but the switch itself still works.
      }
    },
    [fileId]
  );

  return { view, shown: effectiveView(view, narrow), setView, narrow };
}
