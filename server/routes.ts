import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  // Initialize Firebase Admin (lazy load to avoid startup errors if credentials missing)
  const admin = await import("firebase-admin");
  const { google } = await import("googleapis");

  try {
    if (!admin.apps.length) {
      // In production, use env vars. For local dev, we might fallback.
      // NOTE: For this to work locally/Vercel, FIREBASE_SERVICE_ACCOUNT env var is needed
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
  } catch (e) {
    console.log(
      "Firebase admin init skipped or failed (expected in build step)"
    );
  }

  const db = admin.firestore();

  const CLIENT_ID =
    process.env.GOOGLE_CLIENT_ID ||
    "30992363510-5sbogcct8nmvql5ijr176jpm5ov2d7h9.apps.googleusercontent.com";
  const CLIENT_SECRET =
    process.env.GOOGLE_CLIENT_SECRET || "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";
  const REDIRECT_URI = "postmessage";

  const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
  );

  app.post("/api/auth/google/exchange", async (req, res) => {
    const { code, uid } = req.body;

    if (!code || !uid) {
      return res.status(400).json({ error: "Missing code or uid" });
    }

    try {
      const { tokens } = await oauth2Client.getToken(code);

      if (tokens.refresh_token) {
        await db
          .collection("users")
          .doc(uid)
          .collection("private_tokens")
          .doc("google")
          .set({
            refreshToken: tokens.refresh_token,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        return res.json({ success: true });
      } else {
        // Check if we already have one
        const doc = await db
          .collection("users")
          .doc(uid)
          .collection("private_tokens")
          .doc("google")
          .get();
        if (doc.exists) {
          return res.json({
            success: true,
            message: "Refresh token already exists",
          });
        }
        return res
          .status(400)
          .json({
            error: "No refresh token returned. Revoke access and try again.",
          });
      }
    } catch (error: any) {
      console.error("Token exchange failed", error?.response?.data || error);
      return res.status(500).json({ error: "Failed to exchange token" });
    }
  });

  app.post("/api/auth/google/refresh", async (req, res) => {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ error: "Missing uid" });
    }

    try {
      // 1. Get stored refresh token
      const doc = await db
        .collection("users")
        .doc(uid)
        .collection("private_tokens")
        .doc("google")
        .get();

      if (!doc.exists) {
        return res
          .status(404)
          .json({ error: "No refresh token found for user" });
      }

      const { refreshToken } = doc.data() as { refreshToken: string };

      if (!refreshToken) {
        return res.status(404).json({ error: "Refresh token is empty" });
      }

      // 2. Set the refresh token on the OAuth client
      oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      // 3. Refresh the access token
      const { credentials } = await oauth2Client.refreshAccessToken();

      // 4. Return new tokens
      return res.json({
        accessToken: credentials.access_token,
        expiryDate: credentials.expiry_date,
      });
    } catch (error: any) {
      console.error("Token refresh failed", error?.response?.data || error);
      return res
        .status(500)
        .json({ error: "Failed to refresh token", details: error.message });
    }
  });

  return httpServer;
}
