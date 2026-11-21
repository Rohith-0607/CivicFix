# CivicFix AI — AI-Powered Civic Issue Reporting & Triage Platform

> **Developer & Hackathon Note:** Hi, I built **CivicFix AI** as an independent prototype for the IDEA//FORGE Hackathon. This project demonstrates how modern AI, multilingual comprehension, and spatial intelligence can transform community civic problem reporting. All reports submitted in this demo are stored in a prototype database for demonstration, testing, and triage review; they are **not** routed to real municipal or government authorities.

---

## 1. About the Project: Why I Built CivicFix AI

In many urban and semi-urban communities—particularly in bilingual cities like Hyderabad—citizens encounter everyday civic infrastructure breakdowns: deep potholes, overflowing garbage bins, water pipeline ruptures, dark streets from broken lamps, and clogged stormwater drains. 

However, reporting these issues often breaks down due to three major friction points:
1. **Language & Literacy Barriers:** Most municipal web forms require formal English, making it hard for citizens who communicate naturally in Telugu (తెలుగు) or Hindi (हिन्दी) to describe problems accurately.
2. **Administrative Triage Overload:** Municipal back-offices receive thousands of unstructured complaints daily without prioritization, department tagging, or location clustering, leading to delayed action.
3. **Lack of Transparent Tracking & Citizen Privacy:** Citizens often don't receive verifiable tracking IDs, or conversely, public grievance boards leak citizen names, exact phone numbers, and landmarks.

**I designed and built CivicFix AI to solve all three problems:**
- Citizens can report issues by typing or speaking in their native language (English, Telugu, or Hindi).
- A Google Gemini-backed backend analyzes the unstructured description, standardizes an English summary, estimates urgency priority, and identifies the correct municipal department.
- Citizens receive an anonymous tracking code (`CF-XXXXXXXX`), while administrators get a full management dashboard with live Leaflet maps, photo evidence, and status controls.

---

## 2. Key Features I Built

### 🌐 1. Multilingual Citizen Interface (English, తెలుగు, हिन्दी)
- Interactive language selector supporting English, Telugu, and Hindi with persistent user preference.
- Supports native Telugu and Hindi Unicode descriptions (e.g., *"మా కాలనీలో రోడ్డు మీద పెద్ద గుంత ఏర్పడింది"*).
- Zero-shot multilingual translation and summarization into standardized English for municipal engineers.

### 🧠 2. AI Triage Engine (Google Gemini with Heuristic Safeguards)
- Classifies complaints into canonical categories: `Road Damage`, `Garbage`, `Water Leakage`, `Streetlights`, `Drainage`, `Other`, or `Unclassified`.
- Assigns hazard-based priorities (`High`, `Medium`, `Low`, or `Needs review`).
- Recommends the responsible municipal department (e.g., `Roads & Infrastructure`, `Sanitation`, `Water Supply`, `Street Lighting`).
- **Fail-Safe Architecture:** If the Gemini API key is not configured, rate-limited, or offline, my built-in rule-based heuristic classifier automatically triages the report so the user is never blocked.

### 📍 3. Live Database-Driven Map & Locality Intelligence
- Integrated Leaflet map on both the citizen board and admin dashboard that dynamically plots verified GPS coordinates.
- For complaints without GPS coordinates, my system aggregates reports by locality (`Kukatpally`, `Miyapur`, `Hitech City`, etc.) into dynamic cluster summaries.
- No invented coordinates or fake pins: map pins reflect real database records.

### 📷 4. Photo Evidence Storage & Admin Review
- Citizens can upload optional photographic proof (JPG, PNG, WebP up to 5 MB).
- In production, photos are stored in Supabase private storage and served through time-limited signed URLs.
- In local demo mode, my backend automatically saves uploads to `public/uploads/` with unique cryptographically random file hashes.
- Admins see a `📷 Photo` badge directly on the complaints table and can inspect the full-resolution evidence in the review modal.

