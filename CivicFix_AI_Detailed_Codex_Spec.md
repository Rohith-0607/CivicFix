# CivicFix AI — Detailed Build Specification for Codex
**Version:** 2.0 | **Project:** IDEA//FORGE solo hackathon | **Target:** Working MVP by 22 November 2026, 11:59 PM IST

## 1. One-sentence brief
Build a small, real, responsive civic issue reporting website for Indian citizens. A citizen reports a local problem in English or Telugu, optionally attaches a photo, and receives an AI-suggested category, urgency, department, and explanation. The complaint is stored and publicly trackable; a protected demo administrator reviews it and updates its status.

### Product rules
- Independent **student hackathon prototype**, **not** a government service. Show this disclaimer in footer and admin login. No government seals, official branding, fake partnerships, fake statistics, or false dispatch claims.
- Use plain, beginner-readable code. Implement the requested features only. Prioritize a functioning end-to-end workflow over visual effects.
- No real government routing: `suggested_department` is informational only. Admin actions are simulated management of this prototype's records.
- Do not label AI predictions as verified facts. Human admin can correct them.

## 2. Target users and their jobs
**Citizen (no login):** Understand what the site does; report an issue; enter a locality; optionally upload evidence; see/review AI suggestions; submit; receive a tracking code; look up public status; browse public issues.

**Admin (login required):** See submitted complaints; review AI results; correct category/priority/department; change status; see counts, common categories and which reported locations have the most submissions.

## 3. Pages and navigation
Use server-served static HTML pages or simple routes. Keep filenames and navigation consistent.

| Page | Route | Main content |
|---|---|---|
| Citizen Home | `/` | Header, clear hero, issue examples, 3-step explanation, report CTA |
| Report Issue | `/report` | Description, location, optional name/photo, AI preview, submit |
| Public Issues | `/issues` | Live counts, public issue list, search and filters |
| Track Complaint | `/track` | Tracking-code input and privacy-safe status result |
| Admin Login | `/admin/login` | Email/password login and prototype notice |
| Admin Overview | `/admin` | Summary cards, recent complaints, top reported locations |
| Admin Complaints | `/admin/complaints` | Search/filter table, review/edit/status controls |
| Admin Location Analysis | `/admin/locations` | Top 5 reported areas, counts and category breakdown |

Navigation: **Home · Issues · Track Complaint · Report Issue · English/తెలుగు**. Admin has a separate sidebar: **Dashboard · Complaints · Location Analysis · Logout**. Do not expose admin edit controls on citizen pages. Provide active navigation state.

## 4. Detailed citizen experience
### 4.1 Home
- Brand text `CivicFix AI` with sublabel `Community Issue Reporting`.
- Main heading: **Report a problem in your area.**
- Supporting text: **Tell us about road damage, garbage, water leaks and other local issues. AI helps organize the report for review.**
- Primary CTA: **Report an issue**; secondary text link: **Track a complaint**.
- Show supported issue types: Road Damage, Garbage, Water Leakage, Streetlights, Drainage, Other.
- Show 3 steps: **Describe the issue → Review AI suggestions → Submit and track**.
- Use a credible, licensed/local photo of an Indian street or urban setting only if an actual image asset is available. No AI cartoon, invented official logo, or misleading government seal. A text-only hero is acceptable.
- Footer: `CivicFix AI is an independent student prototype. Reports are not sent to government authorities.`

### 4.2 Report form
Required fields:
- `description`: textarea, 20–1500 characters, accepts Telugu Unicode and English. Clear helper text with example.
- `location_area`: text, 2–100 characters, e.g. `Kukatpally`.
Optional fields:
- `landmark`: text, max 120 characters, e.g. `Near bus stop`.
- `reporter_name`: text, max 80 characters; private and never on public APIs.
- `photo`: one JPG, PNG or WebP image, up to 5 MB.

