# Echelon — AI-Powered Talent Screening

> **Umurava AI Hackathon Submission** · Theme: AI Products for the Human Resources Industry

Echelon is a production-ready, recruiter-facing platform that uses **Google Gemini AI** to screen, score, and shortlist job applicants — from both structured Umurava talent profiles and uploaded resumes — while keeping humans firmly in control of final hiring decisions.

**Live Demo:** [https://echelon-theta.vercel.app](https://echelon-theta.vercel.app/)
**API Base URL:** [https://echelon-0ozp.onrender.com](https://echelon-0ozp.onrender.com/)

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Solution Overview](#solution-overview)
3. [Architecture](#architecture)
4. [Repository Structure](#repository-structure)
5. [Tech Stack](#tech-stack)
6. [Getting Started](#getting-started)
7. [Environment Variables](#environment-variables)
8. [API Reference](#api-reference)
9. [AI Decision Flow](#ai-decision-flow)
10. [Scoring Formula](#scoring-formula)
11. [Assumptions & Limitations](#assumptions--limitations)
12. [Team](#team)

---

## Problem Statement

Recruiters today face two compounding challenges:

- **Volume overload** — hundreds of applications per role, dramatically increasing time-to-hire
- **Inconsistent evaluation** — comparing candidates across diverse profile formats with no objective baseline

Echelon answers: *How can AI accurately, transparently, and efficiently screen applicants across both structured talent profiles and unstructured resumes — while preserving human-led hiring decisions?*

---

## Solution Overview

Echelon supports two distinct screening scenarios:

### Scenario 1 — Umurava Platform Profiles
Recruiters paste or bulk-upload structured talent profiles (following the Umurava Talent Profile Schema). Echelon's AI engine scores every profile against the job requirements and returns a ranked shortlist of the Top 10 or Top 20 candidates, each with a written explanation.

### Scenario 2 — External Applicants
Recruiters upload a CSV/Excel spreadsheet or individual PDF/DOCX resumes sourced from external job boards. Echelon parses the raw files, extracts structured data, and runs the same ranking pipeline — producing a comparable shortlist with full reasoning.

In both scenarios, the AI **recommends** — the recruiter **decides**.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Frontend                          │
│              Next.js 14  ·  Redux  ·  Tailwind CSS       │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │ Job Form │  │ Upload Panel │  │  Shortlist Viewer  │ │
│  └──────────┘  └──────────────┘  └────────────────────┘ │
└───────────────────────┬─────────────────────────────────┘
                        │ REST API (JWT Bearer Token)
┌───────────────────────▼─────────────────────────────────┐
│                        Backend                           │
│              Node.js · TypeScript · Express              │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Job Service  │  │  File Parser │  │  AI Orchestr │  │
│  └───────────────┘  └──────────────┘  └──────┬───────┘  │
└──────────────────────────────────────────────┼──────────┘
                                               │
┌──────────────────────────────────────────────▼──────────┐
│                      AI Layer                            │
│                   Google Gemini API                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Job Analyzer│  │Ranking Engine│  │Resume Parser   │  │
│  └─────────────┘  └──────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│                     Database                             │
│                    MongoDB Atlas                         │
│        Jobs · Candidates · Screening Results             │
└─────────────────────────────────────────────────────────┘
```

### Mermaid Architecture Diagram

```
graph TD
    subgraph FE["Frontend - Next.js · Redux · Tailwind CSS"]
        JF[Job Form]
        UP[Upload Panel]
        SV[Shortlist Viewer]
        AU[Auth Pages]
    end

    subgraph BE["Backend - Node.js · TypeScript · Express"]
        JS[Job Service]
        FP[File Parser]
        AIO[AI Orchestrator]
        AUTH[Auth Controller]
    end

    subgraph AI["AI Layer - Google Gemini API"]
        JA[Job Analyzer]
        RE[Ranking Engine]
        RP[Resume Parser]
    end

    subgraph DB["Database - MongoDB Atlas"]
        JC[(Jobs)]
        CC[(Candidates)]
        SC[(Screening Results)]
    end

    FE -->|REST API JWT| BE
    JS --> AIO
    FP --> AIO
    AIO --> JA
    AIO --> RE
    AIO --> RP
    JS --> JC
    AIO --> SC
    FP --> CC
```

---

## Repository Structure

```
echelon/
├── frontend/                        # Next.js recruiter dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── auth/                # Login / register page
│   │   │   ├── dashboard/           # Main overview & stats
│   │   │   ├── jobs/                # Job creation & listing
│   │   │   │   ├── [id]/            # Job detail view
│   │   │   │   └── new/             # Create new job
│   │   │   ├── candidates/          # Candidate profiles
│   │   │   │   └── [id]/            # Candidate detail view
│   │   │   ├── screening/           # Shortlist results
│   │   │   │   └── [jobId]/         # Screening results per job
│   │   │   └── profile/             # Recruiter profile page
│   │   ├── components/
│   │   │   ├── candidates/          # UploadModal
│   │   │   ├── layout/              # Sidebar, ProtectedLayout
│   │   │   ├── screening/           # CandidateCard, NewScreeningModal
│   │   │   ├── tour/                # App onboarding tour
│   │   │   └── ui/                  # FitBadge, ScoreBar, ScoreRing, Skeleton
│   │   ├── store/
│   │   │   └── slices/authSlice.ts  # Redux auth state
│   │   ├── lib/api.ts               # Axios client + all API functions
│   │   └── types/index.ts           # TypeScript interfaces
│   ├── .env.local                   # Frontend env vars
│   └── package.json
│
├── backend/                         # Node.js + TypeScript API
│   ├── src/
│   │   ├── ai/
│   │   │   ├── geminiClient.ts      # Gemini API wrapper with retry logic
│   │   │   ├── prompts.ts           # All 4 prompts (documented)
│   │   │   ├── jobAnalyzer.ts       # JD → structured requirements
│   │   │   ├── rankingEngine.ts     # Multi-candidate scoring + insights
│   │   │   └── resumeParser.ts      # PDF/DOCX text → Talent Profile
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── candidate.controller.ts
│   │   │   ├── job.controller.ts
│   │   │   └── screening.controller.ts
│   │   ├── models/
│   │   │   ├── candidate.model.ts
│   │   │   ├── job.model.ts
│   │   │   ├── screening-result.model.ts
│   │   │   └── user.model.ts
│   │   ├── routes/index.ts          # All route definitions
│   │   ├── services/
│   │   │   └── scoring.service.ts   # Hybrid rule-based scoring engine
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts   # JWT protect middleware
│   │   │   └── error.middleware.ts  # Global error handler
│   │   ├── utils/
│   │   │   ├── fileParser.ts        # PDF/CSV/Excel extraction
│   │   │   └── seed.ts              # Demo data seeder
│   │   └── index.ts                 # Express app entry point
│   ├── .env
│   └── package.json
│
└── README.md
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js | 14.x |
| Frontend | React | 18.x |
| Frontend | TypeScript | 5.x |
| State Management | Redux Toolkit | 2.x |
| UI Styling | Tailwind CSS | 3.x |
| Charts | Recharts | 2.x |
| HTTP Client | Axios | 1.x |
| Animation | Framer Motion | 12.x |
| Backend | Node.js + Express | 4.x |
| Backend | TypeScript | 5.x |
| Database | MongoDB Atlas (Mongoose) | 8.x |
| AI / LLM | Google Gemini API (`gemini-2.0-flash`) | — |
| Auth | JWT + bcryptjs | — |
| File Upload | Multer (memory storage) | — |
| File Parsing | pdf-parse, PapaParse, xlsx, mammoth | — |
| Rate Limiting | express-rate-limit | — |
| Security | Helmet, CORS | — |
| Frontend Hosting | Vercel | — |
| Backend Hosting | Render | — |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- MongoDB Atlas account (free tier is sufficient)
- Google Gemini API key — [get one here](https://aistudio.google.com/app/apikey)

---

### 1. Clone the repository

```bash
git clone https://github.com/your-team/echelon.git
cd echelon
```

---

### 2. Set up the Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in your values — see Environment Variables section below
npm run seed        # Loads demo candidates + sample jobs
npm run dev         # Starts on http://localhost:5000
```

Available scripts:

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot reload (ts-node-dev) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm run seed` | Seed 25 demo candidates and sample jobs |

---

### 3. Set up the Frontend

```bash
cd ../frontend
npm install
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm run dev         # Starts on http://localhost:3000
```

Available scripts:

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

---

### 4. Demo Login

After seeding, log in with:

```
Email:    admin@umurava.africa
Password: Admin@123456
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/echelondb` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIza...` |
| `JWT_SECRET` | Secret for signing tokens | `your-long-random-secret` |
| `NODE_ENV` | Environment | `development` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:3000` |

### Frontend (`frontend/.env.local`)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend base URL | `http://localhost:5000/api` |

---

## API Reference

All endpoints (except `/health` and `/api/auth/*`) require a `Authorization: Bearer <token>` header.

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |

### Auth

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | `{ name, email, password }` | Create recruiter account |
| POST | `/api/auth/login` | `{ email, password }` | Login, returns JWT |
| GET | `/api/auth/me` | — | Get current user |

### Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/jobs` | Create a new job posting |
| GET | `/api/jobs` | List all jobs for current recruiter |
| GET | `/api/jobs/:id` | Get single job |
| PUT | `/api/jobs/:id` | Update job |
| DELETE | `/api/jobs/:id` | Delete job |
| POST | `/api/jobs/:id/analyze` | Run Gemini job analysis → produces `structuredRequirements` |

### Candidates

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/candidates/upload-cv` | Upload 1 or more PDF/DOCX resumes (multipart) |
| POST | `/api/candidates/upload-spreadsheet` | Upload CSV or Excel file |
| POST | `/api/candidates/umurava-profile` | Ingest single Umurava JSON profile |
| POST | `/api/candidates/umurava-bulk` | Ingest array of Umurava JSON profiles |
| GET | `/api/candidates` | List candidates (supports `?jobId=` filter) |
| GET | `/api/candidates/:id` | Get single candidate |
| DELETE | `/api/candidates/:id` | Delete candidate |
| GET | `/api/candidates/count-by-job` | Count candidates grouped by job |

### Screening

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/screen/run/:jobId` | `{ topN, candidateIds? }` | Run full AI screening pipeline |
| GET | `/api/screen/results/:jobId` | — | Get latest screening results |
| GET | `/api/screen/stats/:jobId` | — | Score stats + fit distribution |
| GET | `/api/screen/candidate/:resultId/deep-analysis` | — | Generate deep analysis for one candidate |

**Rate limits:** General API = 300 req / 15 min. Screening endpoints = 60 req / 15 min.

---

## AI Decision Flow

Echelon's pipeline runs in four stages. All prompts are in `backend/src/ai/prompts.ts`.

### Mermaid Decision Flow Diagram

```
flowchart TD
    A([Recruiter creates job posting]) --> B[Gemini extracts structured requirements]
    B --> B1[Job Requirements Object]
    B1 --> C{Input type?}
    C -->|Scenario 1 Umurava profiles| D1[Profiles pass directly to scoring engine]
    C -->|Scenario 2 External resumes| D2[pdf-parse extracts text then Gemini normalises to Talent Profile]
    D1 --> E[Candidates batched in groups of 10 to 15]
    D2 --> E
    E --> E1[Score each candidate across 5 weighted dimensions]
    E1 --> E2[Return ranked list with numerical scores]
    E2 --> F[AI generates insight block per candidate]
    F --> F1[strengths gaps recommendation confidence fitForRole]
    F1 --> G{Score above 50?}
    G -->|No| H[Excluded from shortlist]
    G -->|Yes| I[Included in shortlist with justification]
    I --> J([Recruiter reviews shortlist])
    J --> K{Decision}
    K -->|Accept| L[Proceed to interview]
    K -->|Reject| M[Demote candidate]
    K -->|Override| N[Manually adjust or re-run screening]
```

### Stage 1 — Job Analysis
When a recruiter creates or analyzes a job posting, Gemini extracts structured requirements from the description: required skills, optional skills, minimum experience years, education level, role type, key responsibilities, and **AI-recommended scoring weights** that sum to exactly 1.0.

### Stage 2 — Profile Normalization
- **Scenario 1 (Structured):** Umurava talent profiles already match the schema — they pass directly to the scoring engine.
- **Scenario 2 (Unstructured):** PDF text is extracted via `pdf-parse`; DOCX via `mammoth`. Gemini then normalizes the raw text into a full Talent Profile JSON object.

### Stage 3 — Hybrid Scoring + Multi-Candidate Ranking
Every candidate is first scored algorithmically (rule-based scoring service), then the top candidates are passed to Gemini in batches of 10–15 for AI insight generation. The AI:
1. Reviews each candidate against job requirements
2. Produces strengths, gaps, recommendation, confidence score, fit tier, and alternative role suggestion
3. Returns an `adjustedScore` (0–100)

Final ordering = 60% AI-adjusted score + 40% algorithmic score, then secondarily sorted by fit tier (Strong > Good > Partial > Poor).

### Stage 4 — Explanation Generation
For each shortlisted candidate, the AI returns a structured insight block:

```json
{
  "strengths": ["Expert Node.js with 6 years", "Led team of 4 engineers"],
  "gaps": ["Limited cloud architecture exposure"],
  "recommendation": "Highly recommended. Strong backend profile.",
  "confidence": 0.91,
  "fitForRole": "Strong Fit",
  "biasNote": null,
  "alternativeRoleSuggestion": null
}
```

**No candidate is shortlisted without a written justification** — this is a hard constraint in the prompt.

### Deep Analysis (On-Demand)
Recruiters can request a deep analysis for any shortlisted candidate via `GET /api/screen/candidate/:resultId/deep-analysis`. This runs an additional Gemini call and returns:
- Executive summary (3–4 sentences for a busy hiring manager)
- Detailed strengths and gaps
- Red flags
- Suggested interview questions specific to this candidate
- What would make them a perfect fit
- Hiring risk level (Low / Medium / High)
- Final recommendation (Strongly Recommend / Recommend / Consider / Not Recommended)

### Human-in-the-Loop Design
The AI produces a ranked shortlist and explanations. The recruiter retains full authority to accept, reject, re-run, or override any recommendation. **The system never makes a hiring decision.**

---

## Scoring Formula

```
Total Score = (Skills × w.skills) + (Experience × w.experience) + (Projects × w.projects)
            + (Education × w.education) + (Certifications × w.certifications)
```

Default weights (AI may adjust per role):

| Dimension | Default Weight | What is evaluated |
|-----------|---------------|-------------------|
| Skills | 40% | Required skill match rate, proficiency level (Beginner → Expert bonus), optional skill bonus |
| Experience | 30% | Total years vs. minimum required, seniority level heuristic |
| Projects | 20% | Tech overlap with job requirements, has description, has verifiable link |
| Education | 5% | Degree level (PhD=100 → High School=30), CS-field bonus |
| Certifications | 5% | Relevant certifications vs. required tech stack |

**Score threshold:** Candidates scoring below 50 are excluded from the shortlist regardless of relative ranking.

**Weight adjustability:** When Gemini analyzes a job description, it recommends adjusted weights based on role type. Adjusted weights are stored per screening run for full auditability.

---

## Assumptions & Limitations

### Assumptions

- Talent profile data is accurate and self-reported. Echelon does not verify credentials.
- Gemini API responses are parsed as structured JSON. Malformed responses trigger up to 3 retries before the candidate is flagged for manual review.
- PDF resume parsing works best on text-based PDFs. Scanned/image PDFs may produce incomplete extractions.
- Default scoring weights are calibrated for general software engineering roles. Other industries may require retuning.
- DOCX parsing uses `mammoth`; falls back to raw buffer text if mammoth is unavailable.

### Known Limitations

- Gemini API rate limits mean large batches (50+ candidates) may take 15–30 seconds.
- Complex PDF layouts (multi-column, heavy graphics) can result in information loss during text extraction.
- The AI has no access to external data (LinkedIn, GitHub activity, salary data) — it evaluates only what is provided.
- Language bias: the model performs best on English-language profiles. Non-English profiles may score lower due to extraction gaps, not candidate quality.
- The system does not actively correct for demographic bias in job descriptions. Recruiters are responsible for inclusive job requirement writing.

---

## Team

**Team Echelon** — Umurava AI Hackathon 2026

| Name | Role |
|------|------|
| MUCYUNEJE HIRWA ARSENE | Team Lead, Testing, Product & Data |
| INEZA MANZI ALPE | AI Engineer |
| NDAMAGE JOSHUA | Backend Engineer |
| MITARI MURENZI CHRIS | UI/UX Design |
| MUGEMA ABDOUL RAZAK | Frontend Engineer |

---

*Built for the Umurava AI Hackathon · Kigali, Rwanda · April 2026*