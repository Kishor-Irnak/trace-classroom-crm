import { BookOpen, CheckCircle, LayoutGrid, Calendar, BarChart3, Shield } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    icon: LayoutGrid,
    title: "Kanban Pipeline",
    description: "Organize assignments in a visual board with drag-and-drop",
  },
  {
    icon: Calendar,
    title: "Timeline View",
    description: "See your deadlines in chronological order",
  },
  {
    icon: BarChart3,
    title: "Dashboard",
    description: "Track workload and upcoming due dates at a glance",
  },
  {
    icon: CheckCircle,
    title: "Auto-Sync",
    description: "Assignments update automatically from Google Classroom",
  },
];

export default function LoginPage() {
  const { signInWithGoogle, loading, error } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          <span className="font-semibold">Student CRM</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                Your assignments,
                <br />
                beautifully organized
              </h1>
              <p className="text-lg text-muted-foreground">
                Transform your Google Classroom into a personal productivity system. 
                Track progress, manage deadlines, and stay on top of your coursework.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {features.map((feature) => (
                <div key={feature.title} className="flex gap-3">
                  <feature.icon className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{feature.title}</p>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Card className="w-full max-w-sm mx-auto md:mx-0 md:ml-auto">
            <CardHeader className="text-center">
              <CardTitle>Get Started</CardTitle>
              <CardDescription>
                Sign in with your Google account to connect to Google Classroom
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={signInWithGoogle}
                disabled={loading}
                className="w-full"
                size="lg"
                data-testid="button-signin-google"
              >
                <SiGoogle className="h-4 w-4 mr-2" />
                {loading ? "Signing in..." : "Continue with Google"}
              </Button>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50">
                <Shield className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  We only request read access to your courses and assignments. 
                  Your data is stored securely and never shared.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="p-4 border-t text-center text-xs text-muted-foreground">
        Student CRM for Google Classroom
      </footer>
    </div>
  );
}
