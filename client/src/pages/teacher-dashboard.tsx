import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Settings,
  LogOut,
  Users,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  Moon,
  Sun,
  RotateCw,
  Bell,
  Menu,
  X,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EnhancedLoadingScreen } from "@/components/enhanced-loading-screen";
import { useIsMobile } from "@/hooks/use-mobile";
import { AttendanceService } from "@/services/attendance-service";

// --- Constants ---
const TEACHER_TIPS = [
  "You can hide attendance visibility for specific courses during exams.",
  "Students can directly view attendance when you make it visible.",
  "Syncing pulls the latest course list from Google Classroom.",
  "Students can only see their own attendance records.",
  "Teacher Dashboard gives you a quick overview of enabled courses.",
];

// --- Types ---
interface TeacherCourse {
  id: string;
  name: string;
  section: string;
  enrollmentCode?: string;
}

// --- Sidebar Component ---
interface TeacherSidebarProps {
  activePage: string;
  setPage: (p: string) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function TeacherSidebar({
  activePage,
  setPage,
  mobileOpen,
  onMobileClose,
}: TeacherSidebarProps) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "courses", label: "Courses", icon: BookOpen },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const initials =
    user?.displayName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ||
    user?.email?.[0].toUpperCase() ||
    "U";

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-border shrink-0">
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt="Trace"
          className="w-8 h-8 mr-3"
        />
        <span className="font-bold text-lg tracking-tight">Trace</span>
        <span className="ml-2 text-xs font-medium text-muted-foreground border border-border px-1.5 py-0.5 rounded">
          Teacher
        </span>
        {isMobile && (
          <button className="ml-auto" onClick={onMobileClose}>
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-border shrink-0">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={user?.photoURL || undefined}
              alt={user?.displayName || "User"}
              referrerPolicy="no-referrer"
            />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.displayName || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setPage(item.id);
              if (isMobile) onMobileClose();
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              activePage === item.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-border space-y-1 shrink-0">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center px-3 py-2 text-sm font-medium text-muted-foreground rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 mr-3" />
          ) : (
            <Moon className="w-4 h-4 mr-3" />
          )}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>

        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-background transform transition-transform duration-200 ease-in-out",
          isMobile
            ? mobileOpen
              ? "translate-x-0 shadow-2xl"
              : "-translate-x-full"
            : "relative translate-x-0"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm"
          onClick={onMobileClose}
        />
      )}
    </>
  );
}

// --- Dashboard View ---
interface TeacherDashboardProps {
  courses: TeacherCourse[];
}

function TeacherDashboard({ courses }: TeacherDashboardProps) {
  const [enabledCount, setEnabledCount] = useState(0);
  const [hiddenCount, setHiddenCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      let enabled = 0;
      let hidden = 0;

      // Parallel fetch for better performance
      const configs = await Promise.all(
        courses.map((c) => AttendanceService.getCourseConfig(c.id))
      );

      configs.forEach((config) => {
        if (config) {
          if (config.isVisible) enabled++;
          else hidden++;
        }
      });

      setEnabledCount(enabled);
      setHiddenCount(hidden);
    };

    fetchStats();
  }, [courses]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Teacher Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your courses and attendance visibility
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses.length}</div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Attendance Visible
            </CardTitle>
            <Eye className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enabledCount}</div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Attendance Hidden
            </CardTitle>
            <EyeOff className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {hiddenCount}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --- Courses View ---
interface TeacherCoursesProps {
  courses: TeacherCourse[];
  onRefresh: () => void;
  isLoading: boolean;
}

