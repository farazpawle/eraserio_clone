"use client";
import React from "react";
import type { EditorView } from "@/app/_hooks/useEditorView";

const TABS: { value: EditorView; label: string }[] = [
  { value: "doc", label: "Document" },
  { value: "both", label: "Both" },
  { value: "canvas", label: "Canvas" },
];

// Document / Both / Canvas. "Both" needs two panes side by side, so phones do not get it.
const ViewSwitch = ({
  value,
  onChange,
  narrow,
}: {
  value: EditorView;
  onChange: (view: EditorView) => void;
  narrow: boolean;
}) => {
  const tabs = narrow ? TABS.filter((t) => t.value !== "both") : TABS;

  const move = (event: React.KeyboardEvent<HTMLElement>, from: number) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const to = (from + step + tabs.length) % tabs.length;
    onChange(tabs[to].value);
    event.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="tab"]')[to]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="View"
      className="inline-flex flex-none gap-0.5 rounded-lg border border-g-line bg-g-panel-2 p-[3px]"
    >
      {tabs.map((tab, i) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(e) => move(e, i)}
            className={`h-[30px] rounded-md px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-g-accent max-md:h-[38px] max-md:min-w-11 max-md:px-2.5 ${
              selected ? "bg-g-hover text-g-text shadow-sm" : "text-g-muted hover:text-g-text"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default ViewSwitch;
