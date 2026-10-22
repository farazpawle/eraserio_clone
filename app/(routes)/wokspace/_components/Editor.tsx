"use client";
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import EditorJS from "@editorjs/editorjs";
// @ts-ignore
import List from "@editorjs/list";
// @ts-ignore

import Header from "@editorjs/header";
// @ts-ignore

import Checklist from "@editorjs/checklist";
import { toast } from "sonner";
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

const Editor = ({ onSaveTrigger, fileId, fileData, triggerSave, readOnly, onSave }: {
  onSaveTrigger?: any,
  fileId: any,
  fileData?: SharedFile,
  triggerSave?: number,
  readOnly?: boolean,
  onSave?: (content: Json) => Promise<void>
}) => {
  const db = useMemo(() => createClient(), []);
  const ref = useRef<EditorJS>();
  const [document, setDocument] = useState(rawData);
  const onSaveDocument = useCallback(() => {
    if (ref.current) {
      ref.current
        .save()
        .then((outputData) =>
          onSave ? onSave(outputData as unknown as Json) : saveDocument(db, fileId, outputData as unknown as Json)
        )
        .then(() => {
          toast.success('Document saved successfully');
        })
        .catch((error) => {
          console.error("Saving failed: ", error);
          toast.error(error?.message ?? 'Failed to save document');
        });
    }
  }, [db, fileId, onSave]);

  useEffect(() => {
    
   fileData&&initEditor();
  }, [fileData]);

  useEffect(() => {
    if (onSaveTrigger) {
      onSaveDocument();
    }
  }, [onSaveTrigger, onSaveDocument]);

  useEffect(() => {
    if (triggerSave && triggerSave > 0 && !readOnly) {
      onSaveDocument();
    }
  }, [triggerSave, onSaveDocument, readOnly]);

  const initEditor = () => {
    const editor = new EditorJS({
      /**
       * Id of Element that should contain Editor instance
       */
      tools: {
        header: {
          class: Header,
          config: {
            placeholder: readOnly ? "" : "Enter a header",
            levels: [2, 3, 4],
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
    });
    ref.current = editor;
  };

  return (
    <div>
      <div id="editorjs" className="ml-20"></div>
    </div>
  );
};

export default Editor;
