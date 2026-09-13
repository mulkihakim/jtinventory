"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

type SidebarUserProps = {
  name: string;
  email: string;
  role: string;
};

export function SidebarUser({ name, email, role }: SidebarUserProps) {
  async function handleSignOut() {
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <div className="border-t border-sidebar-border px-2 pt-3">
      <div className="min-w-0 px-2 pb-2">
        <p className="truncate text-sm font-medium text-sidebar-foreground">{name}</p>
        <p className="truncate text-xs text-sidebar-foreground/60">{email}</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-sidebar-foreground/70">
          {role}
        </p>
      </div>

      <Button
        type="button"
        variant="ghost"
        className="w-full justify-start gap-2 px-2 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        onClick={handleSignOut}
      >
        <LogOut className="size-4" />
        Logout
      </Button>
    </div>
  );
}
