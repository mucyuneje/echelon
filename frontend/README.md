# Echelon — Frontend

> Next.js 14 · React 18 · Redux Toolkit · Tailwind CSS · TypeScript

This is the recruiter-facing dashboard for Echelon, the AI-powered talent screening platform built for the Umurava AI Hackathon 2026.

**Live Demo:** [https://echelon-theta.vercel.app](https://echelon-theta.vercel.app/)

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Structure](#project-structure)
3. [Environment Variables](#environment-variables)
4. [Scripts](#scripts)
5. [Pages & Routes](#pages--routes)
6. [Components](#components)
7. [State Management](#state-management)
8. [API Client](#api-client)
9. [Types](#types)
10. [Styling](#styling)
11. [Deployment](#deployment)

---

## Quick Start

```bash
npm install
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm run dev
# Open http://localhost:3000
```

**Demo login:**
```
Email:    admin@umurava.africa
Password: Admin@123456
```

---

## Project Structure

```
frontend/src/
├── app/                         # Next.js 14 App Router
│   ├── layout.tsx               # Root layout (Redux + Theme + Auth providers)
│   ├── page.tsx                 # Landing / redirect page
│   ├── globals.css              # Global styles + CSS variables
│   ├── auth/
│   │   └── page.tsx             # Login + Register page
│   ├── dashboard/
│   │   ├── layout.tsx           # Dashboard shell (uses ProtectedLayout)
│   │   └── page.tsx             # Overview: stats, recent jobs, quick actions
│   ├── jobs/
│   │   ├── layout.tsx
│   │   ├── page.tsx             # Job listing
│   │   ├── new/page.tsx         # Create new job form
│   │   └── [id]/
│   │       ├── layout.tsx
│   │       └── page.tsx         # Job detail + candidate count + screening trigger
│   ├── candidates/
│   │   ├── layout.tsx
│   │   ├── page.tsx             # Candidate listing with filters
│   │   └── [id]/
│   │       ├── layout.tsx
│   │       └── page.tsx         # Full candidate profile view
│   ├── screening/
│   │   ├── layout.tsx
│   │   ├── page.tsx             # All screening runs overview
│   │   └── [jobId]/
│   │       ├── layout.tsx
│   │       └── page.tsx         # Ranked shortlist for a specific job
│   └── profile/
│       ├── layout.tsx
│       └── page.tsx             # Recruiter profile settings
│
├── components/
│   ├── AuthProvider.tsx          # Loads session from localStorage on mount
│   ├── ThemeProvider.tsx         # Dark/light mode context
│   ├── candidates/
│   │   └── UploadModal.tsx       # Multi-file drag-and-drop upload modal
│   ├── layout/
│   │   ├── ProtectedLayout.tsx   # Auth guard + sidebar wrapper
│   │   └── Sidebar.tsx           # Navigation sidebar with active state
│   ├── screening/
│   │   ├── CandidateCard.tsx     # Ranked candidate card with scores + insight
│   │   └── NewScreeningModel.tsx # Modal to start a new screening run
│   ├── tour/
│   │   └── AppTour.tsx           # First-time user onboarding tour
│   └── ui/
│       ├── FitBadge.tsx          # Strong Fit / Good Fit / Partial Fit / Poor Fit badge
│       ├── PageHeader.tsx        # Consistent page header with title + actions
│       ├── ScoreBar.tsx          # Horizontal score bar (0–100 with color tiers)
│       ├── ScoreRing.tsx         # Circular score ring component
│       ├── Skeleton.tsx          # Loading skeleton placeholders
│       └── TopProgressBar.tsx    # Top-of-page loading progress bar
│
├── lib/
│   └── api.ts                   # Axios instance + all API functions
│
├── store/
│   ├── index.ts                 # Redux store configuration
│   └── slices/
│       └── authSlice.ts         # Auth state + async thunks
│
└── types/
    └── index.ts                 # All TypeScript interfaces
```

---

## Environment Variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

For production (Vercel):

```env
NEXT_PUBLIC_API_URL=https://echelon-0ozp.onrender.com/api
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API base URL |

---

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Development | `npm run dev` | Next.js dev server with hot reload on port 3000 |
| Build | `npm run build` | Production build |
| Production | `npm start` | Start production server |
| Lint | `npm run lint` | ESLint check |

---

## Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | `page.tsx` | Redirects to `/dashboard` if authenticated, else `/auth` |
| `/auth` | `auth/page.tsx` | Login and registration tabs |
| `/dashboard` | `dashboard/page.tsx` | Stats overview, recent jobs, quick links |
| `/jobs` | `jobs/page.tsx` | All job postings with search and filter |
| `/jobs/new` | `jobs/new/page.tsx` | Create a new job (title, company, description, type, location) |
| `/jobs/:id` | `jobs/[id]/page.tsx` | Job detail, candidate count, run screening button |
| `/candidates` | `candidates/page.tsx` | All candidates with source filter |
| `/candidates/:id` | `candidates/[id]/page.tsx` | Full profile: skills, experience, education, projects |
| `/screening` | `screening/page.tsx` | Overview of all screening sessions |
| `/screening/:jobId` | `screening/[jobId]/page.tsx` | Ranked shortlist, score breakdowns, AI insights |
| `/profile` | `profile/page.tsx` | Recruiter account settings |

All routes under `/dashboard`, `/jobs`, `/candidates`, `/screening`, `/profile` are protected — unauthenticated users are redirected to `/auth`.

---

## Components

### `AuthProvider`

Runs on mount and dispatches `loadMeThunk` to restore session from `localStorage`. Wraps the entire app so all pages have access to the auth state immediately.

### `ProtectedLayout`

Checks `auth.user` from Redux. If null (and not loading), redirects to `/auth`. Renders the `Sidebar` + page content when authenticated.

### `Sidebar`

Navigation links: Dashboard · Jobs · Candidates · Screening. Uses Next.js `usePathname()` to highlight the active route. Includes user name/email and a logout button.

### `UploadModal`

Drag-and-drop or click-to-browse file upload modal. Supports:
- Multiple PDF/DOCX resumes (uploaded via `POST /api/candidates/upload-cv`)
- CSV/Excel spreadsheets (uploaded via `POST /api/candidates/upload-spreadsheet`)
- Optional job assignment

### `CandidateCard`

Displays a ranked candidate in the screening results view:
- Rank number and name
- `FitBadge` (color-coded fit tier)
- `ScoreRing` (total score)
- `ScoreBar` rows for each scoring dimension (skills, experience, projects, education, certifications)
- AI insight: strengths, gaps, recommendation text
- Confidence indicator
- Alternative role suggestion (if any)
- Expandable deep analysis section

### `NewScreeningModal`

Modal triggered from the job detail page. Allows recruiter to:
- Set `topN` (how many candidates to shortlist)
- Optionally filter by specific candidate IDs
- Initiate `POST /api/screen/run/:jobId`

### UI Components

| Component | Props | Description |
|-----------|-------|-------------|
| `FitBadge` | `fit: 'Strong Fit' \| 'Good Fit' \| 'Partial Fit' \| 'Poor Fit'` | Color-coded badge |
| `ScoreBar` | `label, score, max?` | Horizontal bar, green/yellow/red by score range |
| `ScoreRing` | `score, size?` | Circular progress ring |
| `Skeleton` | `className?` | Animated loading placeholder |
| `PageHeader` | `title, subtitle?, actions?` | Consistent page header |
| `TopProgressBar` | — | NProgress-style loading bar on route transitions |

---

## State Management

The app uses **Redux Toolkit** with a single store.

### Auth Slice (`store/slices/authSlice.ts`)

**State shape:**
```typescript
{
  user: User | null
  token: string | null
  loading: boolean
  error: string | null
}
```

**Actions:**
| Action | Description |
|--------|-------------|
| `setCredentials({ user, token })` | Set user + token, persist token to `localStorage` |
| `logout()` | Clear state + remove `localStorage` token |
| `clearError()` | Clear error message |

**Async Thunks:**
| Thunk | Description |
|-------|-------------|
| `loginThunk({ email, password })` | POST `/api/auth/login`, stores token |
| `registerThunk({ name, email, password })` | POST `/api/auth/register`, stores token |
| `loadMeThunk()` | GET `/api/auth/me` using stored token, restores session |

### Pattern for other data

Job listings, candidates, and screening results are fetched directly in page components using `useEffect` + local state, keeping the Redux store minimal (auth only).

---

## API Client

`src/lib/api.ts` exports a configured Axios instance and typed API modules.

### Axios Configuration

```typescript
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  timeout: 90000,   // 90s — screening calls can take 15–30s
})
```

**Request interceptor:** Attaches `Authorization: Bearer <token>` from `localStorage` to every request.

**Response interceptor:** On `401 Unauthorized`, clears the token and redirects to `/auth`.

### API Modules

```typescript
authAPI.login(email, password)
authAPI.register(name, email, password)
authAPI.me()
authAPI.updateProfile({ name })
authAPI.changePassword({ currentPassword, newPassword })

jobsAPI.list()
jobsAPI.get(id)
jobsAPI.create(data)
jobsAPI.update(id, data)
jobsAPI.delete(id)
jobsAPI.analyze(id)

candidatesAPI.list(params?)
candidatesAPI.get(id)
candidatesAPI.countByJob()
candidatesAPI.delete(id)
candidatesAPI.uploadFiles(files, jobId?)       // PDF/DOCX
candidatesAPI.uploadSpreadsheet(files, jobId?) // CSV/Excel
candidatesAPI.bulkUmurava(profiles, jobId?)    // Umurava JSON

screeningAPI.run(jobId, topN?)
screeningAPI.results(jobId)
screeningAPI.stats(jobId)
screeningAPI.deepAnalysis(resultId)
```

---

## Types

All TypeScript interfaces are in `src/types/index.ts`.

### Key interfaces

```typescript
interface User { _id, name, email, role }

interface Job {
  _id, title, company, description, location, jobType, isActive
  structuredRequirements: StructuredRequirements | null
  createdAt, createdBy: { name, email }
}

interface StructuredRequirements {
  requiredSkills, optionalSkills: string[]
  minExperienceYears: number
  educationLevel, roleType: string
  keyResponsibilities: string[]
  weights: { skills, experience, projects, education, certifications: number }
}

interface Candidate {
  _id, source, profile: CandidateProfile
  features: CandidateFeatures
  originalFileName?, jobId?, createdAt
}

interface ScoreBreakdown {
  skillScore, experienceScore, projectScore
  educationScore, certificationScore, totalScore: number
}

interface CandidateInsight {
  strengths, gaps: string[]
  recommendation: string
  confidence: number
  fitForRole: 'Strong Fit'|'Good Fit'|'Partial Fit'|'Poor Fit'
  biasNote?, alternativeRoleSuggestion?: string
}

interface ScreeningResultItem {
  rank, candidateId, candidateName, candidateEmail
  candidateHeadline, candidateLocation, source
  score: ScoreBreakdown
  insight: CandidateInsight
  features: CandidateFeatures
}
```

---

## Styling

The frontend uses **Tailwind CSS 3** with a custom configuration in `tailwind.config.ts`.

- All layout uses Tailwind utility classes
- Custom CSS variables in `globals.css` for brand colors and theme tokens
- `framer-motion` for page transition animations and modal open/close
- `react-hot-toast` for success/error notifications
- `recharts` for score distribution charts on the dashboard
- `lucide-react` for icons (consistent with Tailwind's sizing scale)
- `react-dropzone` for file upload drag-and-drop zones

### Score color tiers (used in `ScoreBar` and `ScoreRing`)

| Score Range | Color |
|-------------|-------|
| 80–100 | Green |
| 60–79 | Yellow/Amber |
| 40–59 | Orange |
| 0–39 | Red |

### Fit tier badge colors

| Fit | Color |
|-----|-------|
| Strong Fit | Green |
| Good Fit | Blue |
| Partial Fit | Amber |
| Poor Fit | Red |

---

## Deployment

The frontend is deployed on **Vercel** with the configuration in `vercel.json`.

### Vercel setup

1. Connect the `frontend/` directory as a Vercel project
2. Set environment variable: `NEXT_PUBLIC_API_URL=https://echelon-0ozp.onrender.com/api`
3. Deploy — Vercel auto-detects Next.js and handles routing

### Manual build

```bash
npm run build
npm start
```

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `next` | React framework with App Router |
| `react`, `react-dom` | UI library |
| `@reduxjs/toolkit`, `react-redux` | State management |
| `axios` | HTTP client |
| `tailwindcss` | Utility-first CSS |
| `framer-motion` | Animations |
| `lucide-react` | Icons |
| `react-dropzone` | File drag-and-drop |
| `react-hot-toast` | Toast notifications |
| `recharts` | Charts and data visualization |
| `clsx` | Conditional className utility |
| `typescript` | Type safety |

---

*Echelon Frontend · Umurava AI Hackathon 2026 · Kigali, Rwanda*