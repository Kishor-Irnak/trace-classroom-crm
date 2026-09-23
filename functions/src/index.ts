import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { google } from "googleapis";


admin.initializeApp();
const db = admin.firestore();

// Types
interface CalendarSettings {
  enabled: boolean;
  syncAssignments: boolean;
  syncExams: boolean; // Not distinguishable in Classroom API easily, maybe implies specific topics?
  syncPersonal: boolean;
}

interface CalendarEventMapping {
  courseWorkId: string;
  calendarEventId: string;
  updatedAt: admin.firestore.Timestamp;
}

// Config
const CLIENT_ID = functions.config().google?.client_id || "MISSING_CLIENT_ID";
const CLIENT_SECRET = functions.config().google?.client_secret || "MISSING_CLIENT_SECRET";
// You should set these using: firebase functions:config:set google.client_id="..." google.client_secret="..."

export const syncTraceCalendar = functions.pubsub.schedule("every 60 minutes").onRun(async (context) => {
  console.log("Starting Scheduled Calendar Sync...");

  if (CLIENT_ID === "MISSING_CLIENT_ID") {
      console.error("Missing Google Client ID/Secret in functions config.");
      return;
  }

  // 1. Get all users who have enabled calendar sync
  
  // Note: collectionGroup "settings" is risky if "settings" is a doc ID inside a collection. 
  // Better: loop users. But iterating all users is expensive.
  // Prompt guidance: "users/{uid}/settings/calendar" -> Document.
  // So we can query collection "users".
  
  // Efficient query: collection "users" doesn't have the setting at root.
  // The path is users/{uid}/settings/calendar.
  // We can't query subcollection "settings" across all users easily without collection group index 
  // on a specific field inside the doc.
  // But wait, the doc ID is "calendar" inside "settings" collection.
  // So we CAN use collectionGroup("settings") but we need to check if the doc ID is 'calendar'.
  // Actually, standard path: collection("users").doc(uid).collection("settings").doc("calendar").
  // So we can do db.collectionGroup("settings").where(admin.firestore.FieldPath.documentId(), "==", "calendar").where("enabled", "==", true).
  
  // Let's try collectionGroup query for enabled=true.
  const query = db.collectionGroup("settings").where("enabled", "==", true);
  const settingsSnaps = await query.get();

  for (const docSnap of settingsSnaps.docs) {
      if (docSnap.id !== "calendar") continue; // Ensure we are looking at the calendar settings doc

      const uid = docSnap.ref.parent.parent?.id;
      if (!uid) continue;

      const settings = docSnap.data() as CalendarSettings;
      
      try {
          await syncUserCalendar(uid, settings);
      } catch (err) {
          console.error(`Failed to sync for user ${uid}`, err);
      }
  }
});

