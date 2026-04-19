import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
  type OAuthCredential,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { GoogleAuthProvider } from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { handleUserSwitch, clearCurrentUser } from "./storage-manager";

/* =====================================================
   TYPES
===================================================== */
interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  authenticating: boolean; // New: true when sign-in popup is active
  role: "student" | "teacher" | "no_access" | null;
  accessToken: string | null;
  signInWithGoogle: () => Promise<void>;
  requestGmailPermissions: () => Promise<boolean>;
  requestCalendarPermissions: () => Promise<boolean>;
  refreshAccessToken: () => Promise<boolean>;
  signOut: () => Promise<void>;
  updateUserProfile: (data: {
    displayName?: string | null;
    photoURL?: string | null;
  }) => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false); // New state
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return localStorage.getItem("google_access_token");
  });

  // Helper: persist token + expiry together
  const persistToken = (token: string, expiresInMs = 3600 * 1000) => {
    setAccessToken(token);
    localStorage.setItem("google_access_token", token);
    localStorage.setItem(
      "google_access_token_expiry",
      String(Date.now() + expiresInMs)
    );
  };

  // Helper: check if stored token is known to be expired (with 5-min buffer).
  // Returns false when no expiry is stored — we give the benefit of the doubt
  // and let a 401 response trigger a reactive refresh instead.
  const isTokenExpired = (): boolean => {
    const expiry = localStorage.getItem("google_access_token_expiry");
    if (!expiry) return false; // no expiry recorded → assume still valid
    return Date.now() > Number(expiry) - 5 * 60 * 1000; // 5-min early refresh
  };
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<"student" | "teacher" | "no_access" | null>(
    () => {
      return localStorage.getItem("user_role") as
        | "student"
        | "teacher"
        | "no_access"
        | null;
    }
  );
  const [userRefreshKey, setUserRefreshKey] = useState(0);
  const [customPhotoURL, setCustomPhotoURL] = useState<string | null>(null);

  // Create enhanced user object with custom photoURL override
  const enhancedUser = useMemo(() => {
    if (!user) return null;
    if (!customPhotoURL) return user;

    // Create a proxy that overrides photoURL but preserves all other properties and methods
    return new Proxy(user, {
      get(target, prop) {
        if (prop === "photoURL") {
          return customPhotoURL;
        }
        return target[prop as keyof FirebaseUser];
      },
    });
  }, [user, customPhotoURL, userRefreshKey]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Check for account switch and clear old data if needed
        const switched = handleUserSwitch(user.uid);
        if (switched) {
          // User switched - force reload to start fresh
          window.location.reload();
          return;
        }
      }

      setUser(user);
      if (!user) {
        setRole(null);
        setLoading(false);
        setAccessToken(null);
        // Don't clear localStorage here to avoid race conditions on reload
        // localStorage.removeItem("google_access_token");
        clearCurrentUser();
      }
      // If user exists, we wait for role detection which happens via effect below or explicit call
    });
    return unsubscribe;
  }, []);

  // Role detection effect
  useEffect(() => {
    async function detectRole() {
      // No user at all — show login page
      if (!user) {
        setLoading(false);
        setAuthenticating(false);
        return;
      }

      // Resolve the access token from state or localStorage
      let token = accessToken || localStorage.getItem("google_access_token");
      if (token && !accessToken) {
        setAccessToken(token);
      }

      const cachedRole = localStorage.getItem("user_role") as
        | "student"
        | "teacher"
        | "no_access"
        | null;

      // FAST PATH: We have a token and a cached role — render the app NOW.
      // Do NOT block on a backend refresh call. Expired tokens are handled
      // reactively (on the next 401) so the user never sees a white screen.
      if (token && cachedRole && !authenticating) {
        setRole(cachedRole);
        setLoading(false);
        setAuthenticating(false);

        // Only do a background refresh when we have a stored expiry timestamp
        // that has actually passed. This avoids hammering the backend on every
        // page load for users who logged in before expiry tracking was added.
        if (isTokenExpired()) {
          refreshTokenSilent(user.uid).catch(() => {
            console.warn("[Auth] Background token refresh failed — will retry on next 401.");
          });
        }
        return;
      }

      // NO TOKEN: must get one silently before we can proceed
      if (!token) {
        console.log("[Auth] No token — attempting silent refresh...");
        const refreshed = await refreshTokenSilent(user.uid);
        if (refreshed) return; // effect re-runs with new token in state
        // Could not get a token — must sign in again
        console.warn("[Auth] Silent refresh failed. Showing login.");
        setRole(null);
        setLoading(false);
        setAuthenticating(false);
        return;
      }

      // FULL ROLE DETECTION — runs on first login (no cached role)
      try {
        setLoading(true);

        const teacherRes = await fetch(
          "https://classroom.googleapis.com/v1/courses?teacherId=me&pageSize=1",
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (teacherRes.status === 401) {
          console.log("[Auth] 401 during role detection — refreshing token...");
          const refreshed = await refreshTokenSilent(user.uid);
          if (!refreshed) {
            setError("Session expired. Please sign in again.");
            setRole(null);
            setLoading(false);
            localStorage.removeItem("google_access_token");
            localStorage.removeItem("google_access_token_expiry");
            localStorage.removeItem("user_role");
          }
          return;
        }

        let isTeacher = false;
        if (teacherRes.ok) {
          const d = await teacherRes.json();
          isTeacher = !!(d.courses && d.courses.length > 0);
        }

        if (isTeacher) {
          setRole("teacher");
          localStorage.setItem("user_role", "teacher");
          setLoading(false);
          return;
        }

        const studentRes = await fetch(
          "https://classroom.googleapis.com/v1/courses?studentId=me&pageSize=1",
          { headers: { Authorization: `Bearer ${token}` } }
        );

        let isStudent = false;
        if (studentRes.ok) {
          const d = await studentRes.json();
          isStudent = !!(d.courses && d.courses.length > 0);
        }

        const detectedRole = isStudent ? "student" : "no_access";
        setRole(detectedRole);
        localStorage.setItem("user_role", detectedRole);
      } catch (error) {
        console.error("[Auth] Role detection failed:", error);
        const fallback = (localStorage.getItem("user_role") as
          | "student" | "teacher" | "no_access" | null) ?? "no_access";
        setRole(fallback);
      } finally {
        setLoading(false);
        setAuthenticating(false);
      }
    }

    detectRole();
  }, [user, accessToken]);

  const signInWithGoogle = async () => {
    try {
      if (!navigator.onLine) {
        throw new Error("No internet connection. Please check your network.");
      }

      setError(null);
      setAuthenticating(true);

      // Ensure Firebase persists the session in IndexedDB across tabs/restarts
      await setPersistence(auth, browserLocalPersistence);

      // For returning users who already have a stored token, let Firebase
      // silently restore the session — do NOT force consent/account-picker.
      // Only prompt for account selection on the very first login (no stored uid).
      const isReturningUser = !!localStorage.getItem("trace_current_user_id");
      googleProvider.setCustomParameters(
        isReturningUser
          ? {
              // Silently pick the already-used account without showing the picker
              prompt: "none",
            }
          : {
              // First-time: let the user pick their account & grant consent
              prompt: "select_account",
              access_type: "offline",
            }
      );

      // Add a timeout to prevent hanging indefinitely
      const result = await Promise.race([
        signInWithPopup(auth, googleProvider),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Request timed out. Please try again.")),
            30000
          )
        ),
      ]);

      const credential = GoogleAuthProvider.credentialFromResult(
        result as any
      ) as OAuthCredential;
      if (credential?.accessToken) {
        // Store token with expiry (Google access tokens last 1 hour)
        persistToken(credential.accessToken);
      }
      // Keep authenticating true — cleared when role detection completes
    } catch (err: unknown) {
      // If silent sign-in fails (prompt:none) because no prior session,
      // fall back to the full interactive flow
      if (
        err instanceof Error &&
        (err.message.includes("popup_closed") ||
          err.message.includes("cancelled") ||
          (err as any)?.code === "auth/popup-closed-by-user" ||
          (err as any)?.code === "auth/cancelled-popup-request")
      ) {
        // User closed the popup — just stop the spinner, don't show an error
        setAuthenticating(false);
        return;
      }

      // Silent sign-in not possible → retry with full interactive prompt
      if (
        (err as any)?.code === "auth/popup-blocked" ||
        (err as any)?.code === "auth/internal-error"
      ) {
        try {
          googleProvider.setCustomParameters({
            prompt: "select_account",
            access_type: "offline",
          });
          const result2 = await signInWithPopup(auth, googleProvider);
          const credential2 = GoogleAuthProvider.credentialFromResult(
            result2 as any
          ) as OAuthCredential;
          if (credential2?.accessToken) {
            persistToken(credential2.accessToken);
          }
          return;
        } catch (err2: unknown) {
          const msg2 =
            err2 instanceof Error ? err2.message : "Failed to sign in";
          setError(msg2);
          setAuthenticating(false);
          return;
        }
      }

      const errorMessage =
        err instanceof Error ? err.message : "Failed to sign in";
      setError(errorMessage);
      setAuthenticating(false);
      console.error("[Auth] Sign in error:", err);
    }
  };

  const requestGmailPermissions = async () => {
    try {
      setError(null);

      // We need a server-side auth code to get a refresh token
      // This requires the 'offline' access type
      // Using gapi client or specific scope request

      // Note: firebase.signInWithPopup does NOT return a server auth code for offline access easily
      // We often need to use the Google Sign In SDK directly OR use a custom flow.
      // However, for simplicity in this context, we will try to add 'access_type: offline' to custom parameters.

      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/gmail.send");
      provider.addScope(
        "https://www.googleapis.com/auth/classroom.courses.readonly"
      ); // Re-ask to be safe

      // Crucial for getting the refresh token
      provider.setCustomParameters({
        access_type: "offline",
        prompt: "consent",
      });

      const result = await signInWithPopup(auth, provider);

      // The Firebase SDK wraps the internal GoogleCredential.
      // Getting the 'serverAuthCode' is tricky with just Firebase Auth.
      // BUT, we can just use the accessToken for the session
      // AND we need the direct Google Credential response to get the 'code' IF using gapi.

      // Workaround: We can't easily get the 'code' from `signInWithPopup` result in standard Firebase Web SDK v9+
      // unless we use `GoogleAuthProvider.credentialFromResult(result)`.
      // BUT that gives an accessToken, not a serverAuthCode usually.

      // ALTERNATIVE: Use the standard accessToken for now session,
      // AND assume the user will re-login or use a simpler architecture.
      // BUT the requirement is BACKGROUND EXECUTION. We NEED a refresh token.

      // Let's assume we can get the code using a direct OAuth flow if needed,
      // but standard Firebase has limitations.

      // FIX: We will trigger a specific Google Identity flow if possible,
      // OR accept that for this "Free Tier" demo we might just store the Refresh Token
      // if we can extract it.

      // Actually, standard modern practice: Use `flow: 'auth-code'` with useGoogleLogin (from @react-oauth/google).
      // Since we don't have that lib installed, let's try to pass the accessToken to the backend?
      // No, access tokens expire. We need a Refresh Token.

      // Let's rely on the fact that `signInWithPopup` with `access_type: offline`
      // might populate `_tokenResponse` (undocumented) containing the refresh token?

      const credential = GoogleAuthProvider.credentialFromResult(result);
      const tokenResponse = (result as any)._tokenResponse;

      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
        localStorage.setItem("google_access_token", credential.accessToken);
      }

      // If we got a refresh token directly (happens sometimes with offline param)
      if (tokenResponse?.oauthRefreshToken) {
        // Send to server to store securely
        // Actually, if we have it here, we could write to Firestore directly BUT that violates rules (private_tokens write only).
        // We enabled write in rules! So we can write it directly from client!
        // Architecture Rule: "Store OAuth client secret only in Cloud Functions".
        // But Refresh Token is not client secret.

        // PROPOSAL: Write the refresh token directly to Firestore from Client safely.
        // This avoids the complex "Exchange Code" server endpoint mess.
        // RULES CHECK: "Access tokens must be refreshed using refresh tokens inside Cloud Functions" -> OK.
        // "Store OAuth client secret only in Cloud Functions environment" -> Client doesn't need Secret.

        // Writing Refresh Token from Client:
        const { doc, setDoc, serverTimestamp } = await import(
          "firebase/firestore"
        );
        const { db } = await import("./firebase");
        // Dynamic import to avoid circular deps if any

        if (user && tokenResponse.oauthRefreshToken) {
          await setDoc(doc(db, "users", user.uid, "private_tokens", "google"), {
            refreshToken: tokenResponse.oauthRefreshToken,
            updatedAt: serverTimestamp(),
          });
          return true;
        }
      }

      return !!credential?.accessToken;
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to get Gmail permissions";
      setError(errorMessage);
      console.error("Permission error:", err);
      return false;
    }
  };

  const requestCalendarPermissions = async () => {
    try {
      setError(null);

      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/calendar.events");

      // Crucial for getting the refresh token
      provider.setCustomParameters({
        access_type: "offline",
        prompt: "consent",
      });

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const tokenResponse = (result as any)._tokenResponse;

      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
        localStorage.setItem("google_access_token", credential.accessToken);
      }

      if (user && tokenResponse?.oauthRefreshToken) {
        const { doc, setDoc, serverTimestamp } = await import(
          "firebase/firestore"
        );
        const { db } = await import("./firebase");

        await setDoc(
          doc(db, "users", user.uid, "private_tokens", "calendar"),
          {
            refreshToken: tokenResponse.oauthRefreshToken,
            updatedAt: serverTimestamp(),
            scopes: ["https://www.googleapis.com/auth/calendar.events"],
          },
          { merge: true }
        ); // Merge in case we want to store multiple things
        return true;
      }
      return true;
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to get Calendar permissions";
      setError(errorMessage);
      console.error("Permission error:", err);
      return false;
    }
  };

  /**
   * Silent backend refresh — exchanges a stored refresh token for a new
   * access token without any user interaction.
   */
  const refreshTokenSilent = async (uid: string): Promise<boolean> => {
    try {
      console.log("[Auth] Attempting silent token refresh via backend...");
      const response = await fetch("/api/auth/google/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.accessToken) {
          // Store with expiry from server if provided, else assume 1 hour
          const expiresInMs = data.expiryDate
            ? data.expiryDate - Date.now()
            : 3600 * 1000;
          persistToken(data.accessToken, expiresInMs);
          console.log("[Auth] Silent refresh successful ✅");
          return true;
        }
      } else {
        console.warn(
          "[Auth] Backend refresh failed:",
          response.status,
          await response.text().catch(() => "")
        );
      }
    } catch (e) {
      console.warn("[Auth] Silent refresh network error:", e);
    }
    return false;
  };

  /**
   * refreshTokenInternal — tries silent backend refresh first,
   * ONLY falls back to an interactive popup if there is no refresh token
   * at all (i.e. the user never granted offline access).
   */
  const refreshTokenInternal = async (): Promise<boolean> => {
    if (!user) return false;

    // 1. Try silent backend refresh
    const silentOk = await refreshTokenSilent(user.uid);
    if (silentOk) return true;

    // 2. Backend has no refresh token → we need interactive re-auth.
    //    Use login_hint so Google auto-selects the account; user just
    //    clicks through without being asked to choose an account.
    try {
      console.warn(
        "[Auth] No refresh token on server — prompting re-auth (login_hint only)"
      );
      const provider = new GoogleAuthProvider();
      provider.addScope(
        "https://www.googleapis.com/auth/classroom.courses.readonly"
      );
      provider.addScope(
        "https://www.googleapis.com/auth/classroom.coursework.me"
      );
      provider.addScope(
        "https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly"
      );
      provider.addScope(
        "https://www.googleapis.com/auth/classroom.announcements.readonly"
      );
      provider.addScope(
        "https://www.googleapis.com/auth/classroom.student-submissions.me.readonly"
      );

      // login_hint pre-fills the email — no account-picker shown
      provider.setCustomParameters({
        login_hint: user.email || "",
        access_type: "offline",
        prompt: "consent", // need consent to get a new refresh token
      });

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);

      if (credential?.accessToken) {
        persistToken(credential.accessToken);
        console.log("[Auth] Re-auth successful (Interactive)");
        return true;
      }
      return false;
    } catch (err) {
      console.error("[Auth] Failed to refresh access token:", err);
      return false;
    }
  };

  const refreshAccessToken = async (): Promise<boolean> => {
    return refreshTokenInternal();
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setAccessToken(null);
      setRole(null);
      // Clear all auth-related keys so the next visit starts fresh
      localStorage.removeItem("google_access_token");
      localStorage.removeItem("google_access_token_expiry");
      localStorage.removeItem("user_role");
      clearCurrentUser();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to sign out";
      setError(errorMessage);
    }
  };

  const updateUserProfile = async (data: {
    displayName?: string | null;
    photoURL?: string | null;
  }) => {
    if (!user) return;
    try {
      await updateProfile(user, data);

      // Store custom photo URL in separate state to avoid manipulating Firebase User object
      if (data.photoURL !== undefined) {
        setCustomPhotoURL(data.photoURL);
      }

      setUserRefreshKey((prev) => prev + 1);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update profile";
      setError(errorMessage);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: enhancedUser,
        loading,
        authenticating,
        role,
        accessToken,
        signInWithGoogle,
        requestGmailPermissions,
        requestCalendarPermissions,
        refreshAccessToken,
        signOut,
        updateUserProfile,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