Actions:
1. User enters information and may preview/remove image.
2. **Analyze with AI** calls server endpoint; show loading text, then editable/reviewable suggestions: category, priority, department, reason, English summary. AI analysis is optional; citizen can submit even if it fails.
3. **Submit complaint** validates inputs, stores complaint and optional photo, returns a unique tracking code.
4. Success state shows tracking code, **Copy ID**, **Track complaint**, and a truthful note that submission is to the demo system only.
5. Prevent accidental double-submission with disabled button while saving and server-side idempotency strategy if feasible. Show actionable errors; never claim success before the server confirms it.

AI suggestions must be visibly labeled `AI suggestion — needs human review`. If AI fails, allow manual submission with category `Unclassified`, priority `Needs review` (internal enum) and an empty reason.

### 4.3 Public Issues
- Counters calculated from database: Total, Pending, In Progress, Resolved. Do not hardcode live numbers.
- Complaint cards or a readable table: tracking code (public code only), short safe summary, category, approximate area, priority suggestion, date and status.
- Filters: category and status; search by area or issue text; newest first.
- Never show name, exact private details, internal UUID, private image storage paths, or admin notes.
- To avoid revealing personal details, public summaries should be short, sanitized and may omit specific landmarks; do not publish full raw descriptions by default.
- Empty state: `No reports found. Try a different filter.`

### 4.4 Track Complaint
- Tracking-code input, e.g. `CF-7A2C9D4F` (example only).
- Display status, category, area, created date, last updated date and priority as an AI suggestion.
- Invalid/unknown code: `We couldn't find a complaint with that ID.`
- Tracking codes should be unpredictable, not sequential. Apply basic request rate limiting.

## 5. Admin experience
### 5.1 Authentication
- One admin account is enough. Use **Supabase Auth** email/password for the demo admin; server verifies the Supabase access token and checks an allowlisted admin user ID or admin role stored server-side.
- Do **not** rely on hiding the admin link, frontend checks or a hardcoded password. No shared public admin password in repository.
- Admin-only endpoints must verify authentication **and** admin authorization on every request.
- Show a clear Logout button; redirect unauthorized users to login.

### 5.2 Dashboard
- Real database counts: Total, Pending, In Progress, Resolved.
- Recent complaints table: code, issue summary, area, category, priority, status, submitted date, View/Edit.
- `Top reported areas` horizontal bars using real grouped complaint counts.
- `Categories` simple list/bars with counts. Avoid charts requiring heavy libraries.
- Show empty states if no data. Never invent performance or response-time metrics.

### 5.3 Complaints management
- List searchable by code, area, category and status.
- Detail panel: full description, optional evidence photo through time-limited access, AI summary/reason, location, creation date and current status.
- Admin may change category, priority, suggested department and status. Status enum: `Pending`, `In Progress`, `Resolved`.
- Save changes to database and show confirmation only after success. Keep `updated_at` current.
- Optional admin-only `admin_note` field, never public.

### 5.4 Location Analysis
- Group by **normalized area** (`trim`, case-fold, collapse repeated spaces; maintain a separate normalized field). No geocoding or GPS required.
- Top 5 areas by number of **reports received** with count and horizontal bars; category breakdown for each area or selected area.
- Add date range filter only if easy. Show note: `These figures count submitted reports, not verified problem frequency.`
- Do not call this a precise geographic heatmap without coordinates.

## 6. AI behavior (Gemini)
- Gemini API called **only from Express backend**; never embed key in HTML/JS.
- Send user description and area as untrusted data, not instructions. Request structured JSON. Validate output server-side and reject unexpected categories/priorities.
- Allowed categories: `Road Damage`, `Garbage`, `Water Leakage`, `Streetlights`, `Drainage`, `Other`, `Unclassified`.
- Allowed AI priorities: `Low`, `Medium`, `High`. Fallback: `Needs review`.
- Department is a **suggestion**, not official routing. Examples: `Road Maintenance`, `Sanitation`, `Water Supply`, `Street Lighting`, `Drainage`, `Municipal Services`.
- Reason: 1–2 sentences citing signals from user description. Do not invent accidents, injuries, locations, or confirmed hazards.
- `english_summary`: concise English rendering of the reported problem, preserving uncertainty.
- Telugu input: understand and summarize in English; preserve original Telugu description in database. Interface language selector changes UI labels, not user text.
- AI photo interpretation is **not required**. Uploaded image is evidence only. If later added, label it optional and do not claim forensic verification.

