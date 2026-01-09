import { Link, useLocation } from "wouter";
import {
  LayoutGrid,
  Calendar,
  BarChart3,
  Settings,
  X,
  LogOut,
  FileText,
  Moon,
  Sun,
  Trophy,
  UserCheck, // Added
} from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { path: "/pipeline", label: "Pipeline", icon: LayoutGrid },
  { path: "/timeline", label: "Timeline", icon: Calendar },
  { path: "/attendance", label: "Attendance", icon: UserCheck },
  { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { path: "/notes", label: "Notes", icon: FileText },
];

interface AppSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AppSidebar({ mobileOpen, onMobileClose }: AppSidebarProps) {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const initials =
    user?.displayName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ||
    user?.email?.[0].toUpperCase() ||
    "U";

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-background">
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b shrink-0">
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt="Trace"
          className="w-8 h-8 mr-3"
        />
        <span className="font-bold text-lg tracking-tight">Trace</span>
        {isMobile && (
          <button className="ml-auto" onClick={onMobileClose}>
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* User Profile */}
      <div className="p-4 border-b shrink-0">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={user?.photoURL || undefined}
              alt={user?.displayName || "User"}
              referrerPolicy="no-referrer"
            />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.displayName || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div>
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Academic
          </p>
          {[
            { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
            { path: "/pipeline", label: "Pipeline", icon: LayoutGrid },
            { path: "/timeline", label: "Timeline", icon: Calendar },
            { path: "/notes", label: "Notes", icon: FileText },
          ].map((item) => (
            <Link
              key={item.path}
              href={item.path}
              onClick={onMobileClose}
              className={cn(
                "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                location === item.path
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <item.icon className="w-4 h-4 mr-3" />
              {item.label}
            </Link>
          ))}
        </div>

        <div className="mt-8">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Performance
          </p>
          {[
            { path: "/attendance", label: "Attendance", icon: UserCheck },
            { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
          ].map((item) => (
            <Link
              key={item.path}
              href={item.path}
              onClick={onMobileClose}
              className={cn(
                "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                location === item.path
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <item.icon className="w-4 h-4 mr-3" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t space-y-1 shrink-0">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center px-3 py-2 text-sm font-medium text-muted-foreground rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 mr-3" />
          ) : (
            <Moon className="w-4 h-4 mr-3" />
          )}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>

        <Link
          href="/settings"
          onClick={onMobileClose}
          className={cn(
            "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
            location === "/settings"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Settings className="w-4 h-4 mr-3" />
          Settings
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r bg-background transform transition-transform duration-200 ease-in-out",
          isMobile
            ? mobileOpen
              ? "translate-x-0"
              : "-translate-x-full"
            : "relative translate-x-0"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onMobileClose}
        />
      )}
    </>
  );
}
