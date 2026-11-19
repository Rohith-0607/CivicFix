# CivicFix AI — Community Issue Reporting Portal

> **Student Prototype Notice:** CivicFix AI is an independent prototype built for the IDEA//FORGE solo hackathon. Reports submitted here are stored in a prototype database for demonstration and triage review; they are **not** routed to real municipal or government authorities.

CivicFix AI allows citizens to report local civic issues (such as road damage, water leaks, uncollected garbage, broken streetlights, and drainage blocks) in **English or Telugu (తెలుగు)**. A Google Gemini-backed assistant analyzes the report to suggest a classification category, urgency priority, municipal department, and an English summary for human administrator verification.

---

## 1. Key Features

- **Multilingual Interface & Input:** Full English, Telugu (`తెలుగు`), and Hindi (`हिन्दी`) dropdown with persistent language choice; accepts native Telugu and Hindi Unicode descriptions and accurately summarizes them in English.
- **AI Classification Engine (Gemini):** Server-side text analysis suggests category, priority, department, and summary with multilingual fallback if the AI service is unavailable.
- **Privacy-First Public Tracking:** Citizens receive a non-sequential tracking ID (e.g., `CF-7A2C9D4F`). The public board shows sanitized summaries and areas, keeping citizen names, landmarks, and photos private.
- **Photo Evidence via Private Storage:** Optional image upload (JPG, PNG, WebP up to 5 MB) stored in a private bucket with time-limited signed URLs generated strictly for admin review.
- **Protected Admin Management:** Overview dashboard, interactive real-time Leaflet GPS map, full complaint inspector, status updating (`Pending` $\rightarrow$ `In Progress` $\rightarrow$ `Resolved`), and normalized location analysis. Includes one-click demo login for effortless evaluator access.
- **Strict, Accessible Design System:** Responsive mobile-first layouts, consistent Lucide SVG icons, charcoal, off-white, teal, and lime palette with accessible contrast and zero visual bloat.

---

## 2. Project Architecture & File Directory

```text
civicfix-ai/
├── package.json               # Dependencies and scripts (Express, Supabase, Multer, etc.)
├── .env.example               # Template for environment configuration
├── .gitignore                 # Ignores node_modules, .env, logs
├── README.md                  # Comprehensive setup, test, and presentation guide
├── database/
│   └── schema.sql             # Supabase PostgreSQL table, indexes, trigger, and RLS policies
├── server/
│   ├── index.js               # Express application entry point, rate limiting, and page routing
│   ├── supabase.js            # Supabase database, storage client, and in-memory demo fallback
│   ├── ai.js                  # Gemini AI API integration, prompt safeguards, and heuristic fallback
│   ├── auth.js                # Admin token verification and allowlist authorization middleware
│   └── routes/
│       ├── public.js          # Public endpoints: /api/analyze, /api/complaints, /api/issues, /api/track
│       └── admin.js           # Protected admin endpoints: /api/admin/summary, complaints, locations
└── public/
    ├── index.html             # Citizen landing page with 3-step guide & common issues
    ├── report.html            # Civic issue submission form with AI preview & photo upload
    ├── issues.html            # Public issues board with live counters, search, and filters
    ├── track.html             # Status tracking lookup by tracking code
    ├── admin-login.html       # Supabase Auth email/password admin login
    ├── admin.html             # Admin overview dashboard with telemetry and top areas
    ├── admin-complaints.html  # Complaints review table and modal edit panel
    ├── admin-locations.html   # Location cluster analysis with normalized area grouping
    ├── css/
    │   └── style.css          # Mandatory design system stylesheet (no gradients/blur)
    └── js/
        ├── translations.js    # English and Telugu dictionary
        ├── common.js          # Language switcher, nav active states, and system health check
        ├── report.js          # Form validation, photo preview, AI trigger, and submit handler
        ├── issues.js          # Public board data fetching, filtering, and pagination
        ├── track.js           # Tracking code lookup handler
        └── admin.js           # Admin auth, dashboard metrics, modal updates, and charts
```

---

## 3. Quick Start & Setup

### Prerequisites
- **Node.js**: v18+ (tested on Node v20/v24 LTS)
- **Supabase Account**: (Free tier) For PostgreSQL, Auth, and Storage
- **Google Gemini API Key**: For AI report classification

### Step 1: Install Dependencies
Run in your terminal:
```bash
npm install
```
*(On Windows PowerShell, use `npm.cmd install` if execution policy is restricted).*

