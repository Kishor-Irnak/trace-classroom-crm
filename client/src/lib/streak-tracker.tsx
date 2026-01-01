import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { differenceInCalendarDays, startOfDay } from "date-fns";

export function StreakTracker() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const checkStreak = async () => {
      try {
        const userRef = doc(
          db,
          "leaderboards",
          "all-courses",
          "students",
          user.uid
        );
        const docSnap = await getDoc(userRef);

        const todayTimestamp = startOfDay(new Date()).getTime();
        let currentStreak = 0;
        let lastLoginTimestamp = 0;
        let currentBadges: string[] = [];

        if (docSnap.exists()) {
          const data = docSnap.data();
          currentStreak = data.loginStreak || 0;
          lastLoginTimestamp = data.lastLoginStreakDate
            ? data.lastLoginStreakDate
            : 0;
          currentBadges = data.badges || [];
        }

        // Logic
        if (lastLoginTimestamp) {
          const daysDiff = differenceInCalendarDays(
            todayTimestamp,
            lastLoginTimestamp
          );

          if (daysDiff === 0) {
            // Already logged in today, do nothing
            return;
          } else if (daysDiff === 1) {
            // Consecutive day
            currentStreak += 1;
          } else {
            // Broken streak, reset
            currentStreak = 1;
          }
        } else {
          // First time tracking
          currentStreak = 1;
        }

        // --- Award Badges Immediately ---
        const newBadges = [...currentBadges];
        let badgesChanged = false;

        if (currentStreak >= 5 && !newBadges.includes("5-day-consistent")) {
          newBadges.push("5-day-consistent");
          badgesChanged = true;
        }
        if (currentStreak >= 10 && !newBadges.includes("10-day-consistent")) {
          newBadges.push("10-day-consistent");
          badgesChanged = true;
        }
        if (currentStreak >= 30 && !newBadges.includes("30-day-consistent")) {
          newBadges.push("30-day-consistent");
          badgesChanged = true;
        }

        // --- Update Firestore ---
        const updateData: any = {
          loginStreak: currentStreak,
          lastLoginStreakDate: todayTimestamp,
        };

        if (badgesChanged) {
          updateData.badges = newBadges;
        }

        await setDoc(userRef, updateData, { merge: true });

        console.debug("Streak updated to:", currentStreak);
      } catch (err) {
        console.error("Failed to update streak:", err);
      }
    };

    checkStreak();
  }, [user]);

  return null; // Headless component
}
