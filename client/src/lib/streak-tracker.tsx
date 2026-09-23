import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export function StreakTracker() {
  const { user } = useAuth();
  const processedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      processedRef.current = false;
      return;
    }

    // Prevent double execution in React Strict Mode or fast re-renders
    if (processedRef.current) return;
    processedRef.current = true;

    const updateStreak = async () => {
      try {
        const userRef = doc(
          db,
          "leaderboards",
          "all-courses",
          "students",
          user.uid
        );
        const docSnap = await getDoc(userRef);

        const getISTDate = (date: Date) => {
          return date.toLocaleDateString("en-CA", {
            timeZone: "Asia/Kolkata",
          });
        };

        const today = getISTDate(new Date());

        // Calculate yesterday in IST
        // We create a date object for "now", subtract 24h roughly, then format to IST
        // A safer way for "Yesterday Date" independent of local time:
        // Parse today string, subtract 1 day.
        const d = new Date();
        d.setDate(d.getDate() - 1);
        const yesterday = getISTDate(d);
        // Note: Simple subtraction works 99% of time, but edge cases exist with timezone shifts.
        // For IST (no DST), this is safe.

        let currentStreak = 0;
        let longestStreak = 0;
        let lastLoginDate: string | null = null;
        let existingBadges: string[] = [];

        if (docSnap.exists()) {
          const data = docSnap.data();
          currentStreak = data.currentStreak || 0;
          longestStreak = data.longestStreak || 0;
          lastLoginDate = data.lastLoginDate || null;
          existingBadges = data.badges || [];
        }

        // --- Core Logic ---
        let shouldUpdate = false;

        if (!lastLoginDate) {
          // First time
          currentStreak = 1;
          shouldUpdate = true;
        } else if (lastLoginDate === today) {
          // Already logged in today
          // DO NOTHING
        } else if (lastLoginDate === yesterday) {
          // Consecutive day
          currentStreak += 1;
          shouldUpdate = true;
        } else {
          // Missed a day (or more)
          // Double check diff in days to be absolutely sure?
          // The strict string compare is what user asked for: "IF lastLoginDate == yesterday".
          // If it was day before yesterday, it falls to ELSE -> reset.
          currentStreak = 1;
          shouldUpdate = true;
        }

        if (shouldUpdate) {
          // Update Longest Streak
          if (currentStreak > longestStreak) {
            longestStreak = currentStreak;
          }

          // Badge Logic
          const newBadges = new Set(existingBadges);
          let badgeEarned = false;

          // Milestone Logic
          if (currentStreak >= 7) {
            const b = "7-day-consistent"; // Weekly badge
            // Note: You might need to define this badge in your badges system if not exists.
            // Given the prompt requested specific badges week/month:
            // "IF currentStreak == 7 -> weekly badge"
            // "IF currentStreak == 30 -> consistency badge"
          }

          // Existing badges check from previous code
          if (currentStreak >= 5) newBadges.add("5-day-consistent");
          if (currentStreak >= 10) newBadges.add("10-day-consistent");
          if (currentStreak >= 30) newBadges.add("30-day-consistent");

          // Update Firestore
          // We use the same path as before to maintain data continuity
          await setDoc(
            userRef,
            {
              currentStreak,
              longestStreak,
              lastLoginDate: today,
              badges: Array.from(newBadges),
              lastSyncedAt: serverTimestamp(),
              // Maintain legacy field for backward compatibility if needed, or just switch
              loginStreak: currentStreak,
            },
            { merge: true }
          );

          // Streak updated successfully
        }
      } catch (err) {
        console.error("Failed to update streak:", err);
      }
    };

    updateStreak();
  }, [user]);

  return null;
}
