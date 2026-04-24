# Echelon — Backend API

> Node.js · TypeScript · Express · MongoDB Atlas · Google Gemini AI

This is the backend service for Echelon, the AI-powered talent screening platform built for the Umurava AI Hackathon 2026.

**Base URL (production):** `https://echelon-0ozp.onrender.com`

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Structure](#project-structure)
3. [Environment Variables](#environment-variables)
4. [Scripts](#scripts)
5. [API Reference](#api-reference)
6. [AI Layer](#ai-layer)
7. [Scoring Engine](#scoring-engine)
8. [Database Models](#database-models)
9. [Middleware & Security](#middleware--security)
10. [Error Handling](#error-handling)

---

## Quick Start

```bash
npm install
cp .env.example .env        # fill in your values
npm run seed                # load 25 demo candidates + sample jobs
npm run dev                 # starts on http://localhost:5000
```

Health check: `GET http://localhost:5000/health`

---

## Project Structure

```
backend/src/
├── ai/
│   ├── geminiClient.ts         # Gemini API wrapper with retry + JSON parsing
│   ├── prompts.ts              # All 4 prompts (resume parser, job analyzer,
│   │                           #   ranking engine, deep analysis)
│   ├── jobAnalyzer.ts          # Job description → structuredRequirements
│   ├── rankingEngine.ts        # Batch ranking + per-candidate insights
│   └── resumeParser.ts         # Raw resume text → TalentProfile JSON
├── config/
│   └── db.ts                   # MongoDB Atlas connection
├── controllers/
│   ├── auth.controller.ts      # register, login, getMe
│   ├── candidate.controller.ts # uploadCV, uploadSpreadsheet, ingest, list, delete
│   ├── job.controller.ts       # CRUD + analyze
│   └── screening.controller.ts # runScreening, results, stats, deepAnalysis
├── middleware/
│   ├── auth.middleware.ts      # JWT protect() middleware
│   └── error.middleware.ts     # Global error handler + AppError class
├── models/
│   ├── candidate.model.ts      # Candidate + full TalentProfile schema
│   ├── job.model.ts            # Job + structuredRequirements schema
│   ├── screening-result.model.ts
│   └── user.model.ts
├── routes/
│   └── index.ts               # All route definitions in one file
├── services/
│   └── scoring.service.ts     # Rule-based hybrid scoring + feature extraction
├── types/
│   └── index.ts               # Shared TypeScript types
├── utils/
│   ├── fileParser.ts          # PDF, CSV, Excel text extraction
│   └── seed.ts                # Demo data seeder
└── index.ts                   # Express app bootstrap
```

---

## Environment Variables

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/echelondb
GEMINI_API_KEY=AIza...
JWT_SECRET=your-long-random-secret
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 5000) |
| `MONGO_URI` | Yes | MongoDB Atlas connection string |
| `GEMINI_API_KEY` | Yes | Google AI Studio API key |
| `JWT_SECRET` | Yes | Secret for JWT signing |
| `NODE_ENV` | No | `development` or `production` |
| `FRONTEND_URL` | No | CORS allowed origin (default: `*`) |

---

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Development | `npm run dev` | ts-node-dev with hot reload |
| Build | `npm run build` | Compile TypeScript to `dist/` |
| Production | `npm start` | Run compiled `dist/index.js` |
| Seed | `npm run seed` | Insert 25 demo candidates + 3 sample jobs |

---

## API Reference

All protected routes require: `Authorization: Bearer <jwt_token>`

### Health

```
GET /health
```

Returns service status, version, and timestamp. Not rate-limited.

---

### Auth

```
POST /api/auth/register
Body: { name, email, password }
Returns: { user, token }

POST /api/auth/login
Body: { email, password }
Returns: { user, token }

GET /api/auth/me           [protected]
Returns: { user }
```

---

### Jobs

```
POST   /api/jobs              [protected]   Create job
GET    /api/jobs              [protected]   List jobs (scoped to recruiter)
GET    /api/jobs/:id          [protected]   Get single job
PUT    /api/jobs/:id          [protected]   Update job
DELETE /api/jobs/:id          [protected]   Delete job
POST   /api/jobs/:id/analyze  [protected]   Run Gemini job analysis
```

**Create job body:**
```json
{
  "title": "Senior Backend Engineer",
  "company": "Acme Corp",
  "description": "We are looking for...",
  "location": "Kigali, Rwanda",
  "jobType": "Full-time"
}
```

`jobType` enum: `Full-time | Part-time | Contract | Remote`

**After `/analyze`**, the job's `structuredRequirements` is populated with Gemini-extracted requirements and scoring weights. This runs automatically before screening if not already done.

---

### Candidates

```
POST /api/candidates/upload-cv          [protected]  Upload PDF/DOCX resumes
POST /api/candidates/upload-spreadsheet [protected]  Upload CSV or Excel
POST /api/candidates/umurava-profile    [protected]  Ingest single Umurava JSON
POST /api/candidates/umurava-bulk       [protected]  Ingest array of Umurava JSONs
GET  /api/candidates                    [protected]  List candidates
GET  /api/candidates/:id                [protected]  Get single candidate
DELETE /api/candidates/:id              [protected]  Delete candidate
GET  /api/candidates/count-by-job       [protected]  Count per job
```

**File upload (`upload-cv`):**
- Field name: `files` (array) or `file` (single)
- Accepted: `.pdf`, `.docx`, `.doc`
- Max file size: 20 MB
- Optional body field: `jobId` — assigns candidates to a specific job

**Spreadsheet upload:**
- Field name: `files` (array) or `file` (single)
- Accepted: `.csv`, `.xlsx`, `.xls`
- Optional body field: `jobId`

**Candidate `source` values:**
- `umurava_profile` — from Umurava JSON ingestion
- `external_cv` — from PDF upload
- `external_docx` — from DOCX upload
- `external_csv` — from CSV/Excel upload

---

### Screening

```
POST /api/screen/run/:jobId                          [protected]
Body: { topN?: number, candidateIds?: string[] }

GET  /api/screen/results/:jobId                      [protected]
GET  /api/screen/stats/:jobId                        [protected]
GET  /api/screen/candidate/:resultId/deep-analysis   [protected]
```

**Run screening body:**
```json
{
  "topN": 20,
  "candidateIds": ["id1", "id2"]   // optional — omit to screen all job candidates
}
```

**Screening response:**
```json
{
  "success": true,
  "data": {
    "screeningRunId": "uuid",
    "jobId": "...",
    "jobTitle": "Senior Backend Engineer",
    "totalCandidatesAnalyzed": 47,
    "shortlistedCount": 20,
    "processingTimeMs": 18432,
    "results": [
      {
        "rank": 1,
        "candidateId": "...",
        "candidateName": "Alice Mukamana",
        "candidateEmail": "alice@example.com",
        "candidateHeadline": "Senior Node.js Engineer",
        "candidateLocation": "Kigali, Rwanda",
        "score": {
          "skillScore": 92,
          "experienceScore": 85,
          "projectScore": 78,
          "educationScore": 70,
          "certificationScore": 30,
          "totalScore": 84
        },
        "insight": {
          "strengths": ["Expert Node.js with 6 years", "Led team of 4"],
          "gaps": ["Limited cloud architecture"],
          "recommendation": "Highly recommended.",
          "confidence": 0.91,
          "fitForRole": "Strong Fit",
          "biasNote": null,
          "alternativeRoleSuggestion": null
        },
        "features": {
          "totalYearsExperience": 6.2,
          "uniqueSkills": ["node.js", "typescript", "mongodb"],
          "projectCount": 4,
          "hasRelevantCertifications": true,
          "seniorityLevel": "Senior"
        },
        "source": "external_cv"
      }
    ]
  }
}
```

**Stats response:**
```json
{
  "data": {
    "totalShortlisted": 20,
    "scoreStats": { "avg": 71, "max": 89, "min": 52 },
    "scoreBuckets": { "80-100": 3, "60-79": 14, "40-59": 3, "0-39": 0 },
    "fitDistribution": { "Strong Fit": 3, "Good Fit": 11, "Partial Fit": 6 },
    "avgConfidence": 0.78
  }
}
```

**Rate limits:**
- General: 300 requests / 15 minutes
- Screening: 60 requests / 15 minutes

---

## AI Layer

All AI interactions go through `src/ai/geminiClient.ts`, which wraps the Google Gemini API with:
- Automatic retry (up to 3 attempts on failure)
- JSON extraction from response text
- Error normalization

### Prompt 1 — Resume Parser (`prompts.ts: buildResumeParserPrompt`)

Converts raw resume text into a full Umurava Talent Profile JSON. Used in `POST /api/candidates/upload-cv`.

### Prompt 2 — Job Analyzer (`prompts.ts: buildJobAnalyzerPrompt`)

Extracts structured requirements from a job description. Returns:
- `requiredSkills`, `optionalSkills`
- `minExperienceYears`, `educationLevel`, `roleType`
- `keyResponsibilities`
- `weights` (sum = 1.0, AI-adjusted per role type)

### Prompt 3 — Multi-Candidate Ranking (`prompts.ts: buildRankingPrompt`)

The core prompt. Receives the Job Requirements Object + up to 15 candidate profiles (with pre-computed scores) in a single call. Returns per-candidate:
- `adjustedScore` (0–100)
- `strengths`, `gaps`
- `recommendation` (1–2 sentences)
- `confidence` (0.0–1.0)
- `fitForRole` (Strong Fit / Good Fit / Partial Fit / Poor Fit)
- `biasNote` (flags incomplete data)
- `alternativeRoleSuggestion`

**Final score blend:** `0.6 × aiAdjustedScore + 0.4 × algorithmicScore`

**Sort order:** Primary = fit tier (Strong > Good > Partial > Poor), Secondary = blended score.

### Prompt 4 — Deep Analysis (`prompts.ts: buildCandidateAnalysisPrompt`)

On-demand, per-candidate. Returns:
- `executiveSummary` (3–4 sentences)
- `detailedStrengths`, `detailedGaps`, `redFlags`
- `suggestedInterviewQuestions` (specific to this candidate)
- `whatWouldMakeThemPerfect`
- `hiringRisk` (Low / Medium / High)
- `recommendation` (Strongly Recommend / Recommend / Consider / Not Recommended)

---

## Scoring Engine

`src/services/scoring.service.ts` implements a rule-based hybrid scoring engine.

### Formula

```
Total = (Skills × w.skills) + (Experience × w.experience) + (Projects × w.projects)
      + (Education × w.education) + (Certifications × w.certifications)
```

Default weights: Skills 0.40 · Experience 0.30 · Projects 0.20 · Education 0.05 · Certifications 0.05

### Skill Score

- Required skill match rate × 0.70 (70% of skill score)
- Proficiency level bonus: Expert=1.0, Advanced=0.8, Intermediate=0.6, Beginner=0.4
- Optional skill match rate × 0.30 (30% of skill score)
- Proficiency multiplier applied: 0.7–1.0 range

### Experience Score

- Below 50% of minimum → scales 0–40
- 50%–100% of minimum → scales 40–70
- At minimum → 70
- 2× minimum or above → 100

### Project Score

- Base 20 points per project
- +50 points for tech relevance (proportional to overlap with required skills)
- +15 for having a description (>50 chars)
- +15 for having a verifiable link
- Count bonus: +5 per extra project beyond 1, capped at +15

### Education Score

- PhD/Doctorate = 100, Master's = 85, Bachelor's = 70, Associate = 55, Diploma = 45, High School = 30
- +10 bonus for CS-related field of study
- Minimum 30 even without formal education

### Certification Score

- +30 per relevant certification, +10 per non-relevant
- Capped at 100

### Feature Extraction

`extractCandidateFeatures(profile)` is called on every uploaded candidate and stores:
- `totalYearsExperience` — calculated from experience date ranges
- `uniqueSkills` — deduplicated lowercase skill list
- `projectCount`
- `hasRelevantCertifications`
- `seniorityLevel` — heuristic: Junior (<2yr), Mid (2–5yr), Senior (5–10yr), Lead (10yr+); overridden by headline keywords

---

## Database Models

### User
```typescript
{ name: string, email: string, password: string (hashed), role: 'recruiter'|'admin', createdAt }
```

### Job
```typescript
{
  title, company, description, location,
  jobType: 'Full-time'|'Part-time'|'Contract'|'Remote',
  structuredRequirements: {
    requiredSkills: string[], optionalSkills: string[],
    minExperienceYears: number, educationLevel: string,
    roleType: string, keyResponsibilities: string[],
    weights: { skills, experience, projects, education, certifications }
  } | null,
  createdBy: ObjectId,
  isActive: boolean
}
```

### Candidate
```typescript
{
  source: 'umurava_profile'|'external_cv'|'external_docx'|'external_csv',
  rawResumeText?: string,
  profile: TalentProfile,      // full Umurava schema
  features: CandidateFeatures, // pre-computed
  originalFileName?: string,
  jobId?: ObjectId,
  createdBy: ObjectId
}
```

Indexes: `{ "profile.email": 1, jobId: 1 }`, `{ createdBy: 1 }`

### ScreeningResult
```typescript
{
  jobId: ObjectId,
  candidateId: ObjectId,
  rank: number,
  score: ScoreBreakdown,        // all 6 score fields
  insight: CandidateInsight,    // AI-generated insight block
  screeningRunId: string,       // UUID groups all results for one run
  processingTimeMs: number
}
```

---

## Middleware & Security

| Middleware | Description |
|-----------|-------------|
| `helmet()` | Sets secure HTTP headers |
| `cors()` | Restricts to `FRONTEND_URL` (default: `*`) |
| `express-rate-limit` | 300 req/15min global, 60 req/15min for `/api/screen` |
| `express.json({ limit: '10mb' })` | JSON body parsing |
| `multer({ storage: memoryStorage, limit: 20MB })` | File upload handling |
| `morgan` | HTTP request logging (dev: `dev`, prod: `combined`) |
| `protect` | JWT verification, attaches `req.user` |
| `errorHandler` | Global catch-all: formats errors, hides stack in production |

### Auth Middleware

`protect` verifies the `Authorization: Bearer <token>` header, decodes the JWT, and attaches the full user document to `req.user`. Throws 401 if missing or invalid.

### Owner Scoping

All controllers use `buildOwnerFilter(req)` to scope queries:
- `role === 'admin'` → sees all records
- `role === 'recruiter'` → sees only their own (`createdBy: req.user._id`)

---

## Error Handling

`AppError` class extends `Error` with an `statusCode`. All controllers use `express-async-errors` so async errors are automatically forwarded to the global handler.

```typescript
throw new AppError("Job not found", 404);
```

Error response format:
```json
{
  "success": false,
  "message": "Job not found"
}
```

Stack traces are only included in `NODE_ENV !== 'production'`.

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `@google/generative-ai` | Google Gemini API client |
| `express` + `express-async-errors` | HTTP server |
| `mongoose` | MongoDB ODM |
| `jsonwebtoken` + `bcryptjs` | Auth |
| `multer` | File upload |
| `pdf-parse` | PDF text extraction |
| `papaparse` | CSV parsing |
| `xlsx` | Excel parsing |
| `mammoth` | DOCX text extraction |
| `helmet` + `cors` + `express-rate-limit` | Security |
| `morgan` | Logging |
| `uuid` | Screening run IDs |
| `zod` | Schema validation |

---

*Echelon Backend · Umurava AI Hackathon 2026 · Kigali, Rwanda*