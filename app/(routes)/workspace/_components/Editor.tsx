"use client";
import React, { useEffect, useMemo, useRef, useCallback } from "react";
import EditorJS from "@editorjs/editorjs";
// @ts-ignore
import List from "@editorjs/list";
// @ts-ignore

import Header from "@editorjs/header";
// @ts-ignore

import Checklist from "@editorjs/checklist";
import { toast } from "sonner";
import { useSaveSignal, type SaveState } from "@/app/_hooks/useSaveStatus";
import { createClient } from "@/lib/supabase/client";
import { saveDocument } from "@/lib/data/files";
import type { SharedFile } from "@/lib/data/shares";
import type { Json } from "@/types/database";

const rawData = {
  time: 1550476186479,
  blocks: [
    {
      data: {
        text: "Document Name",
        level: 2,
      },
      id: "123",
      type: "header",
    },
    {
      data: {
        level: 4,
      },
      id: "1234",
      type: "header",
    },
  ],
  version: "2.8.1",
};

const Editor = ({ saveSignal, onStatus, fileId, fileData, readOnly, onSave }: {
  saveSignal?: number,
  onStatus?: (state: SaveState) => void,
  fileId: any,
  fileData?: SharedFile,
  readOnly?: boolean,
  onSave?: (content: Json) => Promise<void>
}) => {
  const db = useMemo(() => createClient(), []);
  const ref = useRef<EditorJS>();
  // Editor.js can fire onChange while it renders the saved blocks; only edits after it is ready count.
  const armed = useRef(false);

  const onSaveDocument = useCallback(async () => {
    if (readOnly || !ref.current) return;
    onStatus?.('saving');
    try {
      const outputData = await ref.current.save();
      await (onSave ? onSave(outputData as unknown as Json) : saveDocument(db, fileId, outputData as unknown as Json));
      onStatus?.('saved');
    } catch (error: any) {
      console.error("Saving failed: ", error);
      onStatus?.('error');
      toast.error(error?.message ?? 'Failed to save document');
    }
  }, [db, fileId, onSave, onStatus, readOnly]);

  useSaveSignal(saveSignal, onSaveDocument);

  // One editor per file. fileData changes for other reasons too (a rename), and a second
  // editor in the same holder would break the first.
  useEffect(() => {
    if (!fileData) return;
    armed.current = false;
    const editor = initEditor();
    ref.current = editor;
    editor.isReady.then(() => {
      armed.current = true;
    }).catch(() => {});

    return () => {
      armed.current = false;
      try {
        editor.destroy?.();
      } catch {
        // Destroying an editor that never finished starting is harmless.
      }
      ref.current = undefined;
    };
  }, [fileData?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const initEditor = () => {
    return new EditorJS({
      /**
       * Id of Element that should contain Editor instance
       */
      tools: {
        header: {
          class: Header,
          config: {
            placeholder: readOnly ? "" : "Enter a header",
            levels: [1, 2, 3, 4],
            defaultLevel: 3,
          },
          shortcut: readOnly ? undefined : "CMD+SHIFT+H",
        },
        list: {
          class: List,
          inlineToolbar: !readOnly,
          config: {
            defaultStyle: "unordered",
          },
        },
        checklist: {
          class: Checklist,
          inlineToolbar: !readOnly,
        },
      },
      holder: "editorjs",
      data: (fileData?.document ?? rawData) as any,
      readOnly: readOnly || false,
      onChange: () => {
        if (armed.current && !readOnly) onStatus?.('unsaved');
      },
    });
  };

  return (
    <div>
      <div id="editorjs"></div>
    </div>
  );
};

export default Editor;
