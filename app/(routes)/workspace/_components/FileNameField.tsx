"use client";
import React, { useRef, useState } from "react";
import { toast } from "sonner";

const MAX_NAME = 200; // matches the files.name check constraint

// The file name in the header breadcrumb. Click to rename; Enter or leaving the field saves,
// Escape cancels. A failed or empty rename puts the old name back.
const FileNameField = ({
  name,
  editable,
  onCommit,
}: {
  name: string;
  editable: boolean;
  onCommit: (name: string) => Promise<void>;
}) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const finished = useRef(false);

  const text = "min-w-0 truncate rounded-md px-1.5 py-1 font-semibold text-g-text";

  if (!editable) {
    return (
      <span className={text} title={name}>
        {name}
      </span>
    );
  }

  const finish = async (save: boolean) => {
    if (finished.current) return;
    finished.current = true;
    setEditing(false);
    const next = value.trim();
    if (!save || !next || next === name) {
      setValue(name);
      return;
    }
    try {
      await onCommit(next);
    } catch (error) {
      setValue(name);
      toast.error(error instanceof Error ? error.message : "Could not rename the file");
    }
  };

  if (editing) {
    return (
      <input
        autoFocus
        aria-label="File name"
        value={value}
        maxLength={MAX_NAME}
        onChange={(e) => setValue(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={() => finish(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") finish(true);
          if (e.key === "Escape") finish(false);
        }}
        className="h-8 min-w-0 flex-1 rounded-md border border-g-line-2 bg-g-panel-2 px-1.5 text-base font-semibold text-g-text outline-none focus-visible:ring-2 focus-visible:ring-g-accent md:text-sm"
      />
    );
  }

  return (
    <button
      type="button"
      title="Rename file"
      onClick={() => {
        finished.current = false;
        setValue(name);
        setEditing(true);
      }}
      className={`${text} text-left hover:bg-g-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-g-accent max-md:min-h-11`}
    >
      {name}
    </button>
  );
};

export default FileNameField;