async function syncUserCalendar(uid: string, settings: CalendarSettings) {
    // 1. Get Credentials
    const tokenDoc = await db.doc(`users/${uid}/private_tokens/calendar`).get();
    if (!tokenDoc.exists) {
        console.log(`No calendar token for user ${uid}`);
        return;
    }
    const { refreshToken } = tokenDoc.data() as { refreshToken: string };

    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    // 2. Services
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const classroom = google.classroom({ version: "v1", auth: oauth2Client });

    // 3. Fetch Assignments (if enabled)
    if (settings.syncAssignments) {
        // Fetch Courses first
        const coursesRes = await classroom.courses.list({ courseStates: ["ACTIVE"] });
        const courses = coursesRes.data.courses || [];

        for (const course of courses) {
            if (!course.id) continue;
            
            // Check course-level override (optional, per prompt guidance)
            // We'd need to store course-specific toggle in Firestore. skipping for now or assume globally enabled.

            // Fetch CourseWork with pagination to get ALL data (including old/historical)
            let pageToken: string | undefined = undefined;
            const allWorks: any[] = [];

            do {
                const courseWorkRes: any = await classroom.courses.courseWork.list({
                    courseId: course.id,
                    courseWorkStates: ["PUBLISHED"],
                    orderBy: "dueDate desc",
                    pageSize: 100, // Increase page size for efficiency
                    pageToken: pageToken
                });
                
                const works = courseWorkRes.data.courseWork || [];
                allWorks.push(...works);
                pageToken = courseWorkRes.data.nextPageToken;
            } while (pageToken);

            const works = allWorks;

            for (const work of works) {
                if (!work.dueDate) continue; // Skip if no due date
                
                // Construct Date
                // Google dates are {year, month, day}, times are {hours, minutes}
                // Month is 1-indexed in API?
                const year = work.dueDate.year;
                const month = work.dueDate.month; // 1-12
                const day = work.dueDate.day;
                
                if (!year || !month || !day) continue;
                
                // Create Date ISO string
                // Note: new Date(year, month-1, day)
                let dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                
                // Check if already synced
                const mapRef = db.doc(`users/${uid}/calendarEvents/${work.id}`);
                const mapDoc = await mapRef.get();
                
                const eventData: any = {
                    summary: `📚 ${work.title}`,
                    description: `Course: ${course.name}\n${work.description || ""}\n\nSynced via Trace`,
                    start: { date: dateStr },
                    end: { date: dateStr }, // All day for due date
                };

                if (work.dueTime) {
                   // If time exists, make it a specific time.
                   // Be careful with timezone.
                   // Google Classroom stores dueTime in UTC or local? usually implicit.
                   // The prompt said "Respect user timezone".
                   // We'll treat it as floating time or use user's timezone if known.
                   // Google Calendar API allows 'dateTime' with timezone.
                   // Without user timezone, we can rely on 'date' (all day) effectively, but strict deadline is better.
                   // Let's stick to ALL DAY events for deadlines usually, or put it at the time if provided.
                   
                   // work.dueTime has hours (0-23), minutes, nanos.
                   // Problem: We don't know the TZ of the Classroom.
                   // Calendar best practice: 'dateTime' requires offset.
                   // If we send 'dateTime' without offset, GCal assumes UTC or Calendar specific?
                   // 'dateTime': '2023-01-01T10:00:00' (no Z) -> uses Calendar time zone.
                   const hours = String(work.dueTime.hours || 0).padStart(2, '0');
                   const minutes = String(work.dueTime.minutes || 0).padStart(2, '0');
                   eventData.start = { dateTime: `${dateStr}T${hours}:${minutes}:00` };
                   eventData.end = { dateTime: `${dateStr}T${hours}:${minutes}:00` }; // 0 duration or 1 hour?
                }

                if (mapDoc.exists) {
                    // Update
                    const { calendarEventId } = mapDoc.data() as CalendarEventMapping;
                    try {
                        await calendar.events.patch({
                            calendarId: "primary",
                            eventId: calendarEventId,
                            requestBody: eventData
                        });
                        console.log(`Updated event for ${work.id}`);
                    } catch (e: any) {
                        if (e.code === 404) {
                             // Event deleted in calendar, recreate?
                             // Prompt: "Not duplicate on re-sync".
                             // Maybe we should respect deletion?
                             // But "Update if due date changes".
                             // Recreating is safer for "Sync".
                             const res = await calendar.events.insert({
                                calendarId: "primary",
                                requestBody: eventData
                            });
                             await mapRef.set({ calendarEventId: res.data.id, courseWorkId: work.id, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                        }
                    }
                } else {
                    // Create
                    const res = await calendar.events.insert({
                        calendarId: "primary",
                        requestBody: eventData
                    });
                    
                    if (res.data.id) {
                        await mapRef.set({
                            courseWorkId: work.id,
                            calendarEventId: res.data.id,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                        
                        // Add to Timeline (Passive)
                        await db.collection(`users/${uid}/timeline`).add({
                           type: "calendar_sync",
                           title: "Assignment added to Google Calendar",
                           detail: work.title,
                           timestamp: admin.firestore.FieldValue.serverTimestamp() 
                        });
                    }
                }
            }
        }
    }
}