### Step 2: Database & Storage Setup (Supabase)
1. In your Supabase dashboard, open the **SQL Editor**.
2. Copy and execute the contents of `database/schema.sql`. This creates the `complaints` table, indexes, triggers, and the `complaint-photos` storage bucket.
3. In **Authentication > Users**, create an administrator user with an email and password (e.g. `admin@civicfix.local`). Note down the user's `UUID`.

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update the values:
```env
PORT=3000
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-secret-key
SUPABASE_ANON_KEY=your-supabase-anon-key
GEMINI_API_KEY=your-gemini-api-key
ADMIN_USER_ID=your-admin-user-uuid
```

> **Offline Demo Mode:** If you do not configure `.env`, CivicFix AI automatically runs in **Offline Demo Mode** with built-in in-memory sample records! You can log in to admin immediately using:
> - **One-Click Button:** Click **"One-Click Demo Admin Login"** on `/admin/login`
> - **Email:** `admin@civicfix.local`
> - **Password:** `admin123`

### Step 4: Run the Application
```bash
npm run dev
# or
npm start
```
Open your browser to: `http://localhost:3000`

---

## 4. End-to-End Hackathon Demo Script (Judge Walkthrough)

Follow this 5-minute flow to present CivicFix AI to evaluators or hackathon judges:

1. **Citizen Landing (`/`):**
   - Show the clean Indian civic portal aesthetic and point out the transparent student disclaimer banner.
   - Click the **తెలుగు** button in the header; demonstrate how all UI labels instantly transition into Telugu.

2. **Filing a Report in Telugu (`/report`):**
   - Click **Report Issue**.
   - Enter a Telugu description:
     `మా వీధిలో పెద్ద గుంత ఏర్పడింది, వర్షంలో ద్విచక్ర వాహనాలు జారి ప్రమాదాలు జరుగుతున్నాయి.`
   - Enter Location: `Kukatpally`
   - Click **Analyze with AI (AIతో విశ్లేషించండి)**:
     - Show the AI suggestion card populate with Category: `Road Damage`, Priority: `High`, Suggested Department: `Road Maintenance`, and an accurate English Summary: *"Large pothole on user street creating skid hazard for two-wheelers in rain."*
     - Emphasize to the judges: *AI predictions are visibly labeled as needing human review and are completely editable by the citizen before submission.*
   - Click **Submit Complaint**.
   - Copy the newly generated tracking ID (e.g., `CF-8A2F1B4E`).

3. **Public Issues Board (`/issues`):**
   - Navigate to the Public Issues board.
   - Show that the new report appears in real-time with status `Pending`.
   - Point out that private reporter names and landmarks are omitted to protect citizen privacy.
   - Test category and locality filters.

4. **Tracking (`/track`):**
   - Paste the tracking code into the track search input.
   - Show the status card with category, area, submission time, and assigned department.

5. **Admin Review & Status Triage (`/admin`):**
   - Go to `/admin/login` and log in.
   - Show the **Dashboard**: live complaint count cards, top reported areas horizontal bars, and category breakdown.
   - Go to **Complaints** (`/admin/complaints`) and click **Review** on the newly submitted complaint.
   - Show full citizen details, private landmark, AI diagnostics, and evidence photo.
   - Change Status to `In Progress`, add an internal note: *"Road maintenance patch team dispatched."*, and click **Save Changes**.

6. **Verify End-to-End Status Loop:**
   - Return to `/track` and refresh; verify that the status badge has updated to `In Progress`.

7. **Location Cluster Analysis (`/admin/locations`):**
   - Show how complaints with varying casing (`kukatpally`, `Kukatpally`, ` KUKATPALLY `) are grouped together into a unified cluster without requiring expensive GPS or invasive tracking.
   - Highlight the transparency notice stating that counts represent submitted reports, not verified ground truth.

---

## 5. Explaining the AI to Judges

When judges ask about the AI implementation:
- **Server-Side Security:** The Gemini API key is never exposed to the frontend. All AI interactions occur via the Node.js Express backend.
- **Prompt Injection Defense & Schema Validation:** User inputs are treated strictly as untrusted data. The Gemini model is prompted to return strict JSON matching an explicit schema. All returned categories and priorities are checked against whitelist enums on the server; invalid outputs are rejected and defaulted.
- **Fail-Safe Design:** If the Gemini API experiences network latency, rate limits, or downtime, the user is never blocked from submitting. The system automatically routes the report with `Unclassified` category and `Needs review` priority for manual human triage.
- **Responsible AI Boundaries:** AI priorities and department allocations are presented as informational recommendations to assist human triage, never as certified legal findings.

---

## 6. Deployment Guidelines

CivicFix AI runs on any standard Node.js hosting platform:
- **Render.com / Railway.app / Fly.io:**
  - Build command: `npm install`
  - Start command: `node server/index.js`
  - Configure the environment variables in the host settings dashboard.
- **Database & Storage:** Hosted on your cloud Supabase instance.
