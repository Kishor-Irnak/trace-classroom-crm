import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Toggle } from "@/components/ui/toggle";
import { Check, ChevronLeft, Calendar, Loader2, RefreshCw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface CalendarSettings {
  enabled: boolean;
  syncAssignments: boolean;
  syncExams: boolean;
  syncPersonal: boolean;
  connectedAt?: any;
  lastSyncedAt?: any;
}

export default function IntegrationsPage() {
  const [location, setLocation] = useLocation();
  const { user, requestCalendarPermissions } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [settings, setSettings] = useState<CalendarSettings>({
    enabled: false,
    syncAssignments: true,
    syncExams: true,
    syncPersonal: false,
  });

  useEffect(() => {
    if (!user) return;

    // Listen to real-time updates for status
    const unsubscribe = onSnapshot(doc(db, "users", user.uid, "settings", "calendar"), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as CalendarSettings);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const success = await requestCalendarPermissions();
      if (success) {
        // Update settings to enabled
        await setDoc(doc(db, "users", user!.uid, "settings", "calendar"), {
          ...settings,
          enabled: true,
          connectedAt: new Date(),
        }, { merge: true });
        
        toast({
          title: "Connected to Google Calendar",
          description: "Your deadlines will now sync automatically.",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: "Could not authorize Google Calendar access.",
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

  const handleDisconnect = async () => {
     try {
        await setDoc(doc(db, "users", user!.uid, "settings", "calendar"), {
          enabled: false,
        }, { merge: true });
        
        toast({
          title: "Disconnected",
          description: "Calendar sync has been disabled.",
        });
     } catch (error) {
         console.error(error);
     }
  };

  const updateSetting = async (key: keyof CalendarSettings, value: boolean) => {
    // Optimistic update
    setSettings(prev => ({ ...prev, [key]: value }));
    
    try {
      await setDoc(doc(db, "users", user!.uid, "settings", "calendar"), {
        [key]: value
      }, { merge: true });
    } catch (error) {
      console.error(error);
      // Revert on error would be ideal
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/settings")}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
          <p className="text-sm text-muted-foreground">
            Manage external tools and connections
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Google Calendar Integration Card */}
        <Card className={`border-l-4 ${settings.enabled ? "border-l-blue-500" : "border-l-zinc-200 dark:border-l-zinc-800"}`}>
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Calendar className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">Google Calendar</CardTitle>
                {settings.enabled && (
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                    Active
                  </Badge>
                )}
              </div>
              <CardDescription className="max-w-md text-base mt-2 leading-relaxed">
                Automatically sync Google Classroom deadlines and tasks from Trace to your Google Calendar.
              </CardDescription>
            </div>
            
            {settings.enabled ? (
                 <Button variant="outline" size="sm" onClick={handleDisconnect} className="text-muted-foreground hover:text-destructive">
                    Disconnect
                 </Button>
            ) : (
                <Button 
                    onClick={handleConnect} 
                    disabled={isConnecting}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
                >
                    {isConnecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Connect Google Calendar"}
                </Button>
            )}
          </CardHeader>

          {settings.enabled && (
            <CardContent className="pt-6 animate-in slide-in-from-top-4 duration-300 fading-in">
              <Separator className="mb-6" />
              
              <div className="space-y-6">
                <div className="grid gap-4">
                   <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-accent/5 transition-colors">
                     <div className="space-y-0.5">
                       <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                         Assignment Deadlines
                       </label>
                       <p className="text-xs text-muted-foreground">
                         Sync due dates from Google Classroom
                       </p>
                     </div>
                     <Switch 
                        checked={settings.syncAssignments}
                        onCheckedChange={(c) => updateSetting('syncAssignments', c)}
                     />
                   </div>

                   <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-accent/5 transition-colors">
                     <div className="space-y-0.5">
                       <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                         Exams & Major Assessments
                       </label>
                       <p className="text-xs text-muted-foreground">
                         Highlight important dates
                       </p>
                     </div>
                     <Switch 
                        checked={settings.syncExams}
                        onCheckedChange={(c) => updateSetting('syncExams', c)}
                     />
                   </div>

                   <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-accent/5 transition-colors opacity-80">
                     <div className="space-y-0.5">
                       <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                         Personal Tasks
                       </label>
                       <p className="text-xs text-muted-foreground">
                         Sync tasks created manually in Trace
                       </p>
                     </div>
                     <Switch 
                        checked={settings.syncPersonal}
                        onCheckedChange={(c) => updateSetting('syncPersonal', c)}
                     />
                   </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded w-fit">
                    <RefreshCw className="h-3 w-3" />
                    <span>Last synced: {settings.lastSyncedAt ? new Date(settings.lastSyncedAt.seconds * 1000).toLocaleString() : 'Pending...'}</span>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Notifications (Gmail) Integration Card */}
        <NotificationsIntegrationCard />
      </div>
    </div>
  );
}

// Separate component for Notifications to keep things clean
function NotificationsIntegrationCard() {
  const { user, requestGmailPermissions } = useAuth();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [settings, setSettings] = useState<{
    enabled: boolean;
    notifyOverdue: boolean;
    notifyDueSoon: boolean;
  }>({
    enabled: false,
    notifyOverdue: true,
    notifyDueSoon: true,
  });

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, "users", user.uid, "settings", "notifications"), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as any);
      }
    });
    return () => unsubscribe();
  }, [user]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const success = await requestGmailPermissions();
      if (success) {
        await setDoc(doc(db, "users", user!.uid, "settings", "notifications"), {
          ...settings,
          enabled: true,
          connectedAt: new Date(),
        }, { merge: true });
        
        toast({
          title: "Connected to Gmail",
          description: "You will now receive email notifications for important updates.",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: "Could not authorize Gmail access.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await setDoc(doc(db, "users", user!.uid, "settings", "notifications"), {
        enabled: false,
      }, { merge: true });
      toast({ title: "Disconnected", description: "Email notifications disabled." });
    } catch (error) { console.error(error); }
  };

  const updateSetting = async (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    try {
      await setDoc(doc(db, "users", user!.uid, "settings", "notifications"), { [key]: value }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };



  return (
    <Card className={`border-l-4 ${settings.enabled ? "border-l-orange-500" : "border-l-zinc-200 dark:border-l-zinc-800"}`}>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
               {/* Icon handled by import */}
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mail h-6 w-6"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            </div>
            <CardTitle className="text-xl">Email Notifications</CardTitle>
            {settings.enabled && (
              <Badge variant="secondary" className="bg-orange-50 text-orange-700 hover:bg-orange-50 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-800">
                Active
              </Badge>
            )}
          </div>
          <CardDescription className="max-w-md text-base mt-2 leading-relaxed">
            Get automated email summaries for upcoming deadlines and overdue assignments directly to your Gmail.
          </CardDescription>
        </div>
        
        {settings.enabled ? (
             <Button variant="outline" size="sm" onClick={handleDisconnect} className="text-muted-foreground hover:text-destructive">
                Disconnect
             </Button>
        ) : (
            <Button 
                onClick={handleConnect} 
                disabled={isConnecting}
                className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm transition-all"
            >
                {isConnecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Enable Notifications"}
            </Button>
        )}
      </CardHeader>

      {settings.enabled && (
        <CardContent className="pt-6 animate-in slide-in-from-top-4 duration-300 fading-in">
          <Separator className="mb-6" />
          
          <div className="space-y-4">
               <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-accent/5 transition-colors">
                 <div className="space-y-0.5">
                   <label className="text-sm font-medium leading-none">Overdue Alerts</label>
                   <p className="text-xs text-muted-foreground">Notify me when assignments follow behind</p>
                 </div>
                 <Switch checked={settings.notifyOverdue} onCheckedChange={(c) => updateSetting('notifyOverdue', c)} />
               </div>

               <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-accent/5 transition-colors">
                 <div className="space-y-0.5">
                   <label className="text-sm font-medium leading-none">Daily Digest</label>
                   <p className="text-xs text-muted-foreground">Send a summary of tasks due soon</p>
                 </div>
                 <Switch checked={settings.notifyDueSoon} onCheckedChange={(c) => updateSetting('notifyDueSoon', c)} />
               </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
