"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type SavePart = "doc" | "canvas";
export type SaveState = "saved" | "unsaved" | "saving" | "error";

const RANK: SaveState[] = ["saved", "unsaved", "saving", "error"];

// The header shows one label for both panes: the worst state wins.
export function combineStatus(parts: Record<SavePart, SaveState>): SaveState {
  return RANK[Math.max(RANK.indexOf(parts.doc), RANK.indexOf(parts.canvas))];
}

export function useSaveStatus() {
  const [parts, setParts] = useState<Record<SavePart, SaveState>>({ doc: "saved", canvas: "saved" });
  const report = useCallback(
    (part: SavePart, state: SaveState) => setParts((prev) => (prev[part] === state ? prev : { ...prev, [part]: state })),
    []
  );
  return { status: combineStatus(parts), report };
}

// Runs `save` once each time `signal` changes. It must not depend on the identity of
// `save`: that changes whenever the pane's content does, which re-saved on every edit.
export function useSaveSignal(signal: number | undefined, save: () => void) {
  const saveRef = useRef(save);
  saveRef.current = save;
  const handled = useRef(signal);

  useEffect(() => {
    if (signal === undefined || signal === handled.current) return;
    handled.current = signal;
    saveRef.current();
  }, [signal]);
}