### 🔒 5. Hardened Security & Privacy
- **Zero Frontend Secrets:** No API keys, database credentials, or service roles are exposed to the client.
- **Server-Side Authentication:** Protected admin routes (`/api/admin/*`) require server-verified Bearer tokens.
- **Privacy Protection:** Public issue boards and tracking pages redact citizen names and private landmarks.

---

## 3. Technology Stack & Architecture

I designed CivicFix AI as a clean, performant, and dependency-disciplined full-stack web application:

- **Backend Runtime:** Node.js (v18+) with Express.js
- **Database & Storage:** Supabase (PostgreSQL with Row Level Security, Storage Buckets, and Auth) + Local in-memory fallback store
- **AI Processing:** Google Gemini API (`@google/genai` / `gemini-1.5` / `gemini-2.5`) with strict schema prompts and server-side whitelist validation
- **Mapping & Geospatial:** Leaflet.js with OpenStreetMap tiles
- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3 Custom Properties (zero bulky heavyweight frameworks)
- **Design System:** Custom Civic Tech Palette (`#102B30` Dark Teal, `#167D70` Green, `#C8E66B` Lime Accent, `#F7F8F6` Off-White) and Lucide SVG icons

### Project File Directory

```text
civicfix-ai/
├── package.json               # Dependencies and scripts (Express, Supabase, Multer)
├── vercel.json                # Vercel serverless routing, clean URLs & function config
├── .vercelignore              # Deployment exclusion rules for Vercel builds
├── .env.example               # Template for cloud environment configuration
├── .gitignore                 # Ignores node_modules, .env, public/uploads
├── README.md                  # Project overview, architecture, and evaluation guide
├── test.js                    # Automated 16-point verification & security test suite
├── api/
│   └── index.js               # Vercel Serverless Function entry point wrapping Express
├── database/
│   └── schema.sql             # Supabase PostgreSQL table, RLS policies, indexes
├── server/
│   ├── index.js               # Express application entry, security headers, static routes
│   ├── supabase.js            # Database client, cloud/local storage, map coordinates
│   ├── ai.js                  # Gemini AI classifier, prompt guardrails, heuristic engine
│   ├── auth.js                # Server-side admin authentication & session validation
│   └── routes/
│       ├── public.js          # Public routes: /api/analyze, /api/complaints, /api/issues, /api/track
│       └── admin.js           # Admin routes: /api/admin/summary, complaints, locations
└── public/
    ├── index.html             # Citizen home page with 3-step reporting workflow
    ├── report.html            # Civic issue submission form with photo preview & AI test
    ├── issues.html            # Public issues board with live Leaflet map & filters
    ├── track.html             # Complaint tracking lookup by code
    ├── admin-login.html       # Secure administrator login page
    ├── admin.html             # Full admin dashboard: complaints table, map, and telemetry
    ├── css/
    │   └── style.css          # Design system stylesheet
    └── js/
        ├── translations.js    # English, Telugu, and Hindi dictionary definitions
        ├── common.js          # Language switcher dropdown, navigation, and health checks
        ├── report.js          # Form validation, photo upload, AI preview trigger
        ├── issues.js          # Public issues table, real-time map plotting & locality grid
        ├── track.js           # Status lookup and photo evidence rendering
        └── admin.js           # Admin authentication, Leaflet real-time map, review modal
```

---

## 4. How to Run My Project Locally

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: (Optional) Configure Cloud Keys
If you want to connect a live Supabase database and live Gemini API key, copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
And populate your keys:
```env
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_ANON_KEY=your-supabase-anon-key
GEMINI_API_KEY=your-gemini-api-key
ADMIN_USER_ID=your-admin-user-uuid
```

> **Zero-Config Demo Mode:** You do **not** need a Supabase or Gemini account to test this project! If `.env` is not set, my application automatically boots in **Offline In-Memory Demo Mode** with pre-seeded sample data, local file upload handling, and keyword-based heuristic AI fallback.

