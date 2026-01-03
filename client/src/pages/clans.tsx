import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  orderBy,
  limit,
  getDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
} from "firebase/firestore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Trophy,
  Swords,
  Crown,
  LogOut,
  Copy,
  UserPlus,
  Loader2,
  Target,
  Globe,
  Settings,
  X,
  Shield,
  Zap,
  Flame,
  Star,
  BookOpen,
  Rocket,
  Ghost,
  Gem,
  CalendarCheck,
  School,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const CLAN_ICONS = [
  {
    id: "swords",
    icon: Swords,
    label: "Warrior",
    color: "text-red-500",
    gradient: "bg-gradient-to-r from-red-600 to-orange-600",
  },
  {
    id: "shield",
    icon: Shield,
    label: "Guardian",
    color: "text-blue-500",
    gradient: "bg-gradient-to-r from-blue-600 to-cyan-600",
  },
  {
    id: "zap",
    icon: Zap,
    label: "Speed",
    color: "text-yellow-500",
    gradient: "bg-gradient-to-r from-yellow-500 to-amber-600",
  },
  {
    id: "crown",
    icon: Crown,
    label: "Royal",
    color: "text-purple-500",
    gradient: "bg-gradient-to-r from-purple-600 to-indigo-600",
  },
  {
    id: "flame",
    icon: Flame,
    label: "Power",
    color: "text-orange-500",
    gradient: "bg-gradient-to-r from-orange-600 to-red-600",
  },
  {
    id: "rocket",
    icon: Rocket,
    label: "Launch",
    color: "text-cyan-500",
    gradient: "bg-gradient-to-r from-cyan-600 to-blue-600",
  },
  {
    id: "star",
    icon: Star,
    label: "Legend",
    color: "text-indigo-500",
    gradient: "bg-gradient-to-r from-indigo-600 to-purple-600",
  },
  {
    id: "target",
    icon: Target,
    label: "Focus",
    color: "text-emerald-500",
    gradient: "bg-gradient-to-r from-emerald-600 to-green-600",
  },
  {
    id: "book",
    icon: BookOpen,
    label: "Scholar",
    color: "text-pink-500",
    gradient: "bg-gradient-to-r from-pink-600 to-rose-600",
  },
  {
    id: "ghost",
    icon: Ghost,
    label: "Phantom",
    color: "text-slate-400",
    gradient: "bg-gradient-to-r from-slate-700 to-gray-800",
  },
];

interface Clan {
  id: string;
  name: string;
  tag: string;
  description: string;
  leaderId: string;
  members: string[]; // Array of UIDs
  totalXP: number;
  averageAttendance: number;
  bannerColor: string;
  isPublic: boolean;
  createdAt: any;
}

interface ClanMember {
  uid: string;
  displayName: string;
  photoUrl: string;
  currentXP: number;
  role: "leader" | "member";
}