Example input: `మా వీధిలో నీటి పైపు లీక్ అవుతోంది.`
Example response (illustrative, not a real model call):
```json
{
  "category": "Water Leakage",
  "priority": "Medium",
  "department": "Water Supply",
  "reason": "The report describes an active pipe leak, but gives no evidence of immediate danger.",
  "english_summary": "A water pipe is leaking on the user's street."
}
```

AI integration safeguards: server timeout, error handling, reasonable text length limits, JSON schema validation, avoid storing API credentials in logs, and manual fallback. Do not promise 100% classification accuracy.

## 7. Data model (Supabase PostgreSQL)
### `complaints`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid primary key | Server/database generated |
| `tracking_code` | text unique not null | Random public lookup code |
| `description` | text not null | Original language; private to admin |
| `location_area` | text not null | Entered area |
| `normalized_area` | text not null | Normalized for grouping |
| `landmark` | text nullable | Keep out of public list by default |
| `reporter_name` | text nullable | Private |
| `photo_path` | text nullable | Private storage path |
| `category` | text not null | Allowed category |
| `priority` | text not null | Low/Medium/High/Needs review |
| `suggested_department` | text nullable | AI suggestion or admin correction |
| `ai_reason` | text nullable | Explanation |
| `english_summary` | text nullable | Public-safe summary after sanitization |
| `status` | text not null | Pending by default |
| `admin_note` | text nullable | Private |
| `created_at` | timestamptz not null | Database default now() |
| `updated_at` | timestamptz not null | Updated on edits |

Provide a SQL file that creates table, defaults, constraints and indexes on `tracking_code`, `created_at`, `normalized_area`, `status`. Ensure access policies deny direct anonymous database writes; backend controls writes. Store photos in a **private** Supabase Storage bucket. Backend uses service credentials only server-side. Use short-lived signed photo URLs only for authorized admin review.

## 8. API contract (Express)
Use JSON responses with consistent shape `{ success: boolean, data?: ..., error?: string }`.

| Method | Endpoint | Access | Behavior |
|---|---|---|---|
| `POST` | `/api/analyze` | Public, rate-limited | `{description, location_area}` → validated AI suggestions |
| `POST` | `/api/complaints` | Public, rate-limited | multipart form data → save record and optional photo → `{tracking_code,status}` |
| `GET` | `/api/issues` | Public | Safe paginated/filterable list and aggregate counts |
| `GET` | `/api/track/:code` | Public, rate-limited | Safe tracking status only |
| `GET` | `/api/admin/complaints` | Admin | Full complaint list |
| `GET` | `/api/admin/complaints/:id` | Admin | Detail and authorized photo URL |
| `PATCH` | `/api/admin/complaints/:id` | Admin | Update category/priority/department/status/note |
| `GET` | `/api/admin/summary` | Admin | Real counts, recent reports, category counts |
| `GET` | `/api/admin/locations` | Admin | Top areas and category breakdown |

Implementation details:
- Validate every request on the server, not just browser. Escape user-generated text via `textContent` instead of injecting HTML.
- Limit upload size and verify MIME type and file signature when practical. Generate safe server-side filenames.
- Keep CORS same-origin by default; use security headers, rate limiting, and sensible body-size limits.
- Return 400 for invalid input, 401/403 for unauthorized access, 404 for missing complaint, 429 for rate limits, 500/503 for server/AI failures.
- If photo upload succeeds but database save fails, delete orphaned uploaded file where possible.
- Public list uses pagination (e.g. 20 records/page) to avoid loading everything.

## 9. Frontend design system — mandatory
**Direction:** Credible Indian civic-service portal with restrained cyberpunk influence. Human-designed, not a generic AI startup landing page.

