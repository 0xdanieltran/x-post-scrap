"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Bookmark,
  Kanban,
  History,
  Settings,
  Shield,
  Search,
  Database,
  Filter,
  BarChart3,
  ScrollText,
  Moon,
  Sun,
  LogOut,
  Menu,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSidebarStore } from "@/stores/job-store";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const userNav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/jobs", label: "Job Feed", icon: Briefcase },
  { href: "/dashboard/saved", label: "Saved Jobs", icon: Bookmark },
  { href: "/dashboard/applications", label: "Applications", icon: Kanban },
  { href: "/dashboard/history", label: "Search History", icon: History },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const adminNav = [
  { href: "/admin/queries", label: "Queries", icon: Search },
  { href: "/admin/ingestion", label: "Ingestion", icon: Database },
  { href: "/admin/spam", label: "Spam Filters", icon: Filter },
  { href: "/admin/stats", label: "Statistics", icon: BarChart3 },
  { href: "/admin/logs", label: "Logs", icon: ScrollText },
];

interface SidebarProps {
  isAdmin?: boolean;
  userName?: string;
  userEmail?: string;
  avatarUrl?: string;
}

function NavItems({
  items,
  pathname,
  onNavigate,
}: {
  items: typeof userNav;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardSidebar({
  isAdmin,
  userName,
  userEmail,
  avatarUrl,
}: SidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const collapsed = useSidebarStore((s) => s.collapsed);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Briefcase className="h-4 w-4" />
        </div>
        {!collapsed && (
          <span className="font-semibold tracking-tight">X Job Fetch</span>
        )}
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <NavItems items={userNav} pathname={pathname} />
        {isAdmin && (
          <>
            <Separator className="my-4" />
            <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Admin
            </p>
            <NavItems items={adminNav} pathname={pathname} />
          </>
        )}
      </ScrollArea>

      <div className="border-t p-3">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="ghost" className="w-full justify-start gap-3 px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback>
                  {userName?.charAt(0)?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-medium truncate max-w-[140px]">
                    {userName ?? "User"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                    {userEmail}
                  </span>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="mr-2 h-4 w-4" />
              ) : (
                <Moon className="mr-2 h-4 w-4" />
              )}
              Toggle theme
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem>
                <Link href="/admin/queries">
                  <Shield className="mr-2 h-4 w-4" />
                  Admin Panel
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={cn(
          "hidden md:flex h-screen flex-col border-r bg-card transition-all duration-300",
          collapsed ? "w-16" : "w-64",
        )}
      >
        {sidebarContent}
      </aside>

      <Sheet>
        <SheetTrigger>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden fixed top-3 left-3 z-50"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    </>
  );
}
