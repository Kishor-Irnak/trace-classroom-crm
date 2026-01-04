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
  onSnapshot,
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Send,
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
  MoreVertical,
  UserMinus,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

export interface ClanMember {
  uid: string;
  displayName: string;
  photoUrl: string;
  currentXP: number;
  role: "leader" | "member";
  emailDomain?: string;
  enrolledCourseIds?: string[];
}

import { useClassroom } from "@/lib/classroom-context";

export default function ClansPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { courses } = useClassroom();

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

  // Transfer Leadership Dialog
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [selectedNewLeader, setSelectedNewLeader] = useState<string>("");

  // Confirmation Dialogs
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Leaderboard Filtering
  const [viewMode, setViewMode] = useState<"class" | "college">("class");
  const [showCollegeWarning, setShowCollegeWarning] = useState(true);

  // Filtered Clans Logic
  const [filteredClans, setFilteredClans] = useState<Clan[]>([]);
  const [clanMemberProfiles, setClanMemberProfiles] = useState<
    Record<string, ClanMember[]>
  >({});

  // Track pending requests
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (!user || topClans.length === 0) {
      setFilteredClans([]);
      return;
    }

    const userDomain = user.email ? user.email.split("@")[1] : null;
    // user enrolled courses
    const userCourseIds = courses.map((c) => c.id);

    const filtered = topClans.filter((clan) => {
      // Always show user's own clan if it's in the list
      if (clan.members.includes(user.uid)) return true;

      // Find leader profile
      const members = clanMemberProfiles[clan.id] || [];
      // Use leaderId to find leader, or fallback to first member
      // Since we populate 'role' in fetchTopClans, we can use that too
      const leader =
        members.find((m) => m.uid === clan.leaderId) ||
        members.find((m) => m.role === "leader") ||
        members[0];

      if (!leader) return false;

      // Logic from Leaderboard.tsx
      const leaderDomain = leader.emailDomain;
      // If leader profile missing emailDomain (legacy?), fallback to false or lenient?
      // Leaderboard logic: userDomain && studentDomain && userDomain === studentDomain
      const isSameDomain =
        userDomain && leaderDomain && userDomain === leaderDomain;

      if (viewMode === "college") {
        return !!isSameDomain;
      } else {
        // Class View: same domain + shared course
        const leaderCourses = leader.enrolledCourseIds || [];
        const hasCommonSubject = userCourseIds.some((id) =>
          leaderCourses.includes(id)
        );
        return isSameDomain && hasCommonSubject;
      }
    });

    setFilteredClans(filtered);
  }, [topClans, viewMode, user, courses, clanMemberProfiles]);

  // View Clan Details
  const [selectedClan, setSelectedClan] = useState<Clan | null>(null);
  const [selectedClanMembers, setSelectedClanMembers] = useState<ClanMember[]>(
    []
  );
  const [viewClanDialogOpen, setViewClanDialogOpen] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const fetchClanMembersDetails = async (
    memberIds: string[],
    leaderId?: string
  ) => {
    setLoadingMembers(true);
    try {
      if (memberIds.length === 0) {
        setSelectedClanMembers([]);
        setLoadingMembers(false);
        return;
      }

      const memberPromises = memberIds.map(async (memberId) => {
        try {
          const studentRef = doc(
            db,
            "leaderboards",
            "all-courses",
            "students",
            memberId
          );
          const studentSnap = await getDoc(studentRef);

          if (studentSnap.exists()) {
            const data = studentSnap.data();
            return {
              uid: memberId,
              displayName: data.displayName || data.name || "Unknown",
              photoUrl: data.photoUrl || data.photoURL || data.avatar || "",
              currentXP: data.totalXP || data.xp || data.currentXP || 0,
              role: memberId === leaderId ? "leader" : "member",
            } as ClanMember;
          } else {
            // Check if it's the current user (fallback)
            if (user && memberId === user.uid) {
              return {
                uid: memberId,
                displayName: user.displayName || "Me",
                photoUrl: user.photoURL || "",
                currentXP: 0,
                role: memberId === leaderId ? "leader" : "member",
              } as ClanMember;
            }

            // Fallback for missing data
            return {
              uid: memberId,
              displayName: "Unknown Member",
              photoUrl: "",
              currentXP: 0,
              role: memberId === leaderId ? "leader" : "member",
            } as ClanMember;
          }
        } catch (err) {
          console.error(`Error fetching member ${memberId}:`, err);
          return {
            uid: memberId,
            displayName: "Error Loading",
            photoUrl: "",
            currentXP: 0,
            role: "member",
          } as ClanMember;
        }
      });

      const members = await Promise.all(memberPromises);
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
      fetchClanMembersDetails(clan.members, clan.leaderId);
    }
  };

  useEffect(() => {
    if (!user) return;
    // fetchUserClan is now handled by real-time listener below
    fetchTopClans();
  }, [user]);

  // Fetch pending requests for current user
  useEffect(() => {
    if (!user) return;

    const requestsRef = collection(db, "clan_requests");
    const q = query(
      requestsRef,
      where("requesterId", "==", user.uid),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clanIds = new Set(snapshot.docs.map((doc) => doc.data().clanId));
      setPendingRequests(clanIds);
    });

    return () => unsubscribe();
  }, [user]);

  // Real-time listener for user's clan
  useEffect(() => {
    if (!user) return;

    const clansRef = collection(db, "study_squads");
    const q = query(clansRef, where("members", "array-contains", user.uid));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty) {
        const clanDoc = snapshot.docs[0];
        const clanData = { id: clanDoc.id, ...clanDoc.data() } as Clan;
        setMyClan(clanData);

        // Pre-fill edit form
        setEditName(clanData.name);
        setEditTag(clanData.tag);
        setEditDesc(clanData.description);

        // Fetch member details
        await fetchMembersDetails(
          clanData.members,
          clanData.leaderId,
          clanDoc.id
        );
      } else {
        setMyClan(null);
        setMembersData([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
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
        console.log("Student data for", memberId, {
          displayName: data.displayName,
          photoUrl: data.photoUrl,
          photoURL: data.photoURL,
          avatar: data.avatar,
        });
        memberXP = data.totalXP || data.xp || 0;
        memberName = data.displayName || data.name || "Unknown";
        memberPhoto = data.photoUrl || data.photoURL || data.avatar || "";
      } else {
        console.log("Student snap does NOT exist for", memberId);
        if (memberId === user?.uid) {
          memberName = user?.displayName || "Me";
          memberPhoto = user?.photoURL || "";
          console.log("Using current user fallback:", {
            memberName,
            memberPhoto,
          });
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
    console.log(
      "About to setMembersData with details:",
      details.map((d) => ({
        name: d.displayName,
        photoUrl: d.photoUrl,
        hasPhoto: !!d.photoUrl,
      }))
    );
    setMembersData(details);

    const clanRef = doc(db, "study_squads", clanId);
    updateDoc(clanRef, { totalXP: clanTotalXP }).catch(console.error);
  };

  const fetchTopClans = async () => {
    try {
      const clansRef = collection(db, "study_squads");
      const q = query(clansRef, orderBy("totalXP", "desc"), limit(50));
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
          // Instead of querying by uid field, fetch documents directly by ID
          const docPromises = chunkIds.map((uid) =>
            getDoc(doc(db, "leaderboards", "all-courses", "students", uid))
          );
          const snapshots = await Promise.all(docPromises);

          snapshots.forEach((snap) => {
            if (snap.exists()) {
              const d = snap.data();
              memberDetailsMap[snap.id] = {
                uid: snap.id,
                displayName: d.displayName || "Unknown",
                photoUrl: d.photoUrl || d.photoURL || "",
                currentXP: d.totalXP || d.currentXP || 0,
                role: "member",
                emailDomain:
                  d.emailDomain ||
                  (d.email ? d.email.split("@")[1] : undefined),
                enrolledCourseIds: d.enrolledCourseIds || d.subjects || [],
              } as ClanMember;
            }
          });
        })
      );

      // Now build the map keyed by Clan ID
      const profilesByClan: Record<string, ClanMember[]> = {};
      console.log(
        "Building profilesByClan, memberDetailsMap has",
        Object.keys(memberDetailsMap).length,
        "members"
      );
      clans.forEach((clan) => {
        console.log(
          "Processing clan",
          clan.name,
          "with member IDs:",
          clan.members
        );
        profilesByClan[clan.id] = clan.members
          .map((mid) => {
            let profile = memberDetailsMap[mid];
            console.log("Looking up member", mid, "found:", !!profile);
            // Fallback for current user if their leaderboard doc isn't found/indexed yet
            if (!profile && mid === user?.uid) {
              const uDomain = user.email ? user.email.split("@")[1] : undefined;
              const uCourses = courses.map((c) => c.id);
              console.log("Using current user fallback for", mid);
              profile = {
                uid: user.uid,
                displayName: user.displayName || "Me",
                photoUrl: user.photoURL || "",
                currentXP: 0,
                role: "member",
                emailDomain: uDomain,
                enrolledCourseIds: uCourses,
              } as ClanMember;
            }
            return profile;
          })
          .filter(Boolean);
        console.log(
          "Clan",
          clan.name,
          "has",
          profilesByClan[clan.id].length,
          "profiles"
        );
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

      // Fair Play Check: User can only join their own class's clan
      const leaderRef = doc(
        db,
        "leaderboards",
        "all-courses",
        "students",
        data.leaderId
      );
      const leaderSnap = await getDoc(leaderRef);
      let isAllowed = false;

      if (leaderSnap.exists()) {
        const leaderData = leaderSnap.data();
        const leaderDomain =
          leaderData.emailDomain ||
          (leaderData.email ? leaderData.email.split("@")[1] : null);
        const leaderCourses =
          leaderData.enrolledCourseIds || leaderData.subjects || [];

        const userDomain = user!.email ? user!.email.split("@")[1] : null;
        const userCourseIds = courses.map((c) => c.id);

        const isSameDomain =
          userDomain && leaderDomain && userDomain === leaderDomain;
        const hasCommonSubject = userCourseIds.some((id) =>
          leaderCourses.includes(id)
        );

        // Strict Class Logic
        if (isSameDomain && hasCommonSubject) {
          isAllowed = true;
        }
      } else {
        // Leader profile not found? Maybe implicit allow or strict deny?
        // Strict deny for fair play, but maybe leader is me (implying I'm restoring connection)?
        // If I am joining, I am not the leader (leader is data.leaderId).
        console.log("Leader profile not found during join check.");
      }

      if (!isAllowed) {
        toast({
          title: "Restricted",
          description:
            "For fair play, you can only join squads from your own class.",
          variant: "destructive",
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

  const handleRequestJoin = async () => {
    if (!selectedClan || !user) return;

    // Check if user is already in a clan
    if (myClan) {
      toast({
        title: "Already in a Squad",
        description:
          "You must leave your current squad before joining another.",
        variant: "destructive",
      });
      return;
    }

    // Check if clan is full
    if (selectedClan.members.length >= 5) {
      toast({
        title: "Squad Full",
        description: "This squad already has 5 members.",
        variant: "destructive",
      });
      return;
    }

    // Fair Play Check
    const leaderRef = doc(
      db,
      "leaderboards",
      "all-courses",
      "students",
      selectedClan.leaderId
    );
    const leaderSnap = await getDoc(leaderRef);
    let isAllowed = false;

    if (leaderSnap.exists()) {
      const leaderData = leaderSnap.data();
      const leaderDomain =
        leaderData.emailDomain ||
        (leaderData.email ? leaderData.email.split("@")[1] : null);
      const leaderCourses =
        leaderData.enrolledCourseIds || leaderData.subjects || [];

      const userDomain = user.email ? user.email.split("@")[1] : null;
      const userCourseIds = courses.map((c) => c.id);

      const isSameDomain =
        userDomain && leaderDomain && userDomain === leaderDomain;
      const hasCommonSubject = userCourseIds.some((id) =>
        leaderCourses.includes(id)
      );

      if (isSameDomain && hasCommonSubject) {
        isAllowed = true;
      }
    }

    if (!isAllowed) {
      toast({
        title: "Restricted",
        description:
          "For fair play, you can only join squads from your own class.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if request already exists
      const requestsRef = collection(db, "clan_requests");
      const q = query(
        requestsRef,
        where("clanId", "==", selectedClan.id),
        where("requesterId", "==", user.uid),
        where("status", "==", "pending")
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        toast({
          title: "Request Pending",
          description: "You have already sent a request to this squad.",
        });
        return;
      }

      console.log(
        "Creating request with leaderId:",
        selectedClan.leaderId,
        "for clan:",
        selectedClan.name
      );

      await addDoc(collection(db, "clan_requests"), {
        clanId: selectedClan.id,
        clanName: selectedClan.name,
        leaderId: selectedClan.leaderId,
        requesterId: user.uid,
        requesterName: user.displayName,
        requesterAvatar: user.photoURL,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      // Add to pending requests
      setPendingRequests((prev) => new Set(prev).add(selectedClan.id));

      toast({
        title: "Request Sent",
        description: `Your request to join ${selectedClan.name} has been sent.`,
      });
      setViewClanDialogOpen(false);
    } catch (error) {
      console.error("Error sending request:", error);
      toast({
        title: "Error",
        description: "Failed to send request.",
        variant: "destructive",
      });
    }
  };

  const handleLeaveClan = () => {
    setShowLeaveConfirm(true);
  };

  const confirmLeaveClan = async () => {
    if (!myClan) return;

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

      setShowLeaveConfirm(false);
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
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (!myClan || myClan.leaderId !== user!.uid) {
      toast({
        title: "Permission Denied",
        description: "Only the leader can remove members.",
        variant: "destructive",
      });
      return;
    }

    if (memberId === user!.uid) {
      toast({
        title: "Cannot Remove Yourself",
        description: "Use 'Leave Squad' or transfer leadership first.",
        variant: "destructive",
      });
      return;
    }

    setMemberToRemove({ id: memberId, name: memberName });
    setShowRemoveConfirm(true);
  };

  const confirmRemoveMember = async () => {
    if (!myClan || !memberToRemove) return;

    try {
      const clanRef = doc(db, "study_squads", myClan.id);
      await updateDoc(clanRef, {
        members: arrayRemove(memberToRemove.id),
      });

      toast({
        title: "Member Removed",
        description: `${memberToRemove.name} has been removed from the squad.`,
      });

      setShowRemoveConfirm(false);
      setMemberToRemove(null);
      // Real-time listener will update automatically
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to remove member.",
        variant: "destructive",
      });
    }
  };

  const handleTransferLeadership = async (
    newLeaderId: string,
    newLeaderName: string
  ) => {
    if (!myClan || myClan.leaderId !== user!.uid) {
      toast({
        title: "Permission Denied",
        description: "Only the current leader can transfer leadership.",
        variant: "destructive",
      });
      return;
    }

    if (newLeaderId === user!.uid) {
      toast({
        title: "Already Leader",
        description: "You are already the leader.",
        variant: "destructive",
      });
      return;
    }

    try {
      const clanRef = doc(db, "study_squads", myClan.id);
      await updateDoc(clanRef, {
        leaderId: newLeaderId,
      });

      toast({
        title: "Leadership Transferred",
        description: `${newLeaderName} is now the squad leader.`,
      });

      setIsTransferDialogOpen(false);
      setSelectedNewLeader("");
      // Real-time listener will update automatically
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to transfer leadership.",
        variant: "destructive",
      });
    }
  };

  const confirmTransferLeadership = () => {
    if (!selectedNewLeader) {
      toast({
        title: "No Member Selected",
        description: "Please select a member to transfer leadership to.",
        variant: "destructive",
      });
      return;
    }

    const newLeader = membersData.find((m) => m.uid === selectedNewLeader);
    if (newLeader) {
      handleTransferLeadership(newLeader.uid, newLeader.displayName);
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
      // Real-time listener will update automatically
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
    <TooltipProvider delayDuration={300}>
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
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 rounded-full p-0"
                        >
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="max-w-[280px] p-3"
                      >
                        <div className="space-y-2">
                          <p className="font-bold text-primary">
                            How to Squad Up:
                          </p>
                          <div className="text-xs space-y-1">
                            <p>
                              • <strong>To Join:</strong> Enter a 6-digit Squad
                              ID in the input box and click Join.
                            </p>
                            <p>
                              • <strong>To Create:</strong> Go to the "My Squad"
                              tab and fill out the form to start your own!
                            </p>
                            <p>
                              • <strong>Max Members:</strong> Each squad can
                              have up to 5 members.
                            </p>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
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
                      <Tooltip>
                        <TooltipTrigger asChild>
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
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs">
                            Enter a 6-digit Squad ID to join
                          </p>
                        </TooltipContent>
                      </Tooltip>
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
                      This leaderboard includes all squads from your college.
                      Note that students in different years or branches may have
                      different workloads and assignment counts, so this
                      comparison is not academically fair. It's just for fun!
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {filteredClans.map((clan, i) => {
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
                              <Avatar className="h-8 w-8 md:h-10 md:w-10 border-2 border-background ring-1 ring-border transition-transform hover:scale-110 hover:z-20">
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
                {filteredClans.length === 0 && (
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
                      <CardTitle className="flex items-center gap-2">
                        Squad Details
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 rounded-full p-0"
                            >
                              <Info className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p className="text-xs">
                              Give your squad a name and choose a badge to get
                              started!
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </CardTitle>
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
                                  {myClan.leaderId === user?.uid ? (
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
                                          <div className="pt-4 border-t mt-4">
                                            <Button
                                              variant="destructive"
                                              size="sm"
                                              className="w-full"
                                              onClick={handleLeaveClan}
                                            >
                                              <LogOut className="h-4 w-4 mr-2" />
                                              Leave Clan
                                            </Button>
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
                                  ) : (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-white/50 hover:text-white hover:bg-white/20 transition-all rounded-full"
                                        >
                                          <Settings className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>
                                          Squad Settings
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={handleLeaveClan}
                                          className="text-destructive focus:text-destructive"
                                        >
                                          <LogOut className="mr-2 h-4 w-4" />
                                          Leave Squad
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
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

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Squad Members Card */}
                          <Card className="lg:col-span-2 overflow-hidden">
                            <CardHeader className="pb-3 bg-gradient-to-br from-background to-muted/20">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                  <Users className="h-4 w-4 text-primary" />
                                  Squad Members
                                </CardTitle>
                                <Badge
                                  variant="outline"
                                  className="text-xs font-mono tabular-nums"
                                >
                                  {membersData.length}/5
                                </Badge>
                              </div>
                            </CardHeader>

                            <CardContent className="space-y-3 pt-4">
                              {(() => {
                                console.log(
                                  "Rendering Squad Members, membersData:",
                                  membersData.map((m) => ({
                                    name: m.displayName,
                                    photoUrl: m.photoUrl,
                                    role: m.role,
                                  }))
                                );
                                return null;
                              })()}
                              {membersData.map((m, i) => (
                                <div
                                  key={m.uid}
                                  className="group/member flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-muted/50 hover:border-border transition-all"
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {/* Rank Number */}
                                    <div
                                      className={cn(
                                        "font-mono text-center text-sm font-bold w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors",
                                        i === 0
                                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-500"
                                          : "bg-muted text-muted-foreground"
                                      )}
                                    >
                                      {i + 1}
                                    </div>

                                    {/* Avatar */}
                                    <div className="relative shrink-0">
                                      <Avatar className="h-9 w-9 border">
                                        <AvatarImage
                                          src={m.photoUrl}
                                          className="object-cover"
                                          onError={(e) => {
                                            console.error(
                                              "Failed to load avatar for",
                                              m.displayName,
                                              "URL:",
                                              m.photoUrl,
                                              e
                                            );
                                          }}
                                        />
                                        <AvatarFallback className="text-xs">
                                          {m.displayName[0]}
                                        </AvatarFallback>
                                      </Avatar>
                                      {m.role === "leader" && (
                                        <div className="absolute -top-0.5 -right-0.5 p-0.5 bg-amber-500 rounded-full">
                                          <Crown className="h-2.5 w-2.5 text-white fill-white" />
                                        </div>
                                      )}
                                    </div>

                                    {/* Member Info */}
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium flex items-center gap-2 text-sm truncate">
                                        <span className="truncate">
                                          {m.displayName}
                                        </span>
                                        {m.role === "leader" && (
                                          <Badge
                                            variant="secondary"
                                            className="text-[10px] px-1 py-0 shrink-0"
                                          >
                                            Leader
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="text-xs text-muted-foreground capitalize">
                                        {m.role}
                                      </div>
                                    </div>
                                  </div>

                                  {/* XP */}
                                  <div className="text-right shrink-0">
                                    <div className="font-bold text-sm font-mono tabular-nums">
                                      {m.currentXP.toLocaleString()}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                      XP
                                    </div>
                                  </div>

                                  {/* Member Actions Menu */}
                                  {myClan.leaderId === user?.uid && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0"
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        {m.uid === user?.uid ? (
                                          // Options for leader's own card
                                          <>
                                            <DropdownMenuLabel>
                                              Leader Options
                                            </DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                              onClick={() =>
                                                setIsEditDialogOpen(true)
                                              }
                                            >
                                              <Settings className="mr-2 h-4 w-4" />
                                              Edit Squad
                                            </DropdownMenuItem>
                                            {membersData.length > 1 && (
                                              <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                  onClick={() =>
                                                    setIsTransferDialogOpen(
                                                      true
                                                    )
                                                  }
                                                >
                                                  <Crown className="mr-2 h-4 w-4" />
                                                  Transfer Leadership
                                                </DropdownMenuItem>
                                              </>
                                            )}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                              onClick={handleLeaveClan}
                                              className="text-destructive focus:text-destructive"
                                            >
                                              <LogOut className="mr-2 h-4 w-4" />
                                              {membersData.length === 1
                                                ? "Disband Squad"
                                                : "Leave Squad"}
                                            </DropdownMenuItem>
                                          </>
                                        ) : (
                                          // Options for other members
                                          <>
                                            <DropdownMenuLabel>
                                              Member Actions
                                            </DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                              onClick={() =>
                                                handleTransferLeadership(
                                                  m.uid,
                                                  m.displayName
                                                )
                                              }
                                            >
                                              <Crown className="mr-2 h-4 w-4" />
                                              Make Leader
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                              onClick={() =>
                                                handleRemoveMember(
                                                  m.uid,
                                                  m.displayName
                                                )
                                              }
                                              className="text-destructive focus:text-destructive"
                                            >
                                              <UserMinus className="mr-2 h-4 w-4" />
                                              Remove Member
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              ))}

                              {/* Invite Card */}
                              {membersData.length < 5 && (
                                <div
                                  className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-muted-foreground gap-2 hover:bg-muted/50 hover:border-primary/50 transition-all cursor-pointer"
                                  onClick={() => {
                                    navigator.clipboard.writeText(myClan.id);
                                    toast({
                                      title: "Copied!",
                                      description:
                                        "Share this ID with a friend.",
                                    });
                                  }}
                                >
                                  <UserPlus className="h-5 w-5 text-primary" />
                                  <span className="text-sm font-medium">
                                    Invite a Friend
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {5 - membersData.length}{" "}
                                    {5 - membersData.length === 1
                                      ? "slot"
                                      : "slots"}{" "}
                                    remaining
                                  </span>
                                </div>
                              )}
                            </CardContent>
                          </Card>

                          {/* Weekly Stats Card - Enhanced */}
                          <div className="space-y-6">
                            <Card className="border-2 shadow-xl hover:shadow-2xl transition-all duration-300 group/stats overflow-hidden relative">
                              {/* Gradient overlay */}
                              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-blue-500/5 opacity-0 group-hover/stats:opacity-100 transition-opacity duration-500 pointer-events-none" />

                              <CardHeader className="pb-3 relative z-10">
                                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                  <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                                  Weekly Stats
                                </CardTitle>
                              </CardHeader>

                              <CardContent className="space-y-4 pt-4">
                                {/* Attendance Stat */}
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-emerald-500/10">
                                      <CalendarCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                                      Avg. Attendance
                                    </div>
                                  </div>
                                  <div className="text-3xl font-semibold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                                    -- %
                                  </div>
                                </div>

                                <div className="h-px bg-border" />

                                {/* Class Rank Stat */}
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-primary/10">
                                      <School className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                                      Class Rank
                                    </div>
                                  </div>
                                  <div className="text-3xl font-semibold font-mono tracking-tight">
                                    #
                                    {filteredClans.findIndex(
                                      (c) => c.id === myClan.id
                                    ) + 1}
                                  </div>
                                </div>

                                <div className="h-px bg-border" />

                                {/* Quick Action */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full h-8 text-xs"
                                  onClick={() => {
                                    navigator.clipboard.writeText(myClan.id);
                                    toast({
                                      title: "Copied!",
                                      description:
                                        "Clan ID copied to clipboard.",
                                    });
                                  }}
                                >
                                  <Copy className="h-3 w-3 mr-2" />
                                  Copy Clan ID
                                </Button>
                              </CardContent>
                            </Card>
                          </div>
                        </div>

                        {/* CSS Animation */}
                        <style>{`
                        @keyframes fadeInUp {
                          from {
                            opacity: 0;
                            transform: translateY(10px);
                          }
                          to {
                            opacity: 1;
                            transform: translateY(0);
                          }
                        }
                      `}</style>
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

                {!myClan &&
                  selectedClan.members.length < 5 &&
                  !selectedClan.members.includes(user!.uid) && (
                    <DialogFooter className="flex-col sm:justify-between gap-2 border-t pt-4">
                      <div className="text-xs text-muted-foreground italic flex-1 flex items-center"></div>
                      <Button
                        className="w-full sm:w-auto"
                        onClick={handleRequestJoin}
                        disabled={pendingRequests.has(selectedClan.id)}
                        variant={
                          pendingRequests.has(selectedClan.id)
                            ? "secondary"
                            : "default"
                        }
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {pendingRequests.has(selectedClan.id)
                          ? "Requested"
                          : "Request to Join"}
                      </Button>
                    </DialogFooter>
                  )}
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Transfer Leadership Dialog */}
        <Dialog
          open={isTransferDialogOpen}
          onOpenChange={setIsTransferDialogOpen}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                Transfer Leadership
              </DialogTitle>
              <DialogDescription>
                Select a member to become the new squad leader.{" "}
                <strong>You will become a regular member</strong> and lose all
                leader privileges.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <Label className="text-sm font-medium mb-3 block">
                Select New Leader
              </Label>
              <RadioGroup
                value={selectedNewLeader}
                onValueChange={setSelectedNewLeader}
              >
                <div className="space-y-2">
                  {membersData
                    .filter((m) => m.uid !== user?.uid)
                    .map((member) => (
                      <div
                        key={member.uid}
                        className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedNewLeader(member.uid)}
                      >
                        <RadioGroupItem value={member.uid} id={member.uid} />
                        <Label
                          htmlFor={member.uid}
                          className="flex items-center gap-3 flex-1 cursor-pointer"
                        >
                          <Avatar className="h-9 w-9 border">
                            <AvatarImage src={member.photoUrl} />
                            <AvatarFallback>
                              {member.displayName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {member.displayName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {member.currentXP.toLocaleString()} XP
                            </div>
                          </div>
                        </Label>
                      </div>
                    ))}
                </div>
              </RadioGroup>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsTransferDialogOpen(false);
                  setSelectedNewLeader("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmTransferLeadership}
                disabled={!selectedNewLeader}
              >
                <Crown className="mr-2 h-4 w-4" />
                Transfer Leadership
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Leave Squad Confirmation */}
        <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave Squad?</AlertDialogTitle>
              <AlertDialogDescription>
                {myClan && myClan.members.length === 1
                  ? "You are the last member. The squad will be permanently deleted."
                  : "Are you sure you want to leave this squad? You can join another squad or create a new one."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmLeaveClan}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {myClan && myClan.members.length === 1
                  ? "Disband Squad"
                  : "Leave Squad"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Remove Member Confirmation */}
        <AlertDialog
          open={showRemoveConfirm}
          onOpenChange={setShowRemoveConfirm}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Member?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove{" "}
                <strong>{memberToRemove?.name}</strong> from{" "}
                <strong>{myClan?.name}</strong>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setMemberToRemove(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmRemoveMember}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove Member
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
