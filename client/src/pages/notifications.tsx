import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  Mail,
  AlertTriangle,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function NotificationsPage() {
  const { user, requestGmailPermissions, accessToken } = useAuth();
  const { toast } = useToast();

  // State for alerts
  const [enabled, setEnabled] = useState(false);
  const [config, setConfig] = useState({
    dueReminder: true,
    missedSubmission: true,
    workloadWarning: false,
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load state from Firestore
  useEffect(() => {
    async function loadSettings() {
      if (!user) return;
      try {
        const docRef = doc(db, "users", user.uid, "settings", "notifications");
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          setEnabled(data.enabled ?? false);
          setConfig(
            data.config || {
              dueReminder: true,
              missedSubmission: true,
              workloadWarning: false,
            }
          );
        }
      } catch (e) {
        console.error("Failed to load settings from Firestore", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, [user]);

  // Save state to Firestore
  useEffect(() => {
    async function saveSettings() {
      if (!user || isLoading) return; // Don't save initial state over valid data
      try {
        const docRef = doc(db, "users", user.uid, "settings", "notifications");
        await setDoc(
          docRef,
          {
            enabled,
            config,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (e) {
        console.error("Failed to save settings", e);
      }
    }
    const timer = setTimeout(saveSettings, 1000); // Debounce save
    return () => clearTimeout(timer);
  }, [enabled, config, user, isLoading]);

  const handleEnableClick = async () => {
    setIsConnecting(true);
    try {
      const success = await requestGmailPermissions();
      if (success) {
        setEnabled(true);
        toast({
          title: "Email alerts enabled",
          description: "Trace can now send you academic reminders.",
        });
      } else {
        toast({
          title: "Connection failed",
          description: "Could not connect to Gmail. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const toggleConfig = (key: keyof typeof config) => {
    setConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage how Trace notifies you about academic activity
          </p>
        </div>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Academic Email Alerts
          </CardTitle>
          <CardDescription className="max-w-lg mt-2 leading-relaxed">
            Trace can send you helpful academic reminders directly to your
            connected Gmail account ({user?.email}).
          </CardDescription>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">
                Assignment due reminder
              </Label>
              <p className="text-sm text-muted-foreground">
                Get an email 24 hours before an assignment is due
              </p>
            </div>
            <Switch
              checked={config.dueReminder}
              onCheckedChange={() => toggleConfig("dueReminder")}
              disabled={!enabled}
              className="data-[state=checked]:bg-blue-600"
            />
          </div>

          <Separator className="opacity-50" />

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">
                Missed submission alert
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive a notification immediately when a deadline is missed
              </p>
            </div>
            <Switch
              checked={config.missedSubmission}
              onCheckedChange={() => toggleConfig("missedSubmission")}
              disabled={!enabled}
              className="data-[state=checked]:bg-blue-600"
            />
          </div>

          <Separator className="opacity-50" />

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">
                Heavy workload warning
              </Label>
              <p className="text-sm text-muted-foreground">
                Be notified when you have more than 3 assignments due in a week
              </p>
            </div>
            <Switch
              checked={config.workloadWarning}
              onCheckedChange={() => toggleConfig("workloadWarning")}
              disabled={!enabled}
              className="data-[state=checked]:bg-blue-600"
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col items-start gap-4 pt-2 pb-6 bg-muted/20 border-t">
          {!enabled ? (
            <div className="w-full space-y-4">
              <div className="flex gap-3 p-3 text-sm text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/10 rounded border border-amber-200 dark:border-amber-800/30 items-start">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  Alerts are currently disabled. You need to grant Trace
                  permission to send emails on your behalf.
                </p>
              </div>
              <Button
                onClick={handleEnableClick}
                disabled={isConnecting}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isConnecting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Connect Gmail & Enable Alerts
              </Button>
            </div>
          ) : (
            <div className="w-full space-y-4">
              <div className="flex gap-3 p-3 text-sm text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 rounded border border-emerald-200 dark:border-emerald-800/30 items-center">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <p>Academic alerts are active.</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setEnabled(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                Disable Alerts
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Emails are sent only after your consent and can be disabled anytime.
            We do not read your inbox.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
