# Echelon — AI-Powered Talent Screening

> **Umurava AI Hackathon Submission** · Theme: AI Products for the Human Resources Industry

Echelon is a production-ready, recruiter-facing platform that uses **Google Gemini AI** to screen, score, and shortlist job applicants — from both structured talent profiles and uploaded resumes — while keeping humans firmly in control of final hiring decisions.

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
8. [AI Decision Flow](#ai-decision-flow)
9. [Scoring Formula](#scoring-formula)
10. [Assumptions & Limitations](#assumptions--limitations)
11. [Team](#team)

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
Recruiters upload a CSV/Excel spreadsheet or individual PDF resumes sourced from external job boards. Echelon parses the raw files, extracts structured data, and runs the same ranking pipeline — producing a comparable shortlist with full reasoning.

In both scenarios, the AI **recommends** — the recruiter **decides**.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Frontend                          │
│              Next.js  ·  Redux  ·  Tailwind CSS          │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │ Job Form │  │ Upload Panel │  │  Shortlist Viewer  │ │
│  └──────────┘  └──────────────┘  └────────────────────┘ │
└───────────────────────┬─────────────────────────────────┘
                        │ REST API (JWT)
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

---

## Repository Structure

```
echelon/
├── frontend/              # Next.js recruiter dashboard
│   ├── src/
│   │   ├── app/           # App router pages
│   │   │   ├── auth/      # Login / register
│   │   │   ├── dashboard/ # Main overview
│   │   │   ├── jobs/      # Job creation & listing
│   │   │   ├── candidates/# Candidate profiles
│   │   │   └── screening/ # Shortlist results
│   │   ├── components/    # Reusable UI components
│   │   ├── store/         # Redux store & slices
│   │   └── lib/           # API client (axios)
│   ├── .env.local         # Frontend environment variables
│   └── package.json
│
├── backend/               # Node.js + TypeScript API
│   ├── src/
│   │   ├── ai/            # Gemini integration
│   │   │   ├── geminiClient.ts     # API wrapper with retry logic
│   │   │   ├── prompts.ts          # All prompts (documented)
│   │   │   ├── jobAnalyzer.ts      # JD → structured requirements
│   │   │   ├── rankingEngine.ts    # Multi-candidate scoring
│   │   │   └── resumeParser.ts     # PDF → Talent Profile
│   │   ├── controllers/   # Route handlers
│   │   ├── models/        # MongoDB schemas
│   │   ├── routes/        # API route definitions
│   │   ├── services/      # Business logic
│   │   └── utils/         # File parsers & seed data
│   ├── .env               # Backend environment variables
│   └── package.json
│
├── shared/                # Shared types & schema
│   ├── talent-profile-schema.json   # Umurava official schema
│   ├── dummy-candidates/            # 25 sample talent profiles
│   └── sample-data/                 # Demo CSVs & PDF resumes
│
├── docs/                  # Documentation & assets
│   ├── architecture-diagram.png
│   ├── ai-decision-flow.md
│   └── presentation-slides.pdf
│
└── README.md              # ← You are here
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript |
| State Management | Redux Toolkit |
| Styling | Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB Atlas (Mongoose) |
| AI / LLM | **Google Gemini API** (mandatory) |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| File Parsing | pdf-parse, PapaParse, xlsx |
| Frontend Hosting | Vercel |
| Backend Hosting | Railway |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- MongoDB Atlas account (free tier is enough)
- Google Gemini API key ([get one here](https://aistudio.google.com/app/apikey))

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
# Fill in your values (see Environment Variables section)
npm run seed        # Loads 25 demo candidates + 3 sample jobs
npm run dev         # Starts on http://localhost:5000
```

---

### 3. Set up the Frontend

```bash
cd ../frontend
npm install
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:5000
npm run dev         # Starts on http://localhost:3000
```

---

### 4. Demo Login

Once seeded, log in with:

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
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://...` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIza...` |
| `JWT_SECRET` | Secret for signing tokens | `your-secret-key` |
| `NODE_ENV` | Environment | `development` |

### Frontend (`frontend/.env.local`)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend base URL | `http://localhost:5000` |

---

## AI Decision Flow

Echelon's AI pipeline runs in four stages. All prompts are documented in `backend/src/ai/prompts.ts`.

### Stage 1 — Job Analysis
When a recruiter creates a job posting, Gemini extracts structured requirements from the description: required skills (with priority weights), minimum experience, education level, and role-specific signals. This produces a **Job Requirements Object** that drives all downstream scoring.

### Stage 2 — Profile Normalization
- **Scenario 1 (Structured):** Umurava talent profiles are already structured — they pass directly to the scoring engine.
- **Scenario 2 (Unstructured):** PDFs are parsed by `pdf-parse`, then Gemini converts the raw resume text into a normalized Talent Profile object matching the Umurava schema.

### Stage 3 — Multi-Candidate Ranking
All candidates are evaluated together in a **single Gemini prompt** (batched by group of 10–15 for context efficiency). The prompt provides the Job Requirements Object alongside the candidate profiles and instructs the model to:

1. Score each candidate across five weighted dimensions
2. Return a ranked list with numerical scores
3. Write a natural-language explanation for each shortlisted candidate

Batching allows the model to compare candidates **relative to each other**, not just against an absolute baseline — this produces more meaningful ranking differentiation.

### Stage 4 — Explanation Generation
For each shortlisted candidate, the AI produces a structured insight block:

```json
{
  "strengths": ["Expert Node.js with 6 years", "Led team of 4 engineers"],
  "gaps": ["Limited cloud architecture exposure"],
  "recommendation": "Highly recommended. Strong backend profile.",
  "confidence": 0.91,
  "fitForRole": "Strong Fit"
}
```

The recruiter sees this explanation inline with the candidate card. **No candidate is shortlisted without a written justification** — this is a hard constraint in the prompt.

### Human-in-the-Loop Design
The AI produces a ranked shortlist and explanations. The recruiter retains full authority to:
- Accept or reject any AI recommendation
- Re-run screening with different criteria
- Manually promote or demote candidates
- Proceed directly to interview without AI input

The system never makes a hiring decision. It makes a recommendation.

---

## Scoring Formula

```
Total Score = (Skills × 0.40) + (Experience × 0.30) + (Projects × 0.20) + (Education × 0.05) + (Certifications × 0.05)
```

| Dimension | Weight | What is evaluated |
|-----------|--------|-------------------|
| Skills | 40% | Match to required skills, proficiency level, years of experience per skill |
| Experience | 30% | Total years, role relevance, seniority, company context |
| Projects | 20% | Technology overlap, scope, complexity, recency |
| Education | 5% | Degree level, field of study relevance |
| Certifications | 5% | Relevant professional certifications |

**Weight Adjustability:** The scoring weights are AI-adjustable. When Gemini analyzes a job description, it can recommend adjusted weights based on role type (e.g., a research role might increase Education to 15% while reducing Projects to 10%). The adjusted weights are stored with each screening run for full auditability.

**Score range:** 0–100. Candidates below 50 are not included in the shortlist regardless of relative ranking.

---

## Assumptions & Limitations

### Assumptions

- Talent profile data is accurate and self-reported by candidates. Echelon does not verify credentials.
- Gemini API responses are parsed as structured JSON. Malformed responses trigger a retry (up to 3 attempts) before the candidate is flagged for manual review.
- PDF resume parsing works best on text-based PDFs. Scanned image PDFs may produce incomplete extractions.
- The scoring formula weights are reasonable defaults for general software engineering roles. Different industries may require significant retuning.

### Known Limitations

- Gemini API rate limits mean large batches (50+ candidates) may take 15–30 seconds to process.
- Resume parsing from PDFs with complex layouts (multi-column, heavy graphics) can lose information.
- The AI has no access to external data (LinkedIn, GitHub activity, salary benchmarks) — it only evaluates what is provided.
- Language bias: the model performs best on profiles written in English. Profiles in other languages may receive lower scores due to extraction gaps, not candidate quality.
- The system does not detect or actively correct for demographic bias in job descriptions. Recruiters are responsible for inclusive job requirement writing.

---

## Team

**Team Echelon** — Umurava AI Hackathon 2026

| Name | Role |
|------|------|
| MUCYUNEJE HIRWA ARSENE | Lead , Testing, Product & Data |
| INEZA MANZI ALPE | AI Engineer |
| NDAMAGE JOSHUA| Backend Engineer |
| MITARI MURENZI CHRIS| UI UX DESIGN|
| MUGEMA ABDOUL RAZAK| Frontend Engineer 

---

*Built for the Umurava AI Hackathon · Kigali, Rwanda · April 2026*