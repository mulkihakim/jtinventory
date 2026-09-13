import Link from "next/link";

import {
  Boxes,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  Users,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";
import { SidebarUser } from "@/components/layout/sidebar-user";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Categories",
    url: "/categories",
    icon: FolderKanban,
  },
  {
    title: "Items",
    url: "/items",
    icon: Boxes,
  },
  {
    title: "Loans",
    url: "/loans",
    icon: ClipboardList,
  },
  {
    title: "Users",
    url: "/users",
    icon: Users,
  },
];

export async function AppSidebar() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  const isTechnician = session?.user.role === "TEKNISI";
  const visibleMenuItems = isTechnician
    ? menuItems
    : menuItems.filter((item) => item.title === "Dashboard" || item.title === "Loans");

  return (
    <Sidebar>
      <SidebarContent className="gap-0">
        <SidebarGroup className="gap-0 p-0">
          <SidebarGroupLabel className="h-14 min-h-14 border-b border-sidebar-border/80 px-4 text-sm font-medium text-sidebar-foreground/80">
            JTInventory
          </SidebarGroupLabel>

          <SidebarGroupContent className="px-2 pb-2 pt-3">
            <SidebarMenu className="gap-1">
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    className="h-10 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                    render={<Link href={item.url} />}
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarUser
          name={session.user.name ?? "User"}
          email={session.user.email ?? ""}
          role={session.user.role}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
