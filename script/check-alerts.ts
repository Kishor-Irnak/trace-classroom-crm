
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { google } from "googleapis";
import { addDays, isBefore, parseISO, startOfDay } from "date-fns";

// For local testing without process.env (unsafe in production, but helper for local script)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "30992363510-5sbogcct8nmvql5ijr176jpm5ov2d7h9.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "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";

// Initialize Firebase Admin
if (!getApps().length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        initializeApp({
            credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
        });
    } else {
        console.warn("No FIREBASE_SERVICE_ACCOUNT provided. Script might fail if not in a cloud environment that provides default credentials.");
        initializeApp();
    }
}

const db = getFirestore();

const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET
);

async function checkAlerts() {
    console.log("Starting alert check...");
    const usersSnapshot = await db.collection("users").get();

    for (const userDoc of usersSnapshot.docs) {
        const uid = userDoc.id;
        try {
            // 1. Check settings
            const settingsDoc = await db.collection("users").doc(uid).collection("settings").doc("notifications").get();
            if (!settingsDoc.exists) continue;
            
            const settings = settingsDoc.data();
            if (!settings?.enabled) continue;

            // 2. Get Refresh Token
            const tokenDoc = await db.collection("users").doc(uid).collection("private_tokens").doc("google").get();
            if (!tokenDoc.exists) {
                console.log(`No refresh token for ${uid}`);
                continue;
            }

            const { refreshToken } = tokenDoc.data() as { refreshToken: string };

            // 3. Authenticate Google Client
            oauth2Client.setCredentials({ refresh_token: refreshToken });
            const classroom = google.classroom({ version: 'v1', auth: oauth2Client });

            // 4. Fetch Assignments
            const now = new Date();
            const tomorrow = addDays(now, 1);
            
            let assignmentsDueIn24h = 0;
            const upcomingAssignments: string[] = [];
            
            // List courses
            const coursesRes = await classroom.courses.list({ studentId: 'me', courseStates: ['ACTIVE'] });
            const courses = coursesRes.data.courses || [];
            
            for (const course of courses) {
                if (!course.id) continue;
                const workRes = await classroom.courses.courseWork.list({
                     courseId: course.id,
                     orderBy: 'dueDate asc',
                     pageSize: 20
                });
                
                const works = workRes.data.courseWork || [];
                for (const work of works) {
                     if (!work.dueDate || !work.id) continue;
                     
                     const due = new Date(
                         work.dueDate.year || now.getFullYear(),
                         (work.dueDate.month || 1) - 1, 
                         work.dueDate.day || 1,
                         work.dueTime?.hours || 23,
                         work.dueTime?.minutes || 59,
                         0
                     );

                    if (settings.config?.dueReminder && isBefore(now, due) && isBefore(due, tomorrow)) {
                         assignmentsDueIn24h++;
                         upcomingAssignments.push(`${work.title} (${course.name})`);
                    }
                }
            }
            
            if (assignmentsDueIn24h > 0) {
                 const lastSent = settings.lastDueAlertSent ? parseISO(settings.lastDueAlertSent) : new Date(0);
                 if (isBefore(lastSent, addDays(now, -1))) {
                      console.log(`Sending email to ${uid} for ${assignmentsDueIn24h} assignments`);
                      
                      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
                      const profile = await gmail.users.getProfile({ userId: 'me' });
                      const emailAddress = profile.data.emailAddress;

                      await sendEmail(gmail, emailAddress!, 
                        `Trace Alert: ${assignmentsDueIn24h} assignment${assignmentsDueIn24h>1?'s':''} due soon`,
                        `Hi there,\n\nYou have the following assignments due in the next 24 hours:\n\n${upcomingAssignments.map(s => `• ${s}`).join('\n')}\n\nCheck them on Trace.`
                      );

                      await db.collection("users").doc(uid).collection("settings").doc("notifications").update({
                        lastDueAlertSent: now.toISOString()
                      });
                 } else {
                     console.log(`Skipping email for ${uid} (cooldown)`);
                 }
            }

        } catch (e) {
            console.error(`Error processing ${uid}:`, e);
        }
    }
    console.log("Check complete.");
}

async function sendEmail(gmail: any, to: string, subject: string, body: string) {
    const message = [
        `To: ${to}`,
        `Subject: ${subject}`,
        `Content-Type: text/plain; charset=utf-8`,
        ``,
        body
    ].join('\n');
    
    // Base64 encode
    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
            raw: encodedMessage
        }
    }); 
}

checkAlerts().catch(console.error);
