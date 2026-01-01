import { RefreshCw } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";

export function TokenRefreshPrompt() {
  const { refreshAccessToken, signOut } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const success = await refreshAccessToken();
      if (success) {
        // Reload the page to trigger a fresh sync
        window.location.reload();
      } else {
        // If refresh fails, show sign out option
        alert("Unable to refresh. Please try signing in again.");
      }
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 p-6 bg-white">
      {/* Icon Container */}
      <div className="relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)] bg-[size:2rem_2rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-30" />

        {/* Icon Circle */}
        <div className="relative bg-zinc-50 border border-zinc-200 p-8 rounded-2xl shadow-sm">
          <RefreshCw className="w-16 h-16 text-zinc-950" strokeWidth={1.5} />
        </div>
      </div>

      {/* Content */}
      <div className="text-center space-y-3 max-w-md">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Session Refresh Required
        </h2>
        <p className="text-sm text-zinc-600 leading-relaxed">
          To keep your data secure and up-to-date, please sign in again. This
          only takes a moment and your progress is saved.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex-1 h-12 bg-zinc-950 hover:bg-zinc-800 text-white border border-transparent rounded-md transition-all duration-200 flex items-center justify-center gap-3 shadow-sm hover:shadow-md"
        >
          {isRefreshing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="font-medium">Signing In...</span>
            </>
          ) : (
            <>
              <SiGoogle className="h-4 w-4" />
              <span className="font-medium">Sign In Again</span>
            </>
          )}
        </Button>
        <Button
          onClick={() => signOut()}
          variant="outline"
          className="h-12 border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 rounded-md transition-colors"
        >
          Sign Out
        </Button>
      </div>

      {/* Info Note */}
      <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-md max-w-sm w-full">
        <p className="text-xs text-zinc-600 leading-relaxed text-center">
          <span className="font-semibold text-zinc-900">
            Your progress is safe.
          </span>{" "}
          Signing in again will restore everything right where you left off.
        </p>
      </div>
    </div>
  );
}
