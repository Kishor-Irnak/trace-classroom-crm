import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { CacheService } from "./cache-service";

// --- Types ---
export interface CourseAttendanceConfig {
  courseId: string;
  sheetUrl: string;
  passKey: string;
  isVisible: boolean;
  emailColumn: string; // Column letter where student emails are stored (A, B, C, etc.)
  updatedAt: number;
}

export interface AttendanceStats {
  totalClasses: number;
  attendedClasses: number;
  percentage: number;
  lastUpdated?: string;
}

export interface StudentAttendanceRecord {
  date: string;
  status: "Present" | "Absent" | "Excused" | "Unknown";
}

export interface CourseAttendanceData {
  courseId: string;
  stats: AttendanceStats;
  history: StudentAttendanceRecord[];
}

const COLLECTION_NAME = "attendance_configs";

// --- Service ---
export const AttendanceService = {
  /**
   * Parse the Sheet ID from a standard Google Sheets URL.
   */
  extractSheetId(url: string): string | null {
    // Regex for standard /spreadsheets/d/ID/edit
    const matches = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (matches && matches[1]) {
      return matches[1];
    }
    return null;
  },

  /**
   * Save configuration for a specific course to Firestore.
   */
  async saveCourseConfig(
    courseId: string,
    config: Omit<CourseAttendanceConfig, "updatedAt" | "courseId">
  ): Promise<void> {
    const fullConfig: CourseAttendanceConfig = {
      courseId,
      ...config,
      updatedAt: Date.now(),
    };
    await setDoc(doc(db, COLLECTION_NAME, courseId), fullConfig);
    // Invalidate cache
    CacheService.remove(`attn_config_${courseId}`);
  },

  /**
   * Retrieve configuration for a course from Firestore.
   */
  async getCourseConfig(
    courseId: string
  ): Promise<CourseAttendanceConfig | null> {
    try {
      const cacheKey = `attn_config_${courseId}`;
      const cached = CacheService.get<CourseAttendanceConfig>(cacheKey);
      if (cached) return cached;

      const docRef = doc(db, COLLECTION_NAME, courseId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as CourseAttendanceConfig;
        CacheService.set(cacheKey, data, 60 * 60); // Cache for 1 hour
        return data;
      } else {
        return null; // Don't cache nulls (or maybe we should? for performance)
      }
    } catch (e) {
      console.error("Failed to fetch course config", e);
      return null;
    }
  },

  /**
   * Validate Pass Key for a course.
   */
  async validatePassKey(courseId: string, keyInput: string): Promise<boolean> {
    const config = await this.getCourseConfig(courseId);
    if (!config) return false;
    // Case-insensitive check for better UX
    return (
      config.passKey.trim().toUpperCase() === keyInput.trim().toUpperCase()
    );
  },

  /**
   * Fetch and parse attendance data from Google Sheets.
   * @param sheetId Google Sheet ID
   * @param accessToken Google OAuth Access Token
   * @param studentEmail Email to match row
   */
  async fetchAttendanceFromSheet(
    sheetId: string,
    accessToken: string,
    studentEmail: string,
    emailColumn: string = "A" // Default to column A if not specified
  ): Promise<CourseAttendanceData> {
    if (!sheetId || !accessToken) {
      throw new Error("Missing credentials or sheet ID");
    }

    const cacheKey = `attn_data_${sheetId}_${studentEmail}`;
    const cached = CacheService.get<CourseAttendanceData>(cacheKey);
    if (cached) {
      return cached;
    }

    // Convert column letter to index (A=0, B=1, C=2, etc.)
    const emailColIndex = emailColumn.toUpperCase().charCodeAt(0) - 65;

    // 1. Fetch a very large range to ensure we get all columns
    // Use ZZ (702 columns) to support any realistic attendance sheet
    // The dynamic logic below will stop when it finds empty headers
    const range = "A1:ZZ500";
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?majorDimension=ROWS`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 403)
        throw new Error(
          "Permission denied. Share sheet with the OAuth client or user (ensure 'Read' access)."
        );
      if (response.status === 404) throw new Error("Sheet not found.");
      throw new Error("Failed to fetch sheet data.");
    }

    const data = await response.json();
    const rows = data.values as string[][];

    if (!rows || rows.length < 2) {
      throw new Error("Sheet is empty or invalid format.");
    }

    // 2. Parse Logic
    // Assumption: Row 1 = Headers (Dates/Labels)
    // emailColIndex = Column where emails are stored
    const headers = rows[0];

    // Find student row using the specified email column
    const studentRow = rows.find((row) => {
      const idCell = row[emailColIndex]?.toLowerCase().trim();
      return idCell === studentEmail.toLowerCase().trim();
    });

    if (!studentRow) {
      throw new Error(
        `Student not found in attendance sheet (searched in column ${emailColumn}).`
      );
    }

    // Calculate stats
    let total = 0;
    let attended = 0;
    const history: StudentAttendanceRecord[] = [];

    // Dynamically iterate through columns starting from index 1 (after email column)
    // Stop when we encounter empty headers (no more dates)
    for (let i = 1; i < headers.length; i++) {
      const date = headers[i]?.trim();

      // Stop processing if we hit an empty header (no more date columns)
      if (!date) {
        break;
      }

      const rawStatus = studentRow[i]?.toUpperCase().trim(); // 'P', 'A', '1', '0'

      let status: StudentAttendanceRecord["status"] = "Unknown";

      // Logic: P/1 = Present, A/0 = Absent
      if (rawStatus === "P" || rawStatus === "PRESENT" || rawStatus === "1") {
        status = "Present";
        attended++;
        total++;
      } else if (
        rawStatus === "A" ||
        rawStatus === "ABSENT" ||
        rawStatus === "0"
      ) {
        status = "Absent";
        total++;
      }
      // We can handle 'Excused' or empty cells as 'no class' or ignore
      else if (rawStatus) {
        // Unknown/Other codes ignored for stats
      }

      if (status !== "Unknown") {
        history.push({ date, status });
      }
    }

    const percentage = total === 0 ? 0 : Math.round((attended / total) * 100);

    const result: CourseAttendanceData = {
      courseId: sheetId,
      stats: {
        totalClasses: total,
        attendedClasses: attended,
        percentage,
      },
      history: history.reverse(), // Newest first
    };

    // Cache for 30 minutes
    CacheService.set(cacheKey, result, 60 * 30);

    return result;
  },
};
