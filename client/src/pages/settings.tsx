import { useState } from "react";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  LogOut,
  Trash2,
  RefreshCw,
  Download,
  Smartphone,
  Moon,
  Sun,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { useClassroom } from "@/lib/classroom-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { useTheme } from "@/lib/theme-context";

function SettingsSkeleton() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48 mt-1" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { lastSyncedAt, isSyncing, syncClassroom, isLoading } = useClassroom();
  const { isInstallable, isInstalled, promptInstall } = useInstallPrompt();
  const { theme, setTheme } = useTheme();
  const [backgroundSync, setBackgroundSync] = useState(true);
  const [timezone, setTimezone] = useState("auto");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  if (isLoading) {
    return <SettingsSkeleton />;
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    await signOut();
    setIsDeleting(false);
  };

  const initials =
    user?.displayName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ||
    user?.email?.[0].toUpperCase() ||
    "U";

  const formatLastSync = () => {
    if (!lastSyncedAt) return "Never";
    return lastSyncedAt.toLocaleString();
  };

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      await promptInstall();
    } catch (error) {
      console.error("Install failed:", error);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connected Account</CardTitle>
          <CardDescription>
            Your Google account linked to this app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage
                src={user?.photoURL || undefined}
                alt={user?.displayName || "User"}
              />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user?.displayName}</p>
              <p className="text-sm text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="h-3.5 w-3.5" />
              Connected
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Google Classroom</p>
              <p className="text-xs text-muted-foreground">
                Last synced: {formatLastSync()}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={syncClassroom}
              disabled={isSyncing}
              data-testid="button-sync-settings"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`}
              />
              {isSyncing ? "Syncing..." : "Sync Now"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sync Settings</CardTitle>
          <CardDescription>
            Configure how your data syncs with Google Classroom
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="background-sync" className="text-sm font-medium">
                Background Sync
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatically refresh assignment data periodically
              </p>
            </div>
            <Switch
              id="background-sync"
              checked={backgroundSync}
              onCheckedChange={setBackgroundSync}
              data-testid="switch-background-sync"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Theme</CardTitle>
          <CardDescription>Choose your preferred color theme</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="theme" className="text-sm font-medium">
                Appearance
              </Label>
              <p className="text-xs text-muted-foreground">
                Select light or dark mode
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("light")}
                className="flex items-center gap-2"
              >
                <Sun className="h-4 w-4" />
                Light
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("dark")}
                className="flex items-center gap-2"
              >
                <Moon className="h-4 w-4" />
                Dark
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4" />
            Install App
          </CardTitle>
          <CardDescription>
            Install this app on your device for quick access - works on phones
            and desktops
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isInstalled ? (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <Check className="h-5 w-5 text-emerald-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                  App Installed
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  This app is installed on your device. You can access it from
                  your home screen.
                </p>
              </div>
            </div>
          ) : isInstallable ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <Smartphone className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Install Available</p>
                  <p className="text-xs text-muted-foreground">
                    Click the button below to install this app on your device
                    for a better experience.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleInstall}
                disabled={isInstalling}
                className="w-full"
                size="lg"
                data-testid="button-install-app"
              >
                <Download className="h-4 w-4 mr-2" />
                {isInstalling ? "Installing..." : "Install App"}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                After installation, you can access the app from your home screen
                or app drawer
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Install Not Available</p>
                  <p className="text-xs text-muted-foreground">
                    {typeof window !== "undefined" &&
                    window.matchMedia("(display-mode: standalone)").matches
                      ? "This app is already installed."
                      : "Installation prompt will appear when the app meets PWA requirements. Make sure you're using Chrome, Edge, or Safari on a supported device."}
                  </p>
                </div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium mb-2">Manual Installation:</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>
                    <strong>Chrome/Edge:</strong> Click the install icon in the
                    address bar
                  </li>
                  <li>
                    <strong>iOS Safari:</strong> Tap Share → Add to Home Screen
                  </li>
                  <li>
                    <strong>Android Chrome:</strong> Tap Menu → Install App
                  </li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferences</CardTitle>
          <CardDescription>Customize your experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="timezone" className="text-sm font-medium">
                Time Zone
              </Label>
              <p className="text-xs text-muted-foreground">
                Used for displaying due dates and deadlines
              </p>
            </div>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger
                className="w-[180px]"
                data-testid="select-timezone"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-detect</SelectItem>
                <SelectItem value="America/New_York">Eastern Time</SelectItem>
                <SelectItem value="America/Chicago">Central Time</SelectItem>
                <SelectItem value="America/Denver">Mountain Time</SelectItem>
                <SelectItem value="America/Los_Angeles">
                  Pacific Time
                </SelectItem>
                <SelectItem value="Europe/London">London</SelectItem>
                <SelectItem value="Europe/Paris">Paris</SelectItem>
                <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-base text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that affect your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Sign Out</p>
              <p className="text-xs text-muted-foreground">
                Sign out of your account on this device
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              data-testid="button-signout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Delete Account</p>
              <p className="text-xs text-muted-foreground">
                Permanently delete your account and all data
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  data-testid="button-delete-account"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    your account and remove all your data including notes,
                    settings, and cached assignments.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid="button-confirm-delete"
                  >
                    {isDeleting ? "Deleting..." : "Delete Account"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
