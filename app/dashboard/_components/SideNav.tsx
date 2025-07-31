import React, { useContext, useEffect, useState } from "react";
import SideNavTop, { TEAM } from "./SideNavTop";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import SideNavBottom from "./SideNavBottom";
import { useConvex, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { FileListContext } from "@/app/_context/FileListContext";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeam } from "@/app/_context/TeamContext";
interface SideNavProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const SideNav = ({ isCollapsed = false, onToggleCollapse }: SideNavProps) => {
  const createFile = useMutation(api.files.createFile);
  const { user } = useKindeBrowserClient();
  const { activeTeam, setActiveTeam } = useTeam();
  const convex = useConvex();
  const [Files, setFiles] = useState<Number>();
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [createFileStatus, setCreateFileStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const {FileList_,setFileList_}=useContext(FileListContext);

  const onFileCreate = (fileName: string) => {
    console.log(fileName);
    setCreateFileStatus('loading');
    
    createFile({
      fileName: fileName,
      // @ts-ignore
      teamId: activeTeam?._id,
      // @ts-ignore
      createdBy: user?.email,
      archive: false,
      document: "",
      whiteboard: "",
    }).then(
      (resp) => {
        if (resp) {
          setCreateFileStatus('success');
          getFiles();
          toast.success("File Created Successfully");
          
          // Reset status after 2 seconds
          setTimeout(() => {
            setCreateFileStatus('idle');
          }, 2000);
        }
        console.log(resp);
      },
      (e) => {
        setCreateFileStatus('error');
        toast.error("Error while creating file");
        
        // Reset status after 3 seconds
        setTimeout(() => {
          setCreateFileStatus('idle');
        }, 3000);
      }
    );
  };

  useEffect(() => {
    activeTeam && getFiles();
  }, [activeTeam]);
  
  const getFiles = async () => {
    if (!activeTeam?._id) return;
    
    setIsLoadingFiles(true);
    
    try {
      const result = await convex.query(api.files.getFiles, {
        // @ts-ignore
        teamId: activeTeam?._id,
      });
      console.log(result);
      setFileList_(result);
      setFiles(result.length);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to load files');
    } finally {
      setIsLoadingFiles(false);
    }
  };
  return (
    <div className={cn(
      "h-screen fixed flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-all duration-300 ease-in-out",
      isCollapsed ? "w-16 p-2" : "w-72 p-6"
    )}>
      {/* Toggle Button */}
      <div className="flex justify-end mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex-1">
        <SideNavTop
          user={user}
          setActiveTeamInfo={setActiveTeam}
          isCollapsed={isCollapsed}
        />
        
        {/* Loading indicator for files */}
        {!isCollapsed && isLoadingFiles && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <LoadingSpinner size="sm" text="Loading files..." />
          </div>
        )}
        
        {/* File creation status */}
        {!isCollapsed && createFileStatus !== 'idle' && (
          <div className="mt-4">
            <ProgressIndicator 
              status={createFileStatus}
              message={
                createFileStatus === 'loading' ? 'Creating file...' :
                createFileStatus === 'success' ? 'File created!' :
                'Failed to create file'
              }
            />
          </div>
        )}
      </div>
      
      {!isCollapsed && (
        <div>
          <SideNavBottom 
            Files={Files} 
            onFileCreate={onFileCreate}
            isCreating={createFileStatus === 'loading'}
          />
        </div>
      )}
    </div>
  );
};

export default SideNav;