export default function ClansPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [currentView, setCurrentView] = useState<"leaderboard" | "my-clan">(
    "leaderboard"
  );

  const [myClan, setMyClan] = useState<Clan | null>(null);
  const [membersData, setMembersData] = useState<ClanMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [topClans, setTopClans] = useState<Clan[]>([]);

  // Create Clan Form
  const [createName, setCreateName] = useState("");
  const [createTag, setCreateTag] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateHelp, setShowCreateHelp] = useState(true);

  // Join Clan Form
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  // Edit Clan Form
  const [editName, setEditName] = useState("");
  const [editTag, setEditTag] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Leaderboard Filtering
  const [viewMode, setViewMode] = useState<"class" | "college">("class");
  const [showCollegeWarning, setShowCollegeWarning] = useState(true);

  // View Clan Details
  const [selectedClan, setSelectedClan] = useState<Clan | null>(null);
  const [selectedClanMembers, setSelectedClanMembers] = useState<ClanMember[]>(
    []
  );
  const [viewClanDialogOpen, setViewClanDialogOpen] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [clanMemberProfiles, setClanMemberProfiles] = useState<
    Record<string, ClanMember[]>
  >({});

  const fetchClanMembersDetails = async (memberIds: string[]) => {
    setLoadingMembers(true);
    try {
      if (memberIds.length === 0) {
        setSelectedClanMembers([]);
        setLoadingMembers(false);
        return;
      }
      const q = query(
        collection(db, "leaderboards"),
        where("uid", "in", memberIds)
      );
      const snapshot = await getDocs(q);
      const members = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          uid: data.uid,
          displayName: data.displayName || "Unknown",
          photoUrl: data.photoURL || "",
          currentXP: data.currentXP || 0,
          role: "member",
        } as ClanMember;
      });
      members.sort((a, b) => b.currentXP - a.currentXP);
      setSelectedClanMembers(members);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleClanClick = (clan: Clan) => {
    if (myClan && clan.id === myClan.id) {
      setCurrentView("my-clan");
    } else {
      setSelectedClan(clan);
      setViewClanDialogOpen(true);
      fetchClanMembersDetails(clan.members);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchUserClan();
    fetchTopClans();
  }, [user]);

  const fetchUserClan = async () => {
    try {
      setLoading(true);
      const clansRef = collection(db, "study_squads");
      const q = query(clansRef, where("members", "array-contains", user!.uid));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const clanDoc = snapshot.docs[0];
        const clanData = { id: clanDoc.id, ...clanDoc.data() } as Clan;
        setMyClan(clanData);
        // Pre-fill edit form
        setEditName(clanData.name);
        setEditTag(clanData.tag);
        setEditDesc(clanData.description);

        await fetchMembersDetails(
          clanData.members,
          clanData.leaderId,
          clanDoc.id
        );
      } else {
        setMyClan(null);
      }
    } catch (error) {
      console.error("Error fetching clan:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembersDetails = async (
    memberIds: string[],
    leaderId: string,
    clanId: string
  ) => {
    const details: ClanMember[] = [];
    let clanTotalXP = 0;

    for (const memberId of memberIds) {
      const studentRef = doc(
        db,
        "leaderboards",
        "all-courses",
        "students",
        memberId
      );
      const studentSnap = await getDoc(studentRef);

      let memberXP = 0;
      let memberName = "Unknown";
      let memberPhoto = "";

      if (studentSnap.exists()) {
        const data = studentSnap.data();
        memberXP = data.totalXP || data.xp || 0;
        memberName = data.displayName || data.name || "Unknown";
        memberPhoto = data.photoUrl || data.avatar || "";
      } else {
        if (memberId === user?.uid) {
          memberName = user?.displayName || "Me";
          memberPhoto = user?.photoURL || "";
        }
      }

      clanTotalXP += memberXP;
      details.push({
        uid: memberId,
        displayName: memberName,
        photoUrl: memberPhoto,
        currentXP: memberXP,
        role: memberId === leaderId ? "leader" : "member",
      });
    }

    details.sort((a, b) => b.currentXP - a.currentXP);
    setMembersData(details);

    const clanRef = doc(db, "study_squads", clanId);
    updateDoc(clanRef, { totalXP: clanTotalXP }).catch(console.error);
  };

  const fetchTopClans = async () => {
    try {
      const clansRef = collection(db, "study_squads");
      const q = query(clansRef, orderBy("totalXP", "desc"), limit(20));
      const snapshot = await getDocs(q);
      const clans = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as Clan)
      );
      setTopClans(clans);

      // Collect all member IDs
      const allMemberIds = new Set<string>();
      clans.forEach((c) => c.members.forEach((m) => allMemberIds.add(m)));
      const uniqueIds = Array.from(allMemberIds);

      if (uniqueIds.length === 0) return;

      // Fetch member details in chunks
      const memberDetailsMap: Record<string, ClanMember> = {};
      const chunks = [];
      for (let i = 0; i < uniqueIds.length; i += 10) {
        chunks.push(uniqueIds.slice(i, i + 10));
      }

      await Promise.all(
        chunks.map(async (chunkIds) => {
          const qMembers = query(
            collection(db, "leaderboards", "all-courses", "students"),
            where("uid", "in", chunkIds)
          );
          const snap = await getDocs(qMembers);
          snap.forEach((doc) => {
            const d = doc.data();
            memberDetailsMap[d.uid] = {
              uid: d.uid,
              displayName: d.displayName || "Unknown",
              photoUrl: d.photoURL || "",
              currentXP: d.totalXP || d.currentXP || 0,
              role: "member",
            } as ClanMember;
          });
        })
      );

      // Now build the map keyed by Clan ID
      const profilesByClan: Record<string, ClanMember[]> = {};
      clans.forEach((clan) => {
        profilesByClan[clan.id] = clan.members
          .map((mid) => {
            let profile = memberDetailsMap[mid];
            // Fallback for current user if their leaderboard doc isn't found/indexed yet
            if (!profile && mid === user?.uid) {
              profile = {
                uid: user.uid,
                displayName: user.displayName || "Me",
                photoUrl: user.photoURL || "",
                currentXP: 0,
                role: "member",
              } as ClanMember;
            }
            return profile;
          })
          .filter(Boolean);
        profilesByClan[clan.id].sort((a, b) => b.currentXP - a.currentXP);
      });

      setClanMemberProfiles(profilesByClan);
    } catch (error) {
      console.error("Error fetching top clans:", error);
    }
  };

  const handleCreateClan = async () => {
    if (!createName || !createTag) return;
    setIsCreating(true);
    try {
      const newClan = {
        name: createName,
        tag: createTag, // No uppercase, use ID
        description: createDesc || "We study hard!",
        leaderId: user!.uid,
        members: [user!.uid],
        totalXP: 0,
        averageAttendance: 0,
        bannerColor: "bg-blue-600",
        isPublic: true,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "study_squads"), newClan);
      toast({
        title: "Clan Created!",
        description: `You are now the leader of ${createName}`,
      });

      fetchUserClan();
      setCurrentView("my-clan");
    } catch (error: any) {
      console.error("Create clan error:", error);

      if (error.code === "permission-denied") {
        toast({
          title: "Permission Denied",
          description:
            "Security Rules Error: Update Firestore Rules to allow 'study_squads'.",
          variant: "destructive",
        });
      } else {
        const isBlocked =
          error.message?.includes("BLOCKED") || error.code === "unavailable";

        toast({
          title: isBlocked ? "Connection Blocked" : "Error",
          description: isBlocked
            ? "Your browser or an extension is blocking the database. Please disable it for this site."
            : "Failed to create clan. Try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinClan = async (code?: string) => {
    const codeToUse = code || joinCode;
    if (!codeToUse) return;
    setIsJoining(true);
    try {
      const clanRef = doc(db, "study_squads", codeToUse);
      const clanSnap = await getDoc(clanRef);

      if (!clanSnap.exists()) {
        toast({
          title: "Error",
          description: "Clan not found",
          variant: "destructive",
        });
        return;
      }

      const data = clanSnap.data();
      if (data.members.length >= 5) {
        toast({
          title: "Clan Full",
          description: "This clan already has 5 members.",
          variant: "destructive",
        });
        return;
      }

      if (data.members.includes(user!.uid)) {
        toast({
          title: "Already a Member",
          description: "You are already in this clan.",
        });
        return;
      }

      await updateDoc(clanRef, {
        members: arrayUnion(user!.uid),
      });

      toast({ title: "Welcome!", description: `You joined ${data.name}` });
      await fetchUserClan();
      setJoinCode("");
      setCurrentView("my-clan");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to join clan.",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveClan = async () => {
    if (!myClan) return;
    if (
      confirm(
        "Are you sure you want to leave this clan? " +
          (myClan.members.length === 1
            ? "Since you are the last member, the clan will be deleted."
            : "")
      )
    ) {
      try {
        const clanRef = doc(db, "study_squads", myClan.id);

        if (myClan.members.length <= 1) {
          // User is the last member (or something weird happened), delete the clan
          await deleteDoc(clanRef);
          toast({
            title: "Squad Disbanded",
            description: "The squad has been deleted.",
          });
        } else {
          // There are other members
          const updates: any = {
            members: arrayRemove(user!.uid),
          };

          // If I was the leader, assign the next senior member (first in array) as leader
          if (myClan.leaderId === user!.uid) {
            const remainingMembers = myClan.members.filter(
              (id) => id !== user!.uid
            );
            if (remainingMembers.length > 0) {
              updates.leaderId = remainingMembers[0];
            }
          }

          await updateDoc(clanRef, updates);
          toast({
            title: "Left Squad",
            description: "You have left the squad.",
          });
        }

        setMyClan(null);
        setMembersData([]);
        setCurrentView("leaderboard");
        fetchTopClans(); // Refresh leaderboard to remove the deleted clan or update counts
      } catch (error) {
        console.error(error);
        toast({
          title: "Error",
          description: "Failed to leave squad.",
          variant: "destructive",
        });
      }
    }
  };

  const handleUpdateClan = async () => {
    if (!myClan || !editName || !editTag) return;
    setIsEditing(true);
    try {
      const clanRef = doc(db, "study_squads", myClan.id);
      await updateDoc(clanRef, {
        name: editName,
        tag: editTag, // No uppercase
        description: editDesc,
      });

      setMyClan((prev) =>
        prev
          ? { ...prev, name: editName, tag: editTag, description: editDesc }
          : null
      );
      toast({
        title: "Clan Updated",
        description: "Your clan settings have been saved.",
      });
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast({
        title: "Update Failed",
        description: "Could not update clan details.",
        variant: "destructive",
      });
    } finally {
      setIsEditing(false);
    }
  };

  // Helper to render icon
  const getClanIcon = (iconId: string) => {
    const iconDef = CLAN_ICONS.find((i) => i.id === iconId) || CLAN_ICONS[0];
    const Icon = iconDef.icon;
    return <Icon className="h-4 w-4" />;
  };

  if (loading && !myClan) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      <div className="border-b px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-background/95 backdrop-blur z-20 shrink-0 transition-all">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <h1 className="text-2xl font-bold tracking-tight hidden md:block">
            Clans
          </h1>
          {/* Toggle Switch */}
          <div className="flex bg-muted p-1 rounded-lg shrink-0 w-full md:w-auto grid grid-cols-2 md:flex">
            <button
              onClick={() => setCurrentView("leaderboard")}
              className={cn(
                "px-3 py-1.5 md:py-1 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-2",
                currentView === "leaderboard"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Globe className="h-3.5 w-3.5" />
              Leaderboard
            </button>
            <button
              onClick={() => setCurrentView("my-clan")}
              className={cn(
                "px-3 py-1.5 md:py-1 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-2",
                currentView === "my-clan"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Swords className="h-3.5 w-3.5" />
              My Squad
              {myClan && (
                <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary/50" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20">
        {currentView === "leaderboard" ? (
          // LEADERBOARD VIEW INLINE
          <div className="max-w-5xl mx-auto w-full space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Header + Filter + Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Top Study Squads
                </h2>
                <p className="text-sm text-muted-foreground">
                  Competed based on Total XP.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <Select
                  value={viewMode}
                  onValueChange={(value: "class" | "college") =>
                    setViewMode(value)
                  }
                >
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Select View" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="class">My Class</SelectItem>
                    <SelectItem value="college">This College</SelectItem>
                  </SelectContent>
                </Select>

                {!myClan && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter ID..."
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      className="bg-background w-32 h-9"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleJoinClan(joinCode)}
                      disabled={isJoining || !joinCode}
                    >
                      {isJoining ? (
                        <Loader2 className="animate-spin h-3 w-3" />
                      ) : (
                        "Join"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {viewMode === "college" && showCollegeWarning && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex gap-3 text-yellow-600 dark:text-yellow-400 text-sm animate-in fade-in slide-in-from-top-2">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <div className="space-y-1">
                  <div className="flex items-start justify-between">
                    <p className="font-medium">Entertainment Purpose Only</p>
                    <button
                      onClick={() => setShowCollegeWarning(false)}
                      className="text-yellow-600/50 hover:text-yellow-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs opacity-90 leading-relaxed">
                    This leaderboard includes all squads from your college. Note
                    that students in different years or branches may have
                    different workloads and assignment counts, so this
                    comparison is not academically fair. It's just for fun!
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {topClans.map((clan, i) => {
                const isMyClan = myClan?.id === clan.id;
                const isFull = clan.members.length >= 5;
                const members = clanMemberProfiles[clan.id] || [];
                const iconDef =
                  CLAN_ICONS.find((icon) => icon.id === clan.tag) ||
                  CLAN_ICONS[0];
                const ClanIcon = iconDef.icon;

                return (
                  <div
                    key={clan.id}
                    onClick={() => handleClanClick(clan)}
                    className={cn(
                      "relative flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-xl transition-all cursor-pointer gap-4 md:gap-0",
                      isMyClan
                        ? "bg-primary/5 border-primary/20"
                        : "bg-card hover:border-primary/50"
                    )}
                  >
                    {/* Member Count - Top Right */}
                    <div className="absolute top-3 right-3 flex items-center text-xs text-muted-foreground gap-1 bg-background/50 backdrop-blur-sm p-1.5 rounded-md border shadow-sm z-10">
                      <Users className="h-3 w-3" />
                      {clan.members.length}/5
                    </div>

                    <div className="flex items-center gap-4 md:flex-1">
                      <div
                        className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                          i < 3
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-500"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold flex items-center gap-2">
                          <div
                            className={cn(
                              "p-2 rounded-lg mr-2 shadow-sm text-white shrink-0",
                              iconDef.gradient || "bg-primary"
                            )}
                          >
                            <ClanIcon className="h-4 w-4" />
                          </div>
                          <span className="truncate">{clan.name}</span>
                          {isMyClan && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] shrink-0"
                            >
                              Your Clan
                            </Badge>
                          )}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px] md:max-w-md">
                          {clan.description}
                        </p>
                      </div>
                    </div>

                    {/* Stats (Avatars + XP) - Centered on desktop (via margins or flex) */}
                    {/* Added md:mx-auto to center it and md:mr-16 to avoid overlapping absolute count */}
                    <div className="flex items-center gap-4 mt-2 md:mt-0 md:mx-auto md:mr-20">
                      <div className="flex -space-x-3">
                        {members.slice(0, 5).map((m) => (
                          <div key={m.uid} className="relative group/avatar">
                            <Avatar className="h-8 w-8 md:h-10 md:w-10 border-2 border-background ring-1 ring-border cursor-help transition-transform hover:scale-110 hover:z-20">
                              <AvatarImage src={m.photoUrl} />
                              <AvatarFallback className="text-[10px] md:text-xs">
                                {m.displayName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover/avatar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                              {m.displayName}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="text-right">
                        <div className="text-sm md:text-base font-bold text-foreground/80">
                          {clan.totalXP.toLocaleString()}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            XP
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {topClans.length === 0 && (
                <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                  No active clans found. Be the first to create one!
                </div>
              )}
            </div>
          </div>
        ) : (
          // MY CLAN VIEW INLINE
          <>
            {!myClan ? (
              // CREATE VIEW (Increased max-w to 4xl for more space)
              <div className="max-w-4xl mx-auto w-full py-10 space-y-6 animate-in fade-in zoom-in-95 duration-500">
                {showCreateHelp && (
                  <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-primary/5 to-transparent rounded-xl border border-primary/10 p-5 flex flex-col sm:flex-row gap-5 shadow-sm">
                    <div className="absolute top-0 right-0 p-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowCreateHelp(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <Swords className="h-6 w-6 text-primary" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-bold text-lg">
                        Create Your Study Squad
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                        Squad up with friends to track progress together,
                        compete on the leaderboard, and keep each other
                        accountable.
                      </p>
                    </div>
                  </div>
                )}

                <Card className="border-2 border-primary/10 shadow-lg">
                  <CardHeader>
                    <CardTitle>Squad Details</CardTitle>
                    <CardDescription>
                      Start a new journey with up to 4 other friends.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Squad Name</Label>
                        <Input
                          placeholder="e.g. Night Owls"
                          value={createName}
                          onChange={(e) => setCreateName(e.target.value)}
                          maxLength={20}
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label>Choose Squad Badge</Label>
                      <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                        {CLAN_ICONS.map((item) => {
                          const Icon = item.icon;
                          const isSelected = createTag === item.id;
                          return (
                            <div
                              key={item.id}
                              onClick={() => setCreateTag(item.id)}
                              className={cn(
                                "aspect-square rounded-md border-2 flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-all",
                                isSelected
                                  ? "border-primary bg-primary/5"
                                  : "border-transparent bg-muted/50"
                              )}
                            >
                              <Icon
                                className={cn(
                                  "h-6 w-6 mb-1",
                                  isSelected
                                    ? item.color
                                    : "text-muted-foreground"
                                )}
                              />
                              <span className="text-[10px] font-medium text-muted-foreground">
                                {item.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Motto (Max 20 chars)</Label>
                      <Input
                        placeholder="We never sleep..."
                        value={createDesc}
                        onChange={(e) => setCreateDesc(e.target.value)}
                        maxLength={20}
                      />
                      <div className="text-xs text-right text-muted-foreground">
                        {createDesc.length}/20
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleCreateClan}
                      disabled={isCreating || !createName || !createTag}
                    >
                      {isCreating ? (
                        <Loader2 className="animate-spin mr-2" />
                      ) : (
                        <Swords className="mr-2 h-4 w-4" />
                      )}
                      Form Squad
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              // DASHBOARD VIEW
              <div className="max-w-7xl mx-auto w-full space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                {/* Banner */}
                {(() => {
                  const iconDef =
                    CLAN_ICONS.find((i) => i.id === myClan.tag) ||
                    CLAN_ICONS[0];
                  const BannerIcon = iconDef.icon;
                  const bannerGradient =
                    iconDef.gradient ||
                    "bg-gradient-to-r from-blue-600 to-indigo-700";

                  return (
                    <>
                      <div
                        className={`relative rounded-xl overflow-hidden ${bannerGradient} p-4 md:p-8 text-white shadow-lg`}
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-20">
                          <BannerIcon className="h-32 w-32" />
                        </div>

                        <div className="relative z-10">
                          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 bg-white/20 rounded flex items-center justify-center backdrop-blur-sm">
                                  {getClanIcon(myClan.tag)}
                                </div>
                                {myClan.leaderId === user?.uid && (
                                  <Dialog
                                    open={isEditDialogOpen}
                                    onOpenChange={setIsEditDialogOpen}
                                  >
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-white/50 hover:text-white hover:bg-white/20"
                                      >
                                        <Settings className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>
                                          Edit Clan Details
                                        </DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                          <Label>Name</Label>
                                          <Input
                                            value={editName}
                                            onChange={(e) =>
                                              setEditName(e.target.value)
                                            }
                                          />
                                        </div>
                                        <div className="space-y-3">
                                          <Label>Badge</Label>
                                          <div className="grid grid-cols-5 gap-2">
                                            {CLAN_ICONS.map((item) => {
                                              const Icon = item.icon;
                                              const isSelected =
                                                editTag === item.id;
                                              return (
                                                <div
                                                  key={item.id}
                                                  onClick={() =>
                                                    setEditTag(item.id)
                                                  }
                                                  className={cn(
                                                    "aspect-square rounded-md border-2 flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-all",
                                                    isSelected
                                                      ? "border-primary bg-primary/5"
                                                      : "border-transparent bg-muted/50"
                                                  )}
                                                >
                                                  <Icon
                                                    className={cn(
                                                      "h-5 w-5 mb-1",
                                                      isSelected
                                                        ? item.color
                                                        : "text-foreground"
                                                    )}
                                                  />
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                        <div className="space-y-2">
                                          <Label>
                                            Description (Max 20 chars)
                                          </Label>
                                          <Input
                                            value={editDesc}
                                            onChange={(e) =>
                                              setEditDesc(e.target.value)
                                            }
                                            maxLength={20}
                                          />
                                        </div>
                                      </div>
                                      <DialogFooter>
                                        <Button
                                          variant="outline"
                                          onClick={() =>
                                            setIsEditDialogOpen(false)
                                          }
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          onClick={handleUpdateClan}
                                          disabled={isEditing}
                                        >
                                          Save Changes
                                        </Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                )}
                              </div>
                              <h2 className="text-xl md:text-3xl font-black tracking-tight">
                                {myClan.name}
                              </h2>
                              <p className="text-blue-100 italic max-w-lg">
                                {myClan.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-3 mt-8">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-white border-white/40 hover:bg-white/10 hover:text-white"
                              onClick={() => {
                                navigator.clipboard.writeText(myClan.id);
                                toast({
                                  title: "Copied!",
                                  description: "Clan ID copied to clipboard.",
                                });
                              }}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Clan ID
                            </Button>
                            {myClan.leaderId === user?.uid && (
                              <Badge
                                variant="outline"
                                className="text-white border-white/40 h-9 px-3"
                              >
                                <Crown className="h-3 w-3 mr-1" />
                                Leader
                              </Badge>
                            )}
                          </div>

                          <div className="absolute bottom-0 right-0 text-right p-3 md:p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10 origin-bottom-right transform scale-75 md:scale-100">
                            <div className="text-3xl font-mono font-bold tracking-tighter">
                              {myClan.totalXP.toLocaleString()}
                            </div>
                            <div className="text-xs text-blue-200 font-medium tracking-widest uppercase">
                              Total XP
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="md:col-span-2 border shadow-sm">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Users className="h-5 w-5" />
                              Squad Members
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {membersData.map((m, i) => (
                                <div
                                  key={m.uid}
                                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="font-mono text-muted-foreground w-6 text-center text-sm font-bold">
                                      {i + 1}
                                    </div>
                                    <Avatar className="h-9 w-9 border">
                                      <AvatarImage src={m.photoUrl} />
                                      <AvatarFallback>
                                        {m.displayName[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="font-medium flex items-center gap-2 text-sm">
                                        {m.displayName}
                                        {m.role === "leader" && (
                                          <Crown className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                        )}
                                      </div>
                                      <div className="text-xs text-muted-foreground capitalize">
                                        {m.role}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold text-sm font-mono">
                                      {m.currentXP.toLocaleString()} XP
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {membersData.length < 5 && (
                                <div
                                  className="border-dashed border-2 rounded-lg p-4 flex flex-col items-center justify-center text-muted-foreground gap-2 hover:bg-muted/50 transition-colors cursor-pointer group"
                                  onClick={() => {
                                    navigator.clipboard.writeText(myClan.id);
                                    toast({
                                      title: "Copied!",
                                      description:
                                        "Share this ID with a friend.",
                                    });
                                  }}
                                >
                                  <UserPlus className="h-6 w-6 opacity-30 group-hover:opacity-100 transition-opacity" />
                                  <span className="text-sm font-medium">
                                    Invite a Friend ({5 - membersData.length}{" "}
                                    slots left)
                                  </span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        <div className="space-y-6">
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                Weekly Stats
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                <div>
                                  <div className="text-2xl font-bold flex items-center gap-2">
                                    <CalendarCheck className="h-5 w-5 text-green-500" />
                                    -- %
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Avg. Attendance
                                  </p>
                                </div>
                                <div className="h-px bg-border" />
                                <div>
                                  <div className="text-2xl font-bold flex items-center gap-2">
                                    <School className="h-5 w-5 text-blue-500" />
                                    #
                                    {topClans.findIndex(
                                      (c) => c.id === myClan.id
                                    ) + 1}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Class Rank
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Button
                            variant="ghost"
                            className="w-full text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={handleLeaveClan}
                          >
                            <LogOut className="h-4 w-4 mr-2" />
                            Leave Squad
                          </Button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </>
        )}
      </div>
      {/* View Clan Details Dialog */}
      <Dialog open={viewClanDialogOpen} onOpenChange={setViewClanDialogOpen}>
        <DialogContent className="max-w-md">
          {selectedClan && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {(() => {
                    const iconDef =
                      CLAN_ICONS.find((i) => i.id === selectedClan.tag) ||
                      CLAN_ICONS[0];
                    const Icon = iconDef.icon;
                    return (
                      <>
                        <div
                          className={cn(
                            "p-2 rounded-lg text-white",
                            iconDef.gradient || "bg-primary"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span>{selectedClan.name}</span>
                          <span className="text-xs font-normal text-muted-foreground">
                            {selectedClan.totalXP.toLocaleString()} XP
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </DialogTitle>
                <DialogDescription>
                  {selectedClan.description}
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground uppercase flex items-center justify-between">
                  <span>Squad Members</span>
                  <span className="text-xs">
                    {selectedClan.members.length}/5
                  </span>
                </h4>

                {loadingMembers ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedClanMembers.map((member, i) => (
                      <div
                        key={member.uid}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-muted-foreground w-4 text-center">
                            {i + 1}
                          </span>
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.photoUrl} />
                            <AvatarFallback>
                              {member.displayName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium leading-none flex items-center gap-1">
                              {member.displayName}
                              {member.uid === selectedClan.leaderId && (
                                <Crown className="h-3 w-3 text-yellow-500" />
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Level {Math.floor(member.currentXP / 1000) + 1}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm font-bold">
                          {member.currentXP.toLocaleString()}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            XP
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
