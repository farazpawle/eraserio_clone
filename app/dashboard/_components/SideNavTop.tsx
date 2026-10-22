"use client";
import { ChevronDown, LayoutGrid, LogOut, Settings, Users, Trash2 } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { signOut } from "@/app/auth/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { deleteTeam, listMyTeams, type Team } from "@/lib/data/teams";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/app/_context/ThemeContext";
import { useKeyboardShortcutsContext } from "@/app/_context/KeyboardShortcutsContext";
import { toast } from "sonner";

export type { TEAM } from "@/app/_context/TeamContext";
type TEAM = Team;

const SideNavTop = ({ user, setActiveTeamInfo, isCollapsed = false }: any) => {
    const router=useRouter();
    const { actualTheme } = useTheme();
    const { openSettings } = useKeyboardShortcutsContext();
    
    const onMenuClick=(item:any)=>{
        if(item.path){
            router.push(item.path)
        } else if (item.id === 2) { // Settings menu item
            openSettings();
        }
    }
  const [activeTeam, setActiveTeam] = useState<TEAM>();
  const db = useMemo(() => createClient(), []);
  const [teamNames, setTeamNames] = useState<TEAM[]>();
  useEffect(() => {
    user && teamList();
  }, [user]);
  useEffect(()=>{
    activeTeam&&setActiveTeamInfo(activeTeam)
  },[activeTeam])
  const teamList = async () => {
    try {
      const result = (await listMyTeams(db)) ?? [];
      setTeamNames(result);
      setActiveTeam(result[0]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load teams");
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      await deleteTeam(db, teamId);
      toast.success("Team deleted successfully");
      // Refresh team list
      await teamList();
      // If deleted team was active, set first team as active
      if (activeTeam?.id === teamId && teamNames && teamNames.length > 1) {
        const remainingTeams = teamNames.filter(team => team.id !== teamId);
        setActiveTeam(remainingTeams[0]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete team");
    }
  };
  const menu = [
    {
      id: 1,
      name: "Create Team",
      path: "/teams/create",
      icon: Users,
    },
    {
      id: 2,
      name: "Settings",
      path: "",
      icon: Settings,
    },
  ];
  return (
    <div>
<Popover>
      <PopoverTrigger>
        <div className={`flex items-center gap-3 hover:bg-slate-200 dark:hover:bg-gray-700 p-3 rounded-lg cursor-pointer ${
          isCollapsed ? 'justify-center' : ''
        }`}>
          <div className={`flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 ${
            isCollapsed ? 'w-8 h-8 m-0' : 'w-[50px] h-[50px] m-2'
          }`}>
            <Image
              src={actualTheme === 'dark' ? "/logo-1.svg" : "/logo-black-_1_.svg"}
              width={isCollapsed ? 20 : 40}
              height={isCollapsed ? 20 : 40}
              alt="logo"
              className="filter dark:invert"
            />
          </div>
          {!isCollapsed && (
            <h2 className="flex gap-2 items-center font-bold text-[13px] text-gray-900 dark:text-gray-100">
              {activeTeam?.name}
              <ChevronDown className="text-gray-600 dark:text-gray-400" />
            </h2>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="ml-7 p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        {/* team section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Teams</h3>
          {teamNames?.map((item, index) => (
            <div key={index} className="flex items-center justify-between group mb-1">
              <h2
                onClick={() => setActiveTeam(item)}
                className={`flex-1 p-2 rounded-lg hover:bg-blue-500 dark:hover:bg-blue-600 cursor-pointer text-gray-900 dark:text-gray-100 ${
                  activeTeam?.id == item.id && "bg-blue-500 dark:bg-blue-600 text-white"
                }`}
              >
                {item.name}
              </h2>
              {teamNames.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTeam(item.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-600 dark:hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Separator className="mt-2 bg-slate-100 dark:bg-gray-700" />
        {/* option section */}
        <div>
          {menu.map((item, index) => (
            <h2
            onClick={()=>onMenuClick(item)}
              key={index}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex gap-2 items-center cursor-pointer text-gray-900 dark:text-gray-100"
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </h2>
          ))}
          <form action={signOut}>
            <button type="submit" className="w-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex gap-2 items-center cursor-pointer text-gray-900 dark:text-gray-100 font-bold">
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </form>
        </div>
        <Separator className="mt-2 bg-slate-100 dark:bg-gray-700" />
        {/* user info section */}

        {user && (
          <div className="mt-2 flex gap-2 items-center">
            <Avatar className="h-[30px] w-[30px]">
              <AvatarImage src={user.avatarUrl ?? undefined} alt="profile image" />
              <AvatarFallback className="text-xs">{user.name?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="">
              <h2 className="text-[14px] font-bold text-gray-900 dark:text-gray-100">
                {user.name}
              </h2>
              <h2 className="text-[12px] text-gray-500 dark:text-gray-400">{user?.email}</h2>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
    {/* All projects section */}
    <Button variant='outline'
    className={`w-full font-bold mt-8 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 ${
      isCollapsed ? 'justify-center p-2' : 'justify-start gap-2'
    }`}
    title={isCollapsed ? 'All Projects' : undefined}>
        <LayoutGrid className="h-5 w-5"/>
        {!isCollapsed && 'All Projects'}
    </Button>
    </div>
    
  );
};

export default SideNavTop;
