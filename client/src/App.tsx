import { useState } from "react";
import { Switch, Route, Router } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { ClassroomProvider } from "@/lib/classroom-context";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import LoginPage from "@/pages/login";
import PipelinePage from "@/pages/pipeline";
import TimelinePage from "@/pages/timeline";
import DashboardPage from "@/pages/dashboard";
import NotesPage from "@/pages/notes";
import SettingsPage from "@/pages/settings";
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
  const basePath = getBasePath();

  return (
    <ClassroomProvider>
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
                <Route path="/timeline" component={TimelinePage} />
                <Route path="/dashboard" component={DashboardPage} />
                <Route path="/notes" component={NotesPage} />
                <Route path="/settings" component={SettingsPage} />
                <Route component={NotFound} />
              </Switch>
            </div>
          </main>
        </div>
      </Router>
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
