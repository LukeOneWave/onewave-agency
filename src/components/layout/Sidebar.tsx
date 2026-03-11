"use client";

import { useAppStore } from "@/store/app";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  MessageSquare,
  Settings,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Zap,
  Waves,
  FolderKanban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agents", label: "Agents", icon: Users },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/orchestration", label: "Missions", icon: Zap },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-14 items-center justify-between px-4 border-b border-sidebar-border">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <Waves className="h-5 w-5 text-primary" />
            <span className="font-semibold text-lg tracking-tight">OneWave</span>
          </div>
        )}
        {sidebarCollapsed && (
          <Waves className="h-5 w-5 text-primary mx-auto" />
        )}
        {!sidebarCollapsed && (
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="shrink-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>
      {sidebarCollapsed && (
        <div className="flex justify-center py-2">
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/15 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
