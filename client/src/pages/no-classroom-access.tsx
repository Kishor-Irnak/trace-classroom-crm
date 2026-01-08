import {
  LogOut,
  UserCircle,
  BarChart3,
  BookOpen,
  Brain,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";

export default function NoClassroomAccessPage() {
  const { signOut, signInWithGoogle } = useAuth();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full border-border shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
            <UserCircle className="w-6 h-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl font-semibold">
            You’re not connected to Google Classroom
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            The account you logged in with does not have access to Google
            Classroom.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed text-center">
            Trace works by syncing with Google Classroom to show attendance,
            assignments, and academic insights.
          </p>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              What Trace Provides
            </h4>
            <ul className="text-sm space-y-2 text-foreground/80">
              <li className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary shrink-0" /> Live
                attendance tracking
              </li>
              <li className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary shrink-0" />{" "}
                Course-wise insights
              </li>
              <li className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary shrink-0" /> Safe bunk &
                eligibility predictions
              </li>
              <li className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary shrink-0" /> Exam &
                deadline alerts
              </li>
            </ul>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-md p-3 text-center">
            <p className="text-xs text-amber-800 dark:text-amber-400 font-medium">
              Please sign in using your official college Google Classroom
              account to continue.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            variant="default"
            className="w-full"
            onClick={async () => {
              await signOut();
              await signInWithGoogle();
            }}
          >
            Try another Google account
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => signOut()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