### Step 3: Run the Server
```bash
npm start
# or for development mode:
node server/index.js
```
Open your browser to: **`http://localhost:3000`**

### Step 4: Run the Automated Verification Tests
I built an automated end-to-end verification and regression test suite in `test.js` covering 16 critical acceptance & security audit checks:
```bash
node test.js
```
The 16 tests verify system status, public issue feeds, Telugu AI triage, complaint creation with photo upload, status tracking, admin authentication, admin complaint inspection, route availability, negative authentication assertions (401 on unauthorized admin requests), file magic-byte validation (400 on spoofed files), citizen privacy safeguards (omission of landmark & citizen details from public endpoints), coordinate integrity (zero synthetic GPS coords), and full status update workflow.

---

## 5. Deploying to Vercel (Production Setup)

CivicFix AI is fully pre-configured for zero-friction serverless deployment on **Vercel**.

### Step 1: Import the GitHub Repository into Vercel
1. Log in to [vercel.com](https://vercel.com) and click **Add New...** → **Project**.
2. Select your imported GitHub repository: `https://github.com/Rohith-0607/CivicFix`.
3. In the project configuration screen:
   - **Framework Preset:** `Other` (detected automatically)
   - **Root Directory:** `./`
   - **Build Command:** Leave empty
   - **Output Directory:** Leave empty
   - **Install Command:** Leave default (`npm install`)

### Step 2: Configure Vercel Environment Variables
Under the **Environment Variables** section in your Vercel Project Settings, add:

| Variable Name | Required | Description |
| :--- | :---: | :--- |
| `NODE_ENV` | **Yes** | Set to `production` (enforces cloud storage & disables demo auth) |
| `SUPABASE_URL` | **Yes** | Your Supabase Project URL (`https://xyzcompany.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Your Supabase backend service-role secret key (kept strictly server-side) |
| `SUPABASE_ANON_KEY` | **Yes** | Your Supabase client anonymous public key |
| `GEMINI_API_KEY` | **Yes** | Your Google Gemini API key for automated multilingual triage |
| `ADMIN_USER_ID` | Optional | Supabase Auth UUID of the administrator allowed to access the admin portal |

> **Security Note:** Neither `SUPABASE_SERVICE_ROLE_KEY` nor `GEMINI_API_KEY` is ever exposed to client-side browser code. All database and AI calls execute strictly inside the Vercel serverless function (`api/index.js`).

### Step 3: Configure Supabase Database & Storage
1. In your Supabase Dashboard, open **SQL Editor** and run the contents of `database/schema.sql`.
2. Under **Storage** in Supabase, ensure a bucket named `complaint-photos` exists. Set it to private or apply standard read policies.

### Step 4: Deploy & Verify
1. Click **Deploy**. Vercel will build the project and assign a production URL (e.g., `https://civicfix.vercel.app`).
2. Test the deployed endpoints:
   - Homepage: `https://your-domain.vercel.app/`
   - System Status: `https://your-domain.vercel.app/api/system-status`
   - Reporting: `https://your-domain.vercel.app/report`
   - Issues Board: `https://your-domain.vercel.app/issues`
   - Status Tracking: `https://your-domain.vercel.app/track`
   - Admin Login: `https://your-domain.vercel.app/admin/login`

### Local Vercel Testing
To test the serverless routing locally using the official Vercel CLI:
```bash
npx vercel dev
```

---

## 6. Walkthrough: How to Evaluate My Project (Hackathon Demo Script)

Here is the exact 5-minute flow I recommend to explore and test what I built:

### 1. Citizen Landing Page (`/`)
- Visit `http://localhost:3000/`.
- Notice the clean civic design, transparent student disclaimer banner, and three-step guide.
- Click the language selector in the top navbar and switch between **English**, **తెలుగు (Telugu)**, and **हिन्दी (Hindi)** to see the interface update dynamically.

### 2. Reporting an Issue with AI Triage (`/report`)
- Click **Report Issue**.
- Enter a Telugu description:
  > *"మా వీధిలో పెద్ద గుంత ఏర్పడింది, వర్షంలో ద్విచక్ర వాహనాలు జారి ప్రమాదాలు జరుగుతున్నాయి."*
- Enter Location: `Kukatpally`
- (Optional) Attach a photo of the problem.
- Click **Analyze with AI (AIతో విశ్లేషించండి)**:
  - Watch the Gemini triage assistant classify it: Category: `Road Damage`, Priority: `High`, Suggested Department: `Roads & Infrastructure`, with an accurate English summary.
  - Notice that all AI predictions remain fully editable by the citizen before submission.
- Click **Submit Complaint** and copy your generated tracking code (e.g. `CF-XXXXXXXX`).

### 3. Public Issues Board & Real-Time Map (`/issues`)
- Navigate to the **Issues** tab.
- Your submitted complaint appears immediately at the top with status `Pending`.
- Click **Map View** to see verified reports plotted on the interactive Leaflet map and summarized in the locality cluster grid.
- Test the Category and Status filters to see list and map updates in real time.

### 4. Citizen Complaint Tracking (`/track`)
- Open the **Track Complaint** page.
- Enter your tracking code.
- View the complaint record showing category, location, submitted timestamp, assigned department, and uploaded photo evidence (with private citizen details redacted).

### 5. Administrator Portal (`/admin`)
- Go to `/admin/login`.
- Enter the demo administrator credentials:
  - **Email:** `admin@civicfix.local`
  - **Password:** `admin123`
- Inside the **Admin Dashboard**:
  - View real-time complaint counters, category share donut chart, and city-wide Leaflet heatmap.
  - Switch to the **Complaints** tab to see all citizen submissions.
  - Notice the **`📷 Photo`** badge next to complaints with image evidence.
  - Click **Review** on your submitted complaint to open the modal, inspect citizen remarks and full-resolution photo, change status to `In Progress` or `Resolved`, add an internal note, and save.
- Return to `/track` to confirm that the citizen-facing tracking page immediately reflects the updated status.

---

## 7. How I Designed Responsible AI & Security Guardrails

When developing the AI integration, I focused heavily on safety and reliability:
- **Server-Side Isolation:** The Gemini API key is never bundled into frontend assets. All AI analysis requests pass through rate-limited Express endpoints.
- **Strict Whitelist Output Schema:** User descriptions are treated as untrusted input. The Gemini prompt strictly demands JSON adhering to defined category and priority enums. Any unknown category is safely caught and sanitized to `Unclassified`.
- **Informational AI Triage:** AI predictions assist human administrators; they do not make irreversible automated legal decisions or close tickets without human verification.
- **Defense in Depth:** Even if external AI endpoints suffer network delays or quota limits, the platform's heuristic fallback ensures complaints are always processed and saved.

---

## 8. Future Roadmap

If I continue expanding CivicFix AI into production:
1. **WhatsApp & SMS Bot:** Allowing citizens without smartphones to report civic issues via a WhatsApp chatbot or toll-free SMS.
2. **Automated WhatsApp Status Alerts:** Sending automatic message notifications to citizens when their complaint transitions from `In Progress` to `Resolved`.
3. **Computer Vision Duplicate Detection:** Using image embedding similarity to cluster multiple photos of the same pothole or garbage dump submitted by different citizens.
4. **Official Department Webhook Integration:** Bi-directional API connectors syncing tickets directly into municipal portals like GHMC (Praveena) or Hyderabad Water Board grievance desks.

---

*Thank you for evaluating CivicFix AI! If you have any questions about the code, architecture, or design decisions, please feel free to inspect the codebase or open an issue.*
