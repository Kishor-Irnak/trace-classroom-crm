import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Calendar,
  Trophy,
  Users,
  BookOpen,
  Bell,
  Target,
  TrendingUp,
} from "lucide-react";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-6 sm:p-12 lg:p-24">
      <div className="max-w-5xl mx-auto space-y-12">
        <header className="space-y-4 border-b border-border pb-8">
          <div className="flex items-center gap-2 mb-6">
            <Button
              variant="ghost"
              size="sm"
              className="px-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
              onClick={() => (window.location.href = "/")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            Trace Documentation
          </h1>
          <p className="text-muted-foreground text-lg">
            A comprehensive guide to mastering every feature of Trace
          </p>
        </header>

        {/* Table of Contents */}
        <nav className="bg-muted/30 rounded-xl p-6 border">
          <h2 className="text-lg font-semibold mb-4">Quick Navigation</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <a
              href="#dashboard"
              className="text-sm hover:text-primary transition-colors"
            >
              → Dashboard Overview
            </a>
            <a
              href="#timeline"
              className="text-sm hover:text-primary transition-colors"
            >
              → Timeline View
            </a>
            <a
              href="#attendance"
              className="text-sm hover:text-primary transition-colors"
            >
              → Attendance Tracking
            </a>

            <a
              href="#leaderboard"
              className="text-sm hover:text-primary transition-colors"
            >
              → Leaderboard System
            </a>
            <a
              href="#notifications"
              className="text-sm hover:text-primary transition-colors"
            >
              → Notifications
            </a>
            <a
              href="#notes"
              className="text-sm hover:text-primary transition-colors"
            >
              → Class Materials
            </a>
            <a
              href="#badges"
              className="text-sm hover:text-primary transition-colors"
            >
              → Achievements & Badges
            </a>
          </div>
        </nav>

        {/* Feature Sections */}
        <div className="space-y-16">
          {/* Dashboard */}
          <section id="dashboard" className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Dashboard</h2>
                <p className="text-sm text-muted-foreground">
                  Your command center for all activities
                </p>
              </div>
            </div>

            <div className="bg-muted/20 rounded-xl p-8 border space-y-4">
              <svg
                className="w-full h-48 mx-auto"
                viewBox="0 0 800 200"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="20"
                  y="20"
                  width="180"
                  height="160"
                  rx="12"
                  fill="currentColor"
                  className="text-primary/10"
                />
                <rect
                  x="220"
                  y="20"
                  width="180"
                  height="160"
                  rx="12"
                  fill="currentColor"
                  className="text-emerald-500/10"
                />
                <rect
                  x="420"
                  y="20"
                  width="180"
                  height="160"
                  rx="12"
                  fill="currentColor"
                  className="text-amber-500/10"
                />
                <rect
                  x="620"
                  y="20"
                  width="160"
                  height="160"
                  rx="12"
                  fill="currentColor"
                  className="text-blue-500/10"
                />
                <text
                  x="110"
                  y="110"
                  textAnchor="middle"
                  className="text-xs fill-current"
                >
                  Metrics
                </text>
                <text
                  x="310"
                  y="110"
                  textAnchor="middle"
                  className="text-xs fill-current"
                >
                  Attendance
                </text>
                <text
                  x="510"
                  y="110"
                  textAnchor="middle"
                  className="text-xs fill-current"
                >
                  Due Soon
                </text>
                <text
                  x="700"
                  y="110"
                  textAnchor="middle"
                  className="text-xs fill-current"
                >
                  Rank
                </text>
              </svg>

              <div className="space-y-4 pt-4">
                <h3 className="font-semibold">Key Features:</h3>
                <ul className="space-y-3">
                  <li className="flex gap-3">
                    <span className="text-primary">✓</span>
                    <div>
                      <strong>Assignment Metrics</strong> - Quick overview of
                      upcoming deadlines (3 days, 7 days, overdue)
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary">✓</span>
                    <div>
                      <strong>Overall Attendance</strong> - Aggregated
                      attendance percentage across all courses
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary">✓</span>
                    <div>
                      <strong>Class Ranking</strong> - See your position in the
                      class leaderboard based on XP
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary">✓</span>
                    <div>
                      <strong>Weekly Focus Alert</strong> - Highlighted banner
                      when you have tasks due in the next 7 days
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary">✓</span>
                    <div>
                      <strong>Next Actions</strong> - Smart list of assignments
                      prioritized by urgency
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
              <p className="text-sm">
                <strong>💡 Pro Tip:</strong> Click on any assignment card to see
                full details and submission links!
              </p>
            </div>
          </section>

          {/* Timeline */}
          <section id="timeline" className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <Calendar className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Timeline View</h2>
                <p className="text-sm text-muted-foreground">
                  Visual calendar of all your assignments
                </p>
              </div>
            </div>

            <div className="bg-muted/20 rounded-xl p-8 border space-y-4">
              <svg
                className="w-full h-56 mx-auto"
                viewBox="0 0 800 240"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Timeline bars */}
                <rect
                  x="50"
                  y="40"
                  width="200"
                  height="24"
                  rx="4"
                  fill="currentColor"
                  className="text-blue-500/30"
                />
                <rect
                  x="280"
                  y="80"
                  width="150"
                  height="24"
                  rx="4"
                  fill="currentColor"
                  className="text-emerald-500/30"
                />
                <rect
                  x="150"
                  y="120"
                  width="180"
                  height="24"
                  rx="4"
                  fill="currentColor"
                  className="text-amber-500/30"
                />
                <rect
                  x="400"
                  y="160"
                  width="220"
                  height="24"
                  rx="4"
                  fill="currentColor"
                  className="text-red-500/30"
                />
                <rect
                  x="100"
                  y="200"
                  width="160"
                  height="24"
                  rx="4"
                  fill="currentColor"
                  className="text-purple-500/30"
                />
                {/* Timeline axis */}
                <line
                  x1="40"
                  y1="10"
                  x2="760"
                  y2="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-border"
                />
                <text
                  x="400"
                  y="250"
                  textAnchor="middle"
                  className="text-xs fill-current text-muted-foreground"
                >
                  Time →
                </text>
              </svg>

              <div className="space-y-4 pt-4">
                <h3 className="font-semibold">Key Features:</h3>
                <ul className="space-y-3">
                  <li className="flex gap-3">
                    <span className="text-primary">✓</span>
                    <div>
                      <strong>Horizontal Gantt View</strong> - See all
                      assignments laid out chronologically
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary">✓</span>
                    <div>
                      <strong>Color-Coded Courses</strong> - Each course has its
                      unique color for easy identification
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary">✓</span>
                    <div>
                      <strong>Zoom Controls</strong> - Adjust timeline scale to
                      see days, weeks, or months
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary">✓</span>
                    <div>
                      <strong>Interactive Bars</strong> - Click any assignment
                      bar to view details and open submission link
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
              <p className="text-sm">
                <strong>💡 Pro Tip:</strong> Use the zoom in/out buttons to
                adjust the timeline scale for better planning!
              </p>
            </div>
          </section>

          {/* Attendance */}
          <section id="attendance" className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <Calendar className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Attendance Tracking</h2>
                <p className="text-sm text-muted-foreground">
                  Real-time attendance monitoring from Google Sheets
                </p>
              </div>
            </div>

            <div className="bg-muted/20 rounded-xl p-8 border space-y-4">
              <svg
                className="w-full h-48 mx-auto"
                viewBox="0 0 800 200"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="100"
                  cy="100"
                  r="60"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-border"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="60"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeDasharray="283 377"
                  className="text-emerald-500"
                />
                <text
                  x="100"
                  y="105"
                  textAnchor="middle"
                  className="text-2xl font-bold fill-current"
                >
                  75%
                </text>

                <rect
                  x="250"
                  y="40"
                  width="500"
                  height="30"
                  rx="4"
                  fill="currentColor"
                  className="text-muted"
                />
                <rect
                  x="250"
                  y="40"
                  width="375"
                  height="30"
                  rx="4"
                  fill="currentColor"
                  className="text-emerald-500/50"
                />
                <text
                  x="500"
                  y="105"
                  textAnchor="middle"
                  className="text-sm fill-current"
                >
                  15/20 Classes Attended
                </text>
              </svg>

              <div className="space-y-4 pt-4">
                <h3 className="font-semibold">Key Features:</h3>
                <ul className="space-y-3">
                  <li className="flex gap-3">
                    <span className="text-primary">✓</span>
                    <div>
                      <strong>Per-Course Tracking</strong> - Individual
                      attendance percentage for each subject
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary">✓</span>
                    <div>
                      <strong>Google Sheets Integration</strong> - Teachers link
                      their Google Sheets to automatically track attendance
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary">✓</span>
                    <div>
                      <strong>Status Indicators</strong> - Color-coded alerts
                      (Safe: 75%+, Warning: 70-75%, Danger: &lt;70%)
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary">✓</span>
                    <div>
                      <strong>Data Privacy</strong> - Password protection option
                      for sensitive attendance sheets
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold">⚠️ Setup Required:</p>
              <p className="text-sm">
                Teachers need to configure attendance sheets in Settings.
                Students see data only after teacher setup.
              </p>
            </div>
          </section>

          {/* Leaderboard */}
          <section id="leaderboard" className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <Trophy className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Leaderboard & XP System</h2>
                <p className="text-sm text-muted-foreground">
                  Compete and earn rewards for academic progress
                </p>
              </div>
            </div>

            <div className="bg-muted/20 rounded-xl p-8 border space-y-4">
              <svg
                className="w-full h-56 mx-auto"
                viewBox="0 0 800 240"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Podium */}
                <rect
                  x="320"
                  y="60"
                  width="160"
                  height="120"
                  fill="currentColor"
                  className="text-amber-500/20"
                />
                <rect
                  x="140"
                  y="100"
                  width="160"
                  height="80"
                  fill="currentColor"
                  className="text-slate-400/20"
                />
                <rect
                  x="500"
                  y="120"
                  width="160"
                  height="60"
                  fill="currentColor"
                  className="text-orange-600/20"
                />
                <text
                  x="400"
                  y="130"
                  textAnchor="middle"
                  className="text-3xl font-bold fill-current text-amber-500"
                >
                  1
                </text>
                <text
                  x="220"
                  y="150"
                  textAnchor="middle"
                  className="text-2xl font-bold fill-current text-slate-500"
                >
                  2
                </text>
                <text
                  x="580"
                  y="160"
                  textAnchor="middle"
                  className="text-2xl font-bold fill-current text-orange-600"
                >
                  3
                </text>
                <text
                  x="400"
                  y="220"
                  textAnchor="middle"
                  className="text-sm fill-current"
                >
                  Based on Total XP
                </text>
              </svg>

              <div className="space-y-4 pt-4">
                <h3 className="font-semibold">How to Earn XP:</h3>
                <ul className="space-y-3">
                  <li className="flex gap-3">
                    <span className="text-emerald-500">+50 XP</span>
                    <div>
                      Complete an assignment <strong>before deadline</strong>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-500">+100 XP</span>
                    <div>Unlock achievement badges</div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-purple-500">+25 XP</span>
                    <div>Daily streak milestone</div>
                  </li>
                </ul>

                <h3 className="font-semibold pt-4">Leaderboard Views:</h3>
                <ul className="space-y-3">
                  <li className="flex gap-3">
                    <span className="text-primary">•</span>
                    <div>
                      <strong>Class View</strong> - Compete with classmates in
                      your courses
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary">•</span>
                    <div>
                      <strong>College View</strong> - See rankings across your
                      entire institution
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
              <p className="text-sm">
                <strong>💡 Pro Tip:</strong> Maintain a daily streak by
                completing at least one task each day to earn bonus XP!
              </p>
            </div>
          </section>

          {/* Notifications */}
          <section id="notifications" className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/10 rounded-xl">
                <Bell className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Activity Notifications</h2>
                <p className="text-sm text-muted-foreground">
                  Stay updated on classmate achievements
                </p>
              </div>
            </div>

            <div className="bg-muted/20 rounded-xl p-8 border space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                  <div className="p-2 bg-emerald-500/10 rounded-full mt-1">
                    <Trophy className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <strong>Rahul Kumar</strong> earned the "Perfect Week"
                      badge!
                    </p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                  <div className="p-2 bg-blue-500/10 rounded-full mt-1">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <strong>Priya Sharma</strong> moved up to #3 on the
                      leaderboard!
                    </p>
                    <p className="text-xs text-muted-foreground">5 hours ago</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <h3 className="font-semibold">What You'll See:</h3>
                <ul className="space-y-3">
                  <li className="flex gap-3">
                    <span className="text-primary">✓</span>
                    <div>
                      <strong>Badge Achievements</strong> - When classmates
                      unlock new badges
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary">✓</span>
                    <div>
                      <strong>Leaderboard Updates</strong> - Significant rank
                      changes
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary">✓</span>
                    <div>
                      <strong>Squad Activities</strong> - New members joining,
                      achievements
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
              <p className="text-sm">
                <strong>💡 Pro Tip:</strong> Red dot on bell icon indicates
                unread notifications!
              </p>
            </div>
          </section>

          {/* Notes/Materials */}
          <section id="notes" className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Class Materials & Notes</h2>
                <p className="text-sm text-muted-foreground">
                  Access all study resources in one place
                </p>
              </div>
            </div>

            <div className="bg-muted/20 rounded-xl p-8 border space-y-4">
              <svg
                className="w-full h-48 mx-auto"
                viewBox="0 0 800 200"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="50"
                  y="40"
                  width="150"
                  height="140"
                  rx="8"
                  fill="currentColor"
                  className="text-blue-500/10"
                />
                <rect
                  x="230"
                  y="40"
                  width="150"
                  height="140"
                  rx="8"
                  fill="currentColor"
                  className="text-emerald-500/10"
                />
                <rect
                  x="410"
                  y="40"
                  width="150"
                  height="140"
                  rx="8"
                  fill="currentColor"
                  className="text-purple-500/10"
                />
                <rect
                  x="590"
                  y="40"
                  width="150"
                  height="140"
                  rx="8"
                  fill="currentColor"
                  className="text-amber-500/10"
                />
                <text
                  x="125"
                  y="120"
                  textAnchor="middle"
                  className="text-xs fill-current"
                >
                  PDFs
                </text>
                <text
                  x="305"
                  y="120"
                  textAnchor="middle"
                  className="text-xs fill-current"
                >
                  Links
                </text>
                <text
                  x="485"
                  y="120"
                  textAnchor="middle"
                  className="text-xs fill-current"
                >
                  Videos
                </text>
                <text
                  x="665"
                  y="120"
                  textAnchor="middle"
                  className="text-xs fill-current"
                >
                  Docs
                </text>
              </svg>

              <div className="space-y-4 pt-4">
                <h3 className="font-semibold">Key Features:</h3>
                <ul className="space-y-3">
                  <li className="flex gap-3">
                    <span className="text-primary">✓</span>
                    <div>
                      <strong>All File Types</strong> - View PDFs, documents,
                      links, videos, and more
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary">✓</span>
                    <div>
                      <strong>Auto-Sync from Classroom</strong> - Automatically
                      fetches materials posted by teachers
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary">✓</span>
                    <div>
                      <strong>Organized by Course</strong> - Filter materials by
                      subject for easy access
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary">✓</span>
                    <div>
                      <strong>Search Functionality</strong> - Quickly find
                      specific materials by title or description
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
              <p className="text-sm">
                <strong>💡 Pro Tip:</strong> Use the course filter dropdown to
                view materials for specific subjects!
              </p>
            </div>
          </section>

          {/* Badges & Achievements */}
          <section id="badges" className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-500/10 rounded-xl">
                <Trophy className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Achievements & Badges</h2>
                <p className="text-sm text-muted-foreground">
                  Unlock rewards for consistent performance
                </p>
              </div>
            </div>

            <div className="bg-muted/20 rounded-xl p-8 border space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-background rounded-lg border">
                  <div className="text-3xl mb-2">🏆</div>
                  <div className="text-xs font-medium">Streak Master</div>
                  <div className="text-xs text-muted-foreground">
                    7 day streak
                  </div>
                </div>
                <div className="text-center p-4 bg-background rounded-lg border">
                  <div className="text-3xl mb-2">📚</div>
                  <div className="text-xs font-medium">Book Worm</div>
                  <div className="text-xs text-muted-foreground">
                    50 completed
                  </div>
                </div>
                <div className="text-center p-4 bg-background rounded-lg border">
                  <div className="text-3xl mb-2">✅</div>
                  <div className="text-xs font-medium">Perfect Week</div>
                  <div className="text-xs text-muted-foreground">
                    100% attendance
                  </div>
                </div>
                <div className="text-center p-4 bg-background rounded-lg border">
                  <div className="text-3xl mb-2">⚡</div>
                  <div className="text-xs font-medium">Early Bird</div>
                  <div className="text-xs text-muted-foreground">
                    Submit early
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <h3 className="font-semibold">Available Badges:</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">
                      📊 Academic Excellence
                    </h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Task Crusher (50 assignments)</li>
                      <li>• Centurion (100 assignments)</li>
                      <li>• Maximum Effort (200 assignments)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2">📅 Attendance</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Perfect Week (100% weekly)</li>
                      <li>• Attendance Champion</li>
                      <li>• Never Miss</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2">🔥 Consistency</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• On Fire (3 day streak)</li>
                      <li>• Unstoppable (7 day streak)</li>
                      <li>• Immortal (30 day streak)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2">
                      ⏰ Time Management
                    </h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Early Bird (submit early)</li>
                      <li>• Just in Time (last minute)</li>
                      <li>• Time Lord (never late)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
              <p className="text-sm">
                <strong>🎯 Challenge yourself:</strong> Try to collect all
                badges! Each one awards bonus XP.
              </p>
            </div>
          </section>
        </div>

        {/* Getting Started Guide */}
        <section className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-8 border border-primary/20">
          <h2 className="text-2xl font-bold mb-6">🚀 Quick Start Guide</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold">Sign in with Google</h3>
                <p className="text-sm text-muted-foreground">
                  Connect your Google Classroom account to sync courses and
                  assignments
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold">Explore the Dashboard</h3>
                <p className="text-sm text-muted-foreground">
                  Check your upcoming tasks, attendance, and class ranking
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold">Join or Create a Squad</h3>
                <p className="text-sm text-muted-foreground">
                  Team up with friends to compete on the leaderboard
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h3 className="font-semibold">Start Earning XP</h3>
                <p className="text-sm text-muted-foreground">
                  Complete assignments and unlock badges to climb the
                  leaderboard
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Support Section */}
        <section className="border-t pt-8">
          <h2 className="text-xl font-semibold mb-4">Need Help?</h2>
          <p className="text-muted-foreground mb-4">
            If you have questions or need assistance with any feature, feel free
            to reach out:
          </p>
          <a
            href="mailto:irnakkishor4u@gmail.com"
            className="text-primary hover:underline font-medium"
          >
            irnakkishor4u@gmail.com
          </a>
        </section>

        <footer className="pt-8 mt-8 border-t text-sm text-muted-foreground text-center">
          © {new Date().getFullYear()} Trace - Your Academic Command Center
        </footer>
      </div>
    </div>
  );
}
