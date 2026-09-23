/**
 * Storage Manager
 * Handles localStorage with user account isolation to prevent conflicts when switching accounts
 */

const CURRENT_USER_KEY = "trace_current_user_id";

/**
 * Keys that should persist across user switches (app-level settings)
 */
const GLOBAL_KEYS = ["theme", "trace_docs_seen"];

/**
 * Clear all user-specific data from localStorage
 * Preserves global app settings like theme
 */
export function clearUserData(): void {
  const keysToKeep: Record<string, string> = {};

  // Save global keys
  GLOBAL_KEYS.forEach((key) => {
    const value = localStorage.getItem(key);
    if (value) {
      keysToKeep[key] = value;
    }
  });

  // Clear all localStorage
  localStorage.clear();

  // Restore global keys
  Object.entries(keysToKeep).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });
}

/**
 * Check if user has switched and clear old user's data if needed
 * Call this when user authentication succeeds
 */
export function handleUserSwitch(newUserId: string): boolean {
  const currentUserId = localStorage.getItem(CURRENT_USER_KEY);

  if (!currentUserId) {
    // First time login - just store the user ID
    localStorage.setItem(CURRENT_USER_KEY, newUserId);
    return false;
  }

  if (currentUserId !== newUserId) {
    // User switched! Clear old data
    console.log("🔄 Account switch detected. Clearing old user data...");
    clearUserData();
    localStorage.setItem(CURRENT_USER_KEY, newUserId);
    return true;
  }

  return false;
}

/**
 * Clear current user ID (call on sign out)
 */
export function clearCurrentUser(): void {
  localStorage.removeItem(CURRENT_USER_KEY);
}

/**
 * Get current stored user ID
 */
export function getCurrentUserId(): string | null {
  return localStorage.getItem(CURRENT_USER_KEY);
}
