"use client";
import React from "react";
import { Columns2, FileText, PenTool, type LucideIcon } from "lucide-react";
import type { EditorView } from "@/app/_hooks/useEditorView";

const TABS: { value: EditorView; label: string; Icon: LucideIcon }[] = [
  { value: "doc", label: "Document", Icon: FileText },
  { value: "both", label: "Both", Icon: Columns2 },
  { value: "canvas", label: "Canvas", Icon: PenTool },
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
      className="inline-flex flex-none gap-0.5 rounded-lg border border-g-line bg-g-panel-2 p-[3px] max-md:p-0.5"
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
            title={tab.label}
            className={`inline-flex items-center justify-center h-[30px] rounded-md px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-g-accent max-md:h-11 max-md:min-w-11 max-md:px-2.5 ${
              selected ? "bg-g-hover text-g-text shadow-sm" : "text-g-muted hover:text-g-text"
            }`}
          >
            {/* Small phones get icons only; the label stays for screen readers. */}
            <tab.Icon className="hidden h-[18px] w-[18px] max-sm:block" aria-hidden="true" />
            <span className="max-sm:sr-only">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ViewSwitch;
