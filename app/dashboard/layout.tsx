"use client";
import { api } from "@/convex/_generated/api";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { useConvex } from "convex/react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useCallback } from "react";
import SideNav from "./_components/SideNav";
import { FileListContext } from "../_context/FileListContext";
import { useKeyboardShortcutsContext } from "../_context/KeyboardShortcutsContext";
import { SHORTCUT_CATEGORIES } from "../_hooks/useKeyboardShortcuts";

const DashboardLayout = ({
  children,
}: Readonly<{ children: React.ReactNode }>) => {
  const { user }: any = useKindeBrowserClient();
  const convex = useConvex();
  const router = useRouter();
  const [FileList_,setFileList_]=useState();
  const {
    registerShortcuts,
    unregisterShortcuts,
    shortcutConfigs,
  } = useKeyboardShortcutsContext();
  const [newFileDialogOpen, setNewFileDialogOpen] = useState(false);
  useEffect(() => {
    user && checkTeam();
  }, [user]);

  // Handle new file creation
  const handleNewFile = useCallback(() => {
    // Trigger new file creation
    setNewFileDialogOpen(true);
    // Find and click the "Add New File" button
    const addFileButton = document.querySelector('[data-testid="add-new-file-button"]') as HTMLButtonElement;
    if (addFileButton) {
      addFileButton.click();
    }
  }, []);

  // Register dashboard-specific shortcuts
  useEffect(() => {
    const newFileConfig = shortcutConfigs.find(config => config.id === 'new-file');
    
    if (newFileConfig) {
      const dashboardShortcuts = [
        {
          key: newFileConfig.key,
          ctrlKey: newFileConfig.ctrlKey,
          shiftKey: newFileConfig.shiftKey,
          altKey: newFileConfig.altKey,
          metaKey: newFileConfig.metaKey,
          action: handleNewFile,
          description: newFileConfig.description,
          category: newFileConfig.category,
        },
      ];

      registerShortcuts(dashboardShortcuts);
    }

    return () => {
      unregisterShortcuts();
    };
  }, [registerShortcuts, unregisterShortcuts, handleNewFile, shortcutConfigs]);
  const checkTeam = async () => {
    const result = await convex.query(api.teams.getTeam, {
      email: user?.email,
    });
    if (!result?.length) {
      router.push("teams/create");
    }
  };
  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen">
      <FileListContext.Provider value={{FileList_,setFileList_}}>
      <div className="grid grid-cols-4">
        <div className='h-screen w-72 fixed'>
          <SideNav newFileDialogOpen={newFileDialogOpen} setNewFileDialogOpen={setNewFileDialogOpen} />
        </div>
        <div className="col-span-4 ml-72 bg-white dark:bg-gray-900">
            {children}
        </div>
      </div>
      </FileListContext.Provider>
    </div>
  );
};

export default DashboardLayout;
