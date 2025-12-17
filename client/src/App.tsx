import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { ClassroomProvider } from "@/lib/classroom-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavTabs } from "@/components/nav-tabs";
import { UserMenu } from "@/components/user-menu";
import { SyncIndicator } from "@/components/sync-indicator";
import { BookOpen } from "lucide-react";
import LoginPage from "@/pages/login";
import PipelinePage from "@/pages/pipeline";
import TimelinePage from "@/pages/timeline";
import DashboardPage from "@/pages/dashboard";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

function AppHeader() {
  return (
    <header className="h-14 border-b flex items-center justify-between px-4 gap-4 shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          <span className="font-semibold hidden sm:inline">Student CRM</span>
        </div>
        <NavTabs />
      </div>
      <div className="flex items-center gap-2">
        <SyncIndicator />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}

function AuthenticatedApp() {
  return (
    <ClassroomProvider>
      <div className="h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 overflow-y-auto">
          <Switch>
            <Route path="/" component={PipelinePage} />
            <Route path="/timeline" component={TimelinePage} />
            <Route path="/dashboard" component={DashboardPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </ClassroomProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <AuthenticatedApp />;
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