function TeacherCourses({
  courses,
  onRefresh,
  isLoading,
}: TeacherCoursesProps) {
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your Courses</h1>
          <p className="text-muted-foreground">
            Configure attendance settings for each course
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          <RotateCw
            className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")}
          />
          Sync Courses
        </Button>
      </div>

      <div className="grid gap-6">
        {courses.map((course) => (
          <Card
            key={course.id}
            className="overflow-hidden border-border shadow-sm"
          >
            <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-semibold text-lg truncate">
                  {course.name}
                </h3>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mt-1">
                  <span className="truncate max-w-[150px]">
                    {course.section}
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                    {course.id}
                  </span>
                </div>
              </div>
              <Button
                variant={expandedCourse === course.id ? "secondary" : "default"}
                onClick={() =>
                  setExpandedCourse(
                    expandedCourse === course.id ? null : course.id
                  )
                }
                className="shrink-0"
              >
                {expandedCourse === course.id
                  ? "Close Settings"
                  : "Attendance Settings"}
              </Button>
            </div>

            {expandedCourse === course.id && (
              <div className="px-6 pb-6 pt-0 border-t bg-muted/30">
                <TeacherAttendanceSettings courseId={course.id} />
              </div>
            )}
          </Card>
        ))}
        {courses.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No active courses found where you are a teacher.</p>
            <Button variant="ghost" onClick={onRefresh}>
              Try Syncing Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Course Settings Component (CONNECTED) ---
function TeacherAttendanceSettings({ courseId }: { courseId: string }) {
  const { toast } = useToast();
  const [isVisible, setIsVisible] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [emailColumn, setEmailColumn] = useState("A");
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load existing config
  useEffect(() => {
    let mounted = true;
    const loadConfig = async () => {
      setLoading(true);
      const config = await AttendanceService.getCourseConfig(courseId);
      if (mounted && config) {
        setIsVisible(config.isVisible);
        setSheetUrl(config.sheetUrl);
        setEmailColumn(config.emailColumn || "A");
      }
      if (mounted) setLoading(false);
    };
    loadConfig();
    return () => {
      mounted = false;
    };
  }, [courseId]);

  const handleSave = async () => {
    const sheetId = AttendanceService.extractSheetId(sheetUrl);
    if (!sheetId) {
      toast({
        title: "Invalid Google Sheet URL",
        description:
          "Please paste a valid Google Sheets URL (e.g., docs.google.com/spreadsheets/d/...)",
        variant: "destructive",
      });
      return;
    }

    setIsSaved(true); // Optimistic UI
    try {
      await AttendanceService.saveCourseConfig(courseId, {
        sheetUrl,
        passKey: "", // No longer needed, but kept for backward compatibility
        isVisible,
        emailColumn: emailColumn.toUpperCase(),
      });

      toast({
        title: "Settings Saved",
        description: `Attendance is now ${
          isVisible ? "visible" : "hidden"
        } for this course.`,
      });
      setTimeout(() => setIsSaved(false), 2000);
    } catch (e) {
      setIsSaved(false);
      toast({
        title: "Save Failed",
        description: "Could not save settings to database.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        <RotateCw className="w-4 h-4 animate-spin mx-auto mb-2" /> Loading
        settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-6 animate-in slide-in-from-top-2">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-foreground">Attendance Visibility</h4>
          <p className="text-sm text-muted-foreground">
            {isVisible
              ? "Visible to enrolled students"
              : "Hidden from students"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isVisible ? "default" : "secondary"}>
            {isVisible ? "Visible" : "Hidden"}
          </Badge>
          <Switch checked={isVisible} onCheckedChange={setIsVisible} />
        </div>
      </div>

      <div className="grid gap-4 max-w-xl">
        <div className="space-y-2">
          <Label htmlFor={`sheet-${courseId}`}>Google Sheet URL</Label>
          <Input
            id={`sheet-${courseId}`}
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/..."
            className="bg-background"
          />
          <p className="text-xs text-muted-foreground">
            Paste the link to the attendance tracking sheet. Ensure it is shared
            with the service account (or public, if testing).
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`email-col-${courseId}`}>Email Column</Label>
          <Input
            id={`email-col-${courseId}`}
            value={emailColumn}
            onChange={(e) => setEmailColumn(e.target.value.toUpperCase())}
            placeholder="A"
            maxLength={1}
            className="w-20 text-center font-mono uppercase"
          />
          <p className="text-xs text-muted-foreground">
            Column letter where student emails are stored (e.g., A, B, C).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            onClick={handleSave}
            disabled={isSaved}
            className="w-full sm:w-auto"
          >
            {isSaved ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Saved
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- Settings View ---
function TeacherSettings() {
  return (
    <div className="space-y-6 max-w-2xl animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your teacher account preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Configure how you receive alerts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="email-notif">Email Summaries</Label>
            </div>
            <Switch id="email-notif" defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Display</CardTitle>
          <CardDescription>
            Customize your dashboard appearance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-muted-foreground" />
              <Label>Dark Mode</Label>
            </div>
            <div className="text-sm text-muted-foreground">
              Use sidebar toggle
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Main Layout ---
export default function TeacherPage() {
  const { accessToken } = useAuth();
  const [activePage, setPage] = useState("dashboard");
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fetch logic lifted to top level
  async function fetchTeacherCourses() {
    if (!accessToken) return;
    try {
      setLoading(true);
      const res = await fetch(
        "https://classroom.googleapis.com/v1/courses?teacherId=me&courseStates=ACTIVE",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await res.json();
      setCourses(data.courses || []);
    } catch (e) {
      console.error("Failed to fetch courses", e);
    } finally {
      // Artificial delay to show the nice loading screen
      setTimeout(() => setLoading(false), 1500);
    }
  }

  useEffect(() => {
    fetchTeacherCourses();
  }, [accessToken]);

  const handleRefresh = () => {
    fetchTeacherCourses();
  };

  // Full Screen Loading
  if (loading) {
    return (
      <EnhancedLoadingScreen
        message="Preparing Teacher Workspace..."
        tips={TEACHER_TIPS}
      />
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <TeacherSidebar
        activePage={activePage}
        setPage={setPage}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <main className="flex-1 overflow-y-auto w-full">
        <div className="md:hidden flex items-center p-4 border-b bg-background sticky top-0 z-30">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            className="mr-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center">
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="Trace"
              className="w-6 h-6 mr-2"
            />
            <span className="font-bold text-lg tracking-tight">
              Trace Teacher
            </span>
          </div>
        </div>
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
          {activePage === "dashboard" && <TeacherDashboard courses={courses} />}
          {activePage === "courses" && (
            <TeacherCourses
              courses={courses}
              onRefresh={handleRefresh}
              isLoading={loading}
            />
          )}
          {activePage === "settings" && <TeacherSettings />}
        </div>
      </main>
    </div>
  );
}
