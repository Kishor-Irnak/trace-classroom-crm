import { RefreshCw, Menu, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClassroom } from "@/lib/classroom-context";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { HeaderNotifications } from "@/components/header-notifications";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";

interface AppHeaderProps {
  onMobileMenuClick: () => void;
}

export function AppHeader({ onMobileMenuClick }: AppHeaderProps) {
  const { syncClassroom, isSyncing } = useClassroom();
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const { user } = useAuth();

  // Extract domain from user email
  const userDomain = user?.email?.split("@")[1] || "";

  // List of generic/non-college domains to exclude
  const genericDomains = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "live.com",
    "aol.com",
    "icloud.com",
    "protonmail.com",
    "mail.com",
    "zoho.com",
    "yandex.com",
  ];

  // Check if domain is a college domain (not in generic list and not a .com)
  const isCollegeDomain =
    userDomain &&
    !genericDomains.includes(userDomain.toLowerCase()) &&
    !userDomain.endsWith(".com") &&
    userDomain.includes(".");

  // Get current view name for mobile
  const viewNames: Record<string, string> = {
    "/": "Pipeline",
    "/timeline": "Timeline",
    "/dashboard": "Dashboard",
    "/attendance": "Attendance",
    "/notes": "Notes",
    "/settings": "Settings",
  };
  const currentViewName = viewNames[location] || "Trace";

  return (
    <header className="h-16 bg-background border-b flex items-center px-4 md:px-6 justify-between shrink-0 z-10">
      <div className="flex items-center flex-1">
        {/* Mobile menu button */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileMenuClick}
            className="mr-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        {/* Mobile view title */}
        <span className="md:hidden font-medium text-lg">{currentViewName}</span>

        {/* College Domain Badge - Desktop only */}
        {!isMobile && isCollegeDomain && (
          <div className="flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">
              {userDomain}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center ml-4 gap-2">
        <HeaderNotifications />
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.preventDefault();
            syncClassroom().catch((err) => {
              console.error("Sync failed:", err);
            });
          }}
          disabled={isSyncing}
          className={cn(isSyncing && "animate-spin")}
          title="Sync with Classroom"
        >
          <RefreshCw className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}
