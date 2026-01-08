import { RefreshCw, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClassroom } from "@/lib/classroom-context";
import { cn } from "@/lib/utils";

export function SyncIndicator() {
  const { isSyncing, lastSyncedAt, error, syncClassroom } = useClassroom();

  const formatLastSync = () => {
    if (!lastSyncedAt) return "Never synced";
    
    const diff = Date.now() - lastSyncedAt.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    return lastSyncedAt.toLocaleDateString();
  };

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5" />
          Sync failed
        </span>
      )}
      
      {!error && lastSyncedAt && (
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {formatLastSync()}
        </span>
      )}

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
        data-testid="button-sync"
      >
        <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
      </Button>
    </div>
  );
}
