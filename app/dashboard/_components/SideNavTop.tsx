"use client";
import { ChevronDown, LayoutGrid, LogOut, Settings, Users, Trash2 } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs";
import { Separator } from "@/components/ui/separator";
import { useConvex, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/app/_context/ThemeContext";
import { useKeyboardShortcutsContext } from "@/app/_context/KeyboardShortcutsContext";
import { toast } from "sonner";

export interface TEAM {
  createdBy: string;
  teamName: string;
  _id: string;
}

const SideNavTop = ({ user,setActiveTeamInfo }: any) => {
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
  const convex = useConvex();
  const [teamNames, setTeamNames] = useState<TEAM[]>();
  const deleteTeam = useMutation(api.teams.deleteTeam);
  useEffect(() => {
    user && teamList();
  }, [user]);
  useEffect(()=>{
    activeTeam&&setActiveTeamInfo(activeTeam)
  },[activeTeam])
  const teamList = async () => {
    const result = await convex.query(api.teams.getTeam, {
      email: user?.email,
    });
    setTeamNames(result);
    setActiveTeam(result[0]);
    console.log(result);
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      await deleteTeam({ teamId: teamId as any });
      toast.success("Team deleted successfully");
      // Refresh team list
      await teamList();
      // If deleted team was active, set first team as active
      if (activeTeam?._id === teamId && teamNames && teamNames.length > 1) {
        const remainingTeams = teamNames.filter(team => team._id !== teamId);
        setActiveTeam(remainingTeams[0]);
      }
    } catch (error) {
      toast.error("Failed to delete team");
      console.error("Error deleting team:", error);
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
        <div className="flex items-center gap-3 hover:bg-slate-200 dark:hover:bg-gray-700 p-3 rounded-lg cursor-pointer">
          <div className="m-2 flex items-center justify-center w-[50px] h-[50px] bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
            <Image
              src={actualTheme === 'dark' ? "/logo-1.svg" : "/logo-black-_1_.svg"}
              width={40}
              height={40}
              alt="logo"
              className="filter dark:invert"
            />
          </div>
          <h2 className="flex gap-2 items-center font-bold text-[13px] text-gray-900 dark:text-gray-100">
            {activeTeam?.teamName}
            <ChevronDown className="text-gray-600 dark:text-gray-400" />
          </h2>
        </div>
      </PopoverTrigger>
      <PopoverContent className="ml-7 p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        {/* team section */}
        <div>
          {teamNames?.map((item, index) => (
            <div key={index} className="flex items-center justify-between group mb-1">
              <h2
                onClick={() => setActiveTeam(item)}
                className={`flex-1 p-2 rounded-lg hover:bg-blue-500 dark:hover:bg-blue-600 cursor-pointer text-gray-900 dark:text-gray-100 ${
                  activeTeam?._id == item._id && "bg-blue-500 dark:bg-blue-600 text-white"
                }`}
              >
                {item.teamName}
              </h2>
              {teamNames.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTeam(item._id);
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
          <LogoutLink>
            <h2 className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex gap-2 items-center cursor-pointer text-gray-900 dark:text-gray-100">
              <LogOut className="h-4 w-4" />
              Logout
            </h2>
          </LogoutLink>
        </div>
        <Separator className="mt-2 bg-slate-100 dark:bg-gray-700" />
        {/* user info section */}

        {user && (
          <div className="mt-2 flex gap-2 items-center">
            <Image
              className="rounded-full"
              alt="profile image"
              width={30}
              height={30}
              src={user.picture}
            />
            <div className="">
              <h2 className="text-[14px] font-bold text-gray-900 dark:text-gray-100">
                {user?.given_name} {user?.family_name}
              </h2>
              <h2 className="text-[12px] text-gray-500 dark:text-gray-400">{user?.email}</h2>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
    {/* All files section */}
    <Button variant='outline'
    className="w-full justify-start gap-2 font-bold mt-8 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700">
        <LayoutGrid className="h-5 w-5"/>
        All Files
    </Button>
    </div>
    
  );
};

export default SideNavTop;
