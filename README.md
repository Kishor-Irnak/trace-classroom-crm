# Trace - Student OS & CRM

![Trace Banner](client/public/logo.png)

> **Google Classroom, Supercharged.**

Trace is a powerful Student Operating System (OS) designed to transform scattered Google Classroom data into a professional, streamlined project management workflow. Built for students who want to take control of their academic life, Trace treats assignments like projects, grades like metrics, and learning like a game.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)
![Stack](https://img.shields.io/badge/stack-React%20%7C%20Firebase%20%7C%20Tailwind-blueviolet)

---

## 🚀 Why Trace?

Google Classroom is great for submission, but not for **management**.
Trace bridges the gap by pulling your live assignment data and reorganizing it into professional views used by top-tier productivity software.

- **No more missing deadlines:** See everything in a unified timeline.
- **Prioritize effectively:** Use Kanban boards to manage your workflow.
- **Stay motivated:** Earn XP, rank up on the leaderboard, and compete with classmates.
- **Analyze performance:** Visualise your workload and grade trends.

---

## ✨ Key Features

### 📊 **Smart Dashboard**

Your command center. Get an instant overview of your academic health.

- **Urgency Metrics:** "Due in 3 Days", "Overdue", and "Total Active" counters.
- **Weekly Workload:** A bar chart visualization of your upcoming assignment density.
- **Next Actions:** An intelligent list of what you need to work on _right now_.
- **Ranking:** See your real-time standing in the class leaderboard.

### 📋 **Pipeline (Kanban Board)**

Visualize your work in stages. Drag and drop assignments as you progress.

- **Columns:** To Do, In Progress, Submitted, Graded.
- **Visual cues:** Overdue items are highlighted; high-value assignments stand out.

### ⏳ **Linear Timeline**

A chronological view of your semester.

- Scroll through your academic timeline to see exactly when "Crunch Weeks" are coming up.
- Never be blindsided by a deadline again.

### 🏆 **Gamified Leaderboard**

Turn studying into a sport.

- **XP System:** Earn **100 XP** for every assignment submitted.
- **Speedster Bonus:** Get **+50 XP** for submitting >48 hours before the deadline.
- **Global Layout:** Compete across "All Courses" or filter by specific classes.
- **Historical Sync:** One-click import to calculate XP from all your past work.

### 📝 **Course Notes**

A dedicated space for your thoughts.

- Keep personal notes linked directly to specific courses.
- Rich text organization for study guides and quick reminders.

### 🎨 **Premium "Attio-Style" Design**

- **Monochrome Aesthetic:** A clean, distraction-free interface using black, white, and zinc.
- **Dark & Light Mode:** Fully supported and automatically detected.
- **Responsive:** Works perfectly on Desktop, Tablet, and Mobile.

---

## 🛠️ Technology Stack

- **Frontend:** React (Vite), TypeScript
- **Styling:** Tailwind CSS, Radix UI, Lucide Icons
- **Backend / DB:** Firebase (Firestore, Auth, Cloud Functions)
- **Integration:** Google Classroom API (OAuth 2.0)
- **Hosting:** GitHub Pages / Vercel

---

## 🏗️ Installation & Setup

### Prerequisites

- Node.js (v18+)
- A Firebase Project with Firestore and Auth enabled.
- A Google Cloud Project with the **Google Classroom API** enabled.

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/trace-classroom-crm.git
cd trace-classroom-crm
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Config

Create a `.env` file in the `client` directory:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

### 4. Run Locally

```bash
npm run dev
```

### 5. Build & Deploy

```bash
# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

---

## 🤝 Contribution

Contributions are welcome! Please fork the repository and submit a pull request for any features, bug fixes, or design improvements.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Built with ❤️ by Kishor Irnak
</p>
