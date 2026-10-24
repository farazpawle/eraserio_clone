"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/app/_context/ThemeContext";
import type { AppUser } from "@/hooks/useUser";

// Avatar menu: the editor's only place to switch between light and dark.
const UserMenu = ({ user }: { user: AppUser | null }) => {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-g-accent max-md:flex max-md:min-h-11 max-md:min-w-11 max-md:items-center max-md:justify-center"
        >
          <Avatar className="h-7 w-7">
            <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
            <AvatarFallback className="bg-g-accent text-xs font-bold text-g-accent-ink">
              {user.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 border-g-line bg-g-panel text-g-text">
        <DropdownMenuLabel className="truncate text-xs font-normal text-g-muted">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as "light" | "dark" | "system")}>
          <DropdownMenuRadioItem value="light" className="max-md:min-h-11">Light</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark" className="max-md:min-h-11">Dark</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system" className="max-md:min-h-11">System</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer gap-2 max-md:min-h-11" onClick={() => router.push("/dashboard")}>
          <LayoutGrid className="h-4 w-4" />
          Back to dashboard
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