**Colors:** charcoal `#17242B`; off-white `#F7F8F6`; teal `#287D78`; lime accent `#C8E66B`; text `#18252B`; white `#FFFFFF`. Use accessible contrast, especially for buttons.

**Fonts:** Inter with system sans-serif fallback. Monospace only for IDs or small metadata.

**Spacing:** use only `4, 8, 12, 16, 24, 32, 48, 64, 96px`.

**Radii:** 4px for buttons/inputs; 8px for cards; no larger rounded shapes.

**Strictly forbidden:** gradients, box shadows, glassmorphism, blur, animated blobs, decorative shapes, scroll animations, floating mockups, purple, fake testimonials, fake metrics, stock government logos, pricing section.

**Only animation:** a single page-load opacity fade from 0 to 1 in 300ms; respect `prefers-reduced-motion`. No hover transitions or other animations.

**Layout:** readable widths, responsive header, mobile stacked form, tables that scroll horizontally if needed, large enough touch targets, clearly labeled inputs and visible keyboard focus. Avoid cards inside cards and excessive decorative UI. Simple thin borders, solid fills and generous but controlled whitespace.

**Voice:** direct, human and useful. Avoid `seamless`, `unlock`, `revolutionize`, `AI-powered future`, and exaggerated claims. The AI analysis section can simply say `Suggested category`, `Suggested priority`, `Why this priority?`.

**Indian feel:** use realistic local street imagery only when licensing is clear. English/తెలుగు language selector in citizen header; city names like Kukatpally, Miyapur and Hitech City are permitted only as **clearly labeled sample data** in demo mode. Do not claim official Telangana affiliation.

## 10. English/Telugu UI translations
Use a small `translations.js` object, not a complex internationalization framework. Translate visible labels, navigation, buttons, validation messages and status labels. Example keys:
- `home`: Home / హోమ్
- `reportIssue`: Report an Issue / సమస్యను నివేదించండి
- `issues`: Issues / సమస్యలు
- `trackComplaint`: Track Complaint / ఫిర్యాదును ట్రాక్ చేయండి
- `description`: Issue Description / సమస్య వివరణ
- `location`: Location / ప్రదేశం
- `uploadPhoto`: Upload Photo / ఫోటో అప్‌లోడ్ చేయండి
- `analyze`: Analyze with AI / AIతో విశ్లేషించండి
- `submit`: Submit Complaint / ఫిర్యాదు సమర్పించండి
- `pending`: Pending / పెండింగ్‌లో ఉంది
- `inProgress`: In Progress / ప్రక్రియలో ఉంది
- `resolved`: Resolved / పరిష్కరించబడింది
Store selected language in `localStorage`. Do not auto-translate user complaint content.

## 11. Suggested folder structure
```text
civicfix-ai/
  package.json
  .gitignore
  .env.example
  README.md
  database/
    schema.sql
  public/
    index.html
    report.html
    issues.html
    track.html
    admin-login.html
    admin.html
    admin-complaints.html
    admin-locations.html
    css/
      style.css
    js/
      common.js
      translations.js
      report.js
      issues.js
      track.js
      admin.js
    assets/
      (licensed local image if available)
  server/
    index.js
    supabase.js
    ai.js
    auth.js
    routes/
      public.js
      admin.js
```
Codex may simplify files when appropriate, but do not combine all logic into one enormous file. Explain each file in README.

## 12. Environment variables and setup
`.env.example` must contain placeholders only:
```env
PORT=3000
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_server_only_key
SUPABASE_ANON_KEY=your_public_anon_key
GEMINI_API_KEY=your_gemini_api_key
ADMIN_USER_ID=your_supabase_auth_admin_user_id
```
Never commit `.env`, secrets, database credentials or private user information. Codex must not invent credentials. Use actual installed Node LTS and a currently supported Gemini SDK/model; make model name configurable rather than hardcoding an unsupported one.

README must explain: prerequisites (Node.js, VS Code, Supabase project, Gemini API key), install (`npm install`), SQL setup, private photo bucket setup, create admin user, configure `.env`, run (`npm run dev`), open `http://localhost:3000`, test workflow, and deploy to a Node-compatible host. Do not claim Vercel static hosting alone can run a persistent Express server.

## 13. Build stages and checkpoints
**Stage A — Frontend (first):** Implement all pages, navigation, responsive styling, bilingual selector and sample UI placeholders. Use clear `DEMO DATA` labels; no fake working claims. Check on desktop/mobile.

**Stage B — Real storage:** Set up SQL and backend; create, list and track real text complaints. Remove placeholder counts when real data is connected. Test new report appears in issues list.

**Stage C — Admin:** Implement Supabase Auth, server admin checks, list/detail and status edits. Verify unauthorized requests fail.

**Stage D — AI:** Integrate Gemini text classification, English/Telugu support, validation and manual fallback. Test both languages.

**Stage E — Evidence and analytics:** Private photo upload, preview, admin viewing, filters, location ranking and category breakdown. Test invalid files and normalization.

**Stage F — Finish:** Accessibility, mobile fixes, error states, security sanity checks, README, deployment, demo and submission checklist.

At each stage: run the app, fix errors, explain what changed, and provide one manual test. Do not start the next stage if the current stage is broken.

## 14. Acceptance tests (must pass)
1. Home, Report, Issues, Track and Admin pages open without broken navigation.
2. English complaint can be submitted and gets a unique non-sequential tracking code.
3. Telugu complaint can be submitted without text corruption; AI returns a sensible English summary.
4. AI output contains only allowed category/priority values and a short explanation; malformed AI output is handled.
5. When Gemini is unavailable, citizen can still submit and record is marked for review.
6. Photo preview/removal works; JPG/PNG/WebP up to 5 MB accepted; oversized/unsupported files rejected on server.
7. Public Issues counters and list reflect actual database records; no private names or notes exposed.
8. Tracking code returns correct status; invalid code shows a neutral error.
9. Admin can log in, inspect and update status; anonymous users cannot use admin endpoints.
10. Admin status update appears in public tracking after refresh.
11. Location Analysis groups `Kukatpally`, ` kukatpally ` and `KUKATPALLY` together.
12. Area ranking and category breakdown use real stored counts; empty data renders gracefully.
13. English/తెలుగు switch changes UI labels without changing stored complaint description.
14. Site works at narrow mobile and desktop widths; keyboard navigation and form labels work.
15. No secrets in browser bundles, repository, or public API responses.

## 15. Known limits and demo honesty
- This prototype does **not** submit reports to government departments.
- AI priorities are suggestions and may be wrong; an admin can override them.
- Location analysis shows where users **reported** problems, not where verified problems are most common.
- Uploaded photos are evidence, not automatic proof.
- A public list should expose only approximate area and safe summary; no private user details.
- Do not claim enterprise-scale availability, guaranteed resolution, or verified accuracy.

## 16. What Codex must deliver
- Runnable project source, SQL schema, `.env.example`, `.gitignore`, README and concise setup guide.
- Clean code with straightforward names and comments only where they explain non-obvious behavior.
- Working frontend + backend + AI + Supabase features as specified, with no pretend integrations.
- A simple explanation: `What each main file does`, `How to run`, `How to test`, `How to deploy`, and `How to explain the AI to judges`.
- A short demo script showing citizen Telugu report → AI suggestions → saved tracking code → admin review → public status update → top reported locations.

## 17. Paste this instruction into Codex
> Read `CivicFix_AI_Detailed_Codex_Spec.md` completely. Build CivicFix AI exactly to this specification, prioritizing simple, readable, beginner-friendly HTML/CSS/JavaScript and a small Node/Express backend. Do not add React, maps, GPS, payment, government integrations, or unnecessary effects. First implement the responsive frontend and show me how to run it locally; then implement and test each stage in Section 13. Do not invent real data, credentials, working features, or government affiliation. After each stage, tell me which files changed, what they do, and one simple test I can perform. Keep the app suitable for a first-time solo hackathon participant.
