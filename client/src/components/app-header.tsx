import { Search, RefreshCw, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useClassroom } from "@/lib/classroom-context";
import { useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { HeaderNotifications } from "@/components/header-notifications";

interface AppHeaderProps {
  onMobileMenuClick: () => void;
}

export function AppHeader({ onMobileMenuClick }: AppHeaderProps) {
  const { syncClassroom, isSyncing } = useClassroom();
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();

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

        {/* Search - Desktop only */}
        <div className="relative w-full max-w-md hidden md:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/50 border-muted focus:bg-background"
            placeholder="Search assignments..."
          />
        </div>
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
