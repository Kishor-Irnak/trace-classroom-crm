import { useState, useEffect } from "react";
import { Switch, Route, Router, useLocation } from "wouter";
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
import AttendancePage from "@/pages/attendance"; // Added
// ClansPage removed
import NotFound from "@/pages/not-found";
import { StreakTracker } from "@/lib/streak-tracker";

// Get base path from Vite's BASE_URL
const getBasePath = () => {
  const base = import.meta.env.BASE_URL || "/";
  // Ensure base path has leading slash and no trailing slash (except for root)
  if (base === "/") return "/";
  return base.endsWith("/") ? base.slice(0, -1) : base;
};

import { EnhancedLoadingScreen } from "@/components/enhanced-loading-screen";
import TeacherPage from "@/pages/teacher-dashboard";
import NoClassroomAccessPage from "@/pages/no-classroom-access";
import PrivacyPolicyPage from "@/pages/privacy-policy";
import TermsOfServicePage from "@/pages/terms-of-service";
import DocsPage from "@/pages/docs";

function AuthenticatedApp() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const basePath = getBasePath();

  return (
    <Router base={basePath}>
      <div className="flex h-screen bg-background overflow-hidden">
        <AppSidebar
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />
        <StreakTracker />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AppHeader onMobileMenuClick={() => setMobileMenuOpen(true)} />
          <div className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth">
            <Switch>
              <Route path="/pipeline" component={PipelinePage} />
              <Route path="/">
                {() => {
                  const [, setLocation] = useLocation();
                  useEffect(() => {
                    setLocation("/dashboard");
                  }, [setLocation]);
                  return null;
                }}
              </Route>
              <Route path="/leaderboard" component={LeaderboardPage} />
              {/* Clans route removed */}
              <Route path="/timeline" component={TimelinePage} />
              <Route path="/dashboard" component={DashboardPage} />
              <Route path="/notes" component={NotesPage} />
              <Route path="/attendance" component={AttendancePage} />
              <Route path="/settings" component={SettingsPage} />
              <Route
                path="/settings/notifications"
                component={NotificationsPage}
              />
              <Route
                path="/settings/integrations"
                component={IntegrationsPage}
              />
              <Route component={NotFound} />
            </Switch>
          </div>
        </main>
      </div>
    </Router>
  );
}

function AppContent() {
  const { user, loading: authLoading, role } = useAuth();
  const { isLoading: classroomLoading } = useClassroom();

  // Public route check - must be accessible without auth
  if (
    window.location.pathname === "/privacy-policy" ||
    window.location.pathname === "/privacy-policy/" ||
    window.location.pathname.endsWith("/privacy-policy")
  ) {
    return <PrivacyPolicyPage />;
  }

  if (
    window.location.pathname === "/terms-of-service" ||
    window.location.pathname === "/terms-of-service/" ||
    window.location.pathname.endsWith("/terms-of-service")
  ) {
    return <TermsOfServicePage />;
  }

  if (
    window.location.pathname === "/docs" ||
    window.location.pathname === "/docs/" ||
    window.location.pathname.endsWith("/docs")
  ) {
    return <DocsPage />;
  }

  // Unified loading state check
  // Shows loader if authenticating. Classroom loading is handled by page-level skeletons.
  if (authLoading) {
    return <EnhancedLoadingScreen message="Authenticating..." />;
  }

  if (!user) {
    return <LoginPage />;
  }

  // Role-based routing
  if (role === "teacher") {
    // Strict routing: Teacher should predominantly be at /teacher or dashboard
    // Since TeacherPage handles its own view state, we just render it.
    return <TeacherPage />;
  }

  if (role === "no_access") {
    return <NoClassroomAccessPage />;
  }

  // Default to Student UI
  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ClassroomProvider>
            <TooltipProvider>
              <Toaster />
              <AppContent />
            </TooltipProvider>
          </ClassroomProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
