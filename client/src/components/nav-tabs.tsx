import { Link, useLocation } from "wouter";
import { LayoutGrid, Calendar, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { path: "/", label: "Pipeline", icon: LayoutGrid },
  { path: "/timeline", label: "Timeline", icon: Calendar },
  { path: "/settings", label: "Settings", icon: Settings },
];

export function NavTabs() {
  const [location] = useLocation();

  return (
    <nav className="flex items-center gap-1">
      {tabs.map((tab) => {
        const isActive = location === tab.path;
        const Icon = tab.icon;
        
        return (
          <Link 
            key={tab.path} 
            href={tab.path}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors",
              "hover-elevate",
              isActive 
                ? "bg-secondary text-foreground" 
                : "text-muted-foreground"
            )}
            data-testid={`nav-${tab.label.toLowerCase()}`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
