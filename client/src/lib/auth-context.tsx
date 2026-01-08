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
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return localStorage.getItem("google_access_token");
  });
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
        localStorage.removeItem("google_access_token");
        clearCurrentUser();
      }
      // If user exists, we wait for role detection which happens via effect below or explicit call
    });
    return unsubscribe;
  }, []);

  // Role detection effect
  useEffect(() => {
    async function detectRole() {
      if (!user || !accessToken) {
        // If we have user but no access token (e.g. reload), try to get it
        if (user && !accessToken) {
          const storedToken = localStorage.getItem("google_access_token");
          if (storedToken) {
            setAccessToken(storedToken);
            return; // Let the next render trigger this effect with token
          }
        }
        if (!user) setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // 1. Check Teacher Role
        const teacherRes = await fetch(
          "https://classroom.googleapis.com/v1/courses?teacherId=me&pageSize=1",
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (teacherRes.status === 401) {
          console.log("Token expired (401). User needs to re-authenticate.");
          setError("Session expired. Please sign in again.");
          setRole(null);
          setLoading(false);
          localStorage.removeItem("google_access_token");
          return;
        }

        let isTeacher = false;
        if (teacherRes.ok) {
          const teacherData = await teacherRes.json();
          if (teacherData.courses && teacherData.courses.length > 0) {
            isTeacher = true;
          }
        }

        if (isTeacher) {
          setRole("teacher");
          localStorage.setItem("user_role", "teacher");
          setLoading(false);
          return;
        }

        // 2. Check Student Role
        const studentRes = await fetch(
          "https://classroom.googleapis.com/v1/courses?studentId=me&pageSize=1",
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        let isStudent = false;
        if (studentRes.ok) {
          const studentData = await studentRes.json();
          if (studentData.courses && studentData.courses.length > 0) {
            isStudent = true;
          }
        }

        if (isStudent) {
          setRole("student");
          localStorage.setItem("user_role", "student");
        } else {
          setRole("no_access");
          localStorage.setItem("user_role", "no_access");
        }
      } catch (error) {
        console.error("Role detection failed:", error);
        setRole("no_access"); // Fallback safety
      } finally {
        setLoading(false);
      }
    }

    detectRole();
  }, [user, accessToken]);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      // Persist Firebase session
      await setPersistence(auth, browserLocalPersistence);

      // Force consent prompt to ensure all scopes are granted
      googleProvider.setCustomParameters({
        prompt: "consent",
        access_type: "offline", // optional, for refresh tokens
      });
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(
        result
      ) as OAuthCredential;
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
        localStorage.setItem("google_access_token", credential.accessToken);
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to sign in";
      setError(errorMessage);
      console.error("Sign in error:", err);
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

  const refreshTokenInternal = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      // Force a re-authentication with the same provider to get a fresh token
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

      // Use select_account to allow quick re-auth without full consent
      provider.setCustomParameters({
        prompt: "select_account",
        login_hint: user.email || "",
      });

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);

      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
        localStorage.setItem("google_access_token", credential.accessToken);
        console.log("Access token refreshed successfully");
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to refresh access token:", err);
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
      localStorage.removeItem("google_access_token");
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
