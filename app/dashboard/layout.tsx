"use client";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { listMyTeams } from "@/lib/data/teams";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import SideNav from "./_components/SideNav";
import { FileListContext } from "../_context/FileListContext";
import { FileManagementProvider, useFileManagement } from "../_context/FileManagementContext";
import { useKeyboardShortcutsContext } from "../_context/KeyboardShortcutsContext";
import { SHORTCUT_CATEGORIES } from "../_hooks/useKeyboardShortcuts";
import { TeamProvider } from "../_context/TeamContext";

// Inner component that can use the FileManagement context
const DashboardContent = ({ children, user, router, FileList_, setFileList_ }: any) => {
  const { openNewFileDialog } = useFileManagement();
  const {
    registerShortcuts,
    unregisterShortcuts,
    shortcutConfigs,
  } = useKeyboardShortcutsContext();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const db = useMemo(() => createClient(), []);

  useEffect(() => {
    user && checkTeam();
  }, [user]);

  // Handle new file creation using context
  const handleNewFile = useCallback(() => {
    openNewFileDialog();
  }, [openNewFileDialog]);

  // Handle sidebar toggle
  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
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
    try {
      const teams = await listMyTeams(db);
      if (!teams?.length) {
        router.push("/teams/create");
      }
    } catch (error) {
      console.error("Error loading teams:", error);
    }
  };

  return (
    <div className="flex">
      <div className={`h-screen fixed transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'w-16' : 'w-72'
      }`}>
        <SideNav 
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleSidebarToggle}
        />
      </div>
      <div className={`flex-1 bg-white dark:bg-gray-900 transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'ml-16' : 'ml-72'
      }`}>
        {children}
      </div>
    </div>
  );
};

const DashboardLayout = ({
  children,
}: Readonly<{ children: React.ReactNode }>) => {
  const { user } = useUser();
  const router = useRouter();
  const [FileList_,setFileList_]=useState();
  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen">
      <FileListContext.Provider value={{FileList_,setFileList_}}>
        <TeamProvider>
          <FileManagementProvider>
            <DashboardContent 
              user={user}
              router={router}
              FileList_={FileList_}
              setFileList_={setFileList_}
            >
              {children}
            </DashboardContent>
          </FileManagementProvider>
        </TeamProvider>
      </FileListContext.Provider>
    </div>
  );
};

export default DashboardLayout;
