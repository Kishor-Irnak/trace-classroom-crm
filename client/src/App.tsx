import { useState, useEffect } from "react";
import { Switch, Route, Router } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { ClassroomProvider, useClassroom } from "@/lib/classroom-context";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import LoginPage from "@/pages/login";
import PipelinePage from "@/pages/pipeline";
import TimelinePage from "@/pages/timeline";
import DashboardPage from "@/pages/dashboard";
import NotesPage from "@/pages/notes";
import SettingsPage from "@/pages/settings";
import NotificationsPage from "@/pages/notifications";
import IntegrationsPage from "@/pages/integrations";
import LeaderboardPage from "@/pages/leaderboard";
import NotFound from "@/pages/not-found";

// Get base path from Vite's BASE_URL
const getBasePath = () => {
  const base = import.meta.env.BASE_URL || "/";
  // Ensure base path has leading slash and no trailing slash (except for root)
  if (base === "/") return "/";
  return base.endsWith("/") ? base.slice(0, -1) : base;
};

function AuthenticatedApp() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isLoading } = useClassroom();
  const basePath = getBasePath();

  if (isLoading) {
    return <LoadingOverlay message="Setting up your workspace..." />;
  }

  return (
    <Router base={basePath}>
      <div className="flex h-screen bg-background overflow-hidden">
        <AppSidebar
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AppHeader onMobileMenuClick={() => setMobileMenuOpen(true)} />
          <div className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth">
            <Switch>
              <Route path="/" component={PipelinePage} />
              <Route path="/leaderboard" component={LeaderboardPage} />
              <Route path="/timeline" component={TimelinePage} />
              <Route path="/dashboard" component={DashboardPage} />
              <Route path="/notes" component={NotesPage} />
              <Route path="/settings" component={SettingsPage} />
              <Route path="/settings/notifications" component={NotificationsPage} />
              <Route path="/settings/integrations" component={IntegrationsPage} />
              <Route component={NotFound} />
            </Switch>
          </div>
        </main>
      </div>
    </Router>
  );
}

const TIPS = [
  "You can sync your deadlines directly to Google Calendar.",
  "Check the Pipeline view to drag and drop assignments between statuses.",
  "The Dashboard gives you a quick overview of your weekly workload.",
  "Enable email notifications to get a daily digest of your tasks.",
  "You can access your course PDF materials in the Notes section."
];

function LoadingOverlay({ message = "Loading..." }: { message?: string }) {
  const [progress, setProgress] = useState(13);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    // Progress bar simulation
    const timer = setInterval(() => {
      setProgress((oldProgress) => {
        if (oldProgress === 100) return 100;
        const diff = Math.random() * 10;
        return Math.min(oldProgress + diff, 90);
      });
    }, 500);

    // Tip rotation
    const tipTimer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 3000);

    return () => {
      clearInterval(timer);
      clearInterval(tipTimer);
    };
  }, []);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 text-center animate-in fade-in duration-500">
        
        <div className="space-y-4">
          <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          
          <h2 className="text-2xl font-bold tracking-tight">{message}</h2>
          
          <div className="space-y-2">
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest text-right">
              {Math.round(progress)}%
            </p>
          </div>
        </div>

        <div className="bg-muted/30 border border-muted p-6 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary/50" />
          <p className="text-sm font-medium text-muted-foreground animate-in slide-in-from-bottom-2 fade-in duration-500 key={tipIndex}">
            <span className="block text-xs font-black uppercase text-foreground/80 mb-2 tracking-wider">Use Tip</span>
            "{TIPS[tipIndex]}"
          </p>
        </div>

      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return <LoadingOverlay message="Authenticating..." />;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <ClassroomProvider>
      <AuthenticatedApp />
    </ClassroomProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <AppContent />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
