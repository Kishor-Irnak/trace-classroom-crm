import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import type { Assignment, Course } from "@shared/schema";

/**
 * Leaderboard Service
 * Handles automatic syncing of leaderboard data, badges, and streaks
 */

export class LeaderboardService {
  /**
   * Calculate XP from assignments
   */
  static calculateXP(assignments: Assignment[]): {
    totalXP: number;
    processedIds: string[];
  } {
    let totalXP = 0;
    const processedIds: string[] = [];

    for (const assignment of assignments) {
      const isCompleted =
        assignment.systemStatus === "submitted" ||
        assignment.systemStatus === "graded";

      if (isCompleted) {
        // Base XP
        totalXP += 100;

        // Bonus XP for early submission (48h before deadline)
        if (assignment.submittedAt && assignment.dueDate) {
          const submittedTime = new Date(assignment.submittedAt).getTime();
          const dueTime = new Date(assignment.dueDate).getTime();
          const hoursDiff = (dueTime - submittedTime) / (1000 * 60 * 60);

          if (hoursDiff > 48) {
            totalXP += 50;
          }
        }

        processedIds.push(assignment.id);
      }
    }

    return { totalXP, processedIds };
  }

  /**
   * Award productivity badges based on submission count
   */
  static calculateBadges(
    submissionCount: number,
    existingBadges: string[]
  ): string[] {
    const badges = new Set(existingBadges);

    if (submissionCount >= 10) badges.add("10-submissions");
    if (submissionCount >= 25) badges.add("25-submissions");
    if (submissionCount >= 50) badges.add("50-submissions");

    return Array.from(badges);
  }

  /**
   * Sync user's leaderboard data automatically
   * This should be called on login and after assignment submissions
   */
  static async syncUserLeaderboard(
    userId: string,
    userEmail: string,
    displayName: string,
    photoURL: string,
    assignments: Assignment[],
    courses: Course[]
  ): Promise<void> {
    try {
      // Calculate XP and get processed assignment IDs
      const { totalXP, processedIds } = this.calculateXP(assignments);

      // Extract email domain
      const emailDomain = userEmail.includes("@")
        ? userEmail.split("@")[1]
        : "";

      // Get enrolled course IDs
      const enrolledCourseIds = courses.map((c) => c.id);

      // Fetch existing badges to preserve history
      const userRef = doc(
        db,
        "leaderboards",
        "all-courses",
        "students",
        userId
      );
      const currentDoc = await getDoc(userRef);
      const existingBadges = currentDoc.exists()
        ? currentDoc.data().badges || []
        : [];

      // Calculate badges
      const badges = this.calculateBadges(processedIds.length, existingBadges);

      // Update Firestore
      await setDoc(
        userRef,
        {
          displayName: displayName || "Anonymous",
          photoUrl: photoURL || "",
          email: userEmail,
          emailDomain: emailDomain,
          enrolledCourseIds: enrolledCourseIds,
          totalXP: totalXP,
          processedAssignmentIds: processedIds,
          lastSyncedAt: serverTimestamp(),
          badges: badges,
        },
        { merge: true }
      );

      console.log(`✅ Leaderboard synced for ${displayName}: ${totalXP} XP`);
    } catch (error) {
      console.error("❌ Failed to sync leaderboard:", error);
      throw error;
    }
  }

  /**
   * Reset leaderboard when semester changes
   * This clears old subject data and starts fresh
   */
  static async resetLeaderboardForSemester(userId: string): Promise<void> {
    try {
      const userRef = doc(
        db,
        "leaderboards",
        "all-courses",
        "students",
        userId
      );

      // Delete the user's leaderboard entry to start fresh
      await deleteDoc(userRef);

      console.log(`✅ Leaderboard reset for user ${userId}`);
    } catch (error) {
      console.error("❌ Failed to reset leaderboard:", error);
      throw error;
    }
  }

  /**
   * Check if courses have changed (semester change detection)
   * Returns true if the enrolled courses are different from stored courses
   */
  static async hasCoursesChanged(
    userId: string,
    currentCourseIds: string[]
  ): Promise<boolean> {
    try {
      const userRef = doc(
        db,
        "leaderboards",
        "all-courses",
        "students",
        userId
      );
      const currentDoc = await getDoc(userRef);

      if (!currentDoc.exists()) {
        console.log("📝 New user - no previous leaderboard data");
        return false; // New user, no change
      }

      const storedCourseIds = currentDoc.data().enrolledCourseIds || [];

      console.log("🔍 Checking for semester change:");
      console.log("  Current courses:", currentCourseIds);
      console.log("  Stored courses:", storedCourseIds);

      // Check if course sets are different
      const currentSet = new Set(currentCourseIds);
      const storedSet = new Set(storedCourseIds);

      // If sizes are different, courses have changed
      if (currentSet.size !== storedSet.size) {
        console.log("  ✅ Course count changed - semester change detected");
        return true;
      }

      // Check if ANY course is different (more aggressive)
      for (const courseId of currentCourseIds) {
        if (!storedSet.has(courseId)) {
          console.log(
            `  ✅ New course detected: ${courseId} - semester change detected`
          );
          return true;
        }
      }

      // Also check if any stored course is no longer enrolled
      for (const courseId of storedCourseIds) {
        if (!currentSet.has(courseId)) {
          console.log(
            `  ✅ Course removed: ${courseId} - semester change detected`
          );
          return true;
        }
      }

      console.log("  ℹ️ No semester change detected");
      return false;
    } catch (error) {
      console.error("❌ Failed to check course changes:", error);
      return false;
    }
  }

  /**
   * Auto-sync on login
   * Detects semester changes and resets if needed
   */
  static async autoSyncOnLogin(
    userId: string,
    userEmail: string,
    displayName: string,
    photoURL: string,
    assignments: Assignment[],
    courses: Course[]
  ): Promise<void> {
    try {
      const currentCourseIds = courses.map((c) => c.id);

      // Check if courses have changed (semester change)
      const coursesChanged = await this.hasCoursesChanged(
        userId,
        currentCourseIds
      );

      if (coursesChanged) {
        console.log("🔄 Semester change detected, resetting leaderboard...");
        await this.resetLeaderboardForSemester(userId);
      }

      // Sync current data
      await this.syncUserLeaderboard(
        userId,
        userEmail,
        displayName,
        photoURL,
        assignments,
        courses
      );
    } catch (error) {
      console.error("❌ Auto-sync failed:", error);
      throw error;
    }
  }
}
