"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import EditorJS from "@editorjs/editorjs";
// @ts-ignore
import List from "@editorjs/list";
// @ts-ignore

import Header from "@editorjs/header";
// @ts-ignore

import Checklist from "@editorjs/checklist";
import { useMutation } from "convex/react";
import { putFile } from "@/convex/files";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { FILE } from "@/app/dashboard/_components/FileList";

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

const Editor = ({ onSaveTrigger, fileId, fileData, triggerSave, readOnly }: {
  onSaveTrigger?: any,
  fileId: any,
  fileData: FILE,
  triggerSave?: number,
  readOnly?: boolean
}) => {
  const updateDocument = useMutation(api.files.putFile);
  const ref = useRef<EditorJS>();
  const [document, setDocument] = useState(rawData);
  const onSaveDocument = useCallback(() => {
    if (ref.current) {
      ref.current
        .save()
        .then((outputData) => {
          console.log("Article data: ", outputData);
          updateDocument({
            _id: fileId,
            document: JSON.stringify(outputData),
          }).then(
            (resp) => {
              toast.success('Document saved successfully');
            }
          );
        })
        .catch((error) => {
          console.log("Saving failed: ", error);
        });
    }
  }, [updateDocument, fileId]);

  useEffect(() => {
    
   fileData&&initEditor();
  }, [fileData]);

  useEffect(() => {
    console.log(onSaveTrigger);
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
      data: fileData.document?JSON.parse(fileData?.document):rawData,
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
