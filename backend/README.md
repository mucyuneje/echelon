# AI Recruitment Backend — Umurava Hackathon

Production-ready AI-powered candidate screening backend built with Node.js, TypeScript, MongoDB, and Gemini API.

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your MongoDB URI and Gemini API key
```

### 3. Seed demo data
```bash
npm run seed
```

### 4. Start development server
```bash
npm run seed
```

---

## 🔑 Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 5000) |
| `MONGO_URI` | MongoDB Atlas connection string |
| `GEMINI_API_KEY` | Google Gemini API key |
| `JWT_SECRET` | Secret for JWT token signing |
| `NODE_ENV` | `development` or `production` |

---

## 📡 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login → returns JWT |
| GET | `/api/auth/me` | Get current user |

**All other endpoints require:** `Authorization: Bearer <token>`

---

### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/jobs` | Create job (AI analyzes in background) |
| GET | `/api/jobs` | List all jobs |
| GET | `/api/jobs/:id` | Get single job |
| PUT | `/api/jobs/:id` | Update job |
| DELETE | `/api/jobs/:id` | Delete job |
| POST | `/api/jobs/:id/analyze` | Manually trigger AI analysis |

**Create Job Request Body:**
```json
{
  "title": "Senior Backend Engineer",
  "company": "Umurava Africa",
  "description": "We are looking for...",
  "location": "Kigali, Rwanda",
  "jobType": "Full-time"
}
```

---

### Candidates
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/candidates/upload-cv` | Upload PDF resume (multipart/form-data) |
| POST | `/api/candidates/upload-spreadsheet` | Upload CSV/Excel file |
| POST | `/api/candidates/umurava-profile` | Ingest single Umurava Talent Profile |
| POST | `/api/candidates/umurava-bulk` | Ingest array of Talent Profiles |
| GET | `/api/candidates` | List candidates (paginated) |
| GET | `/api/candidates/:id` | Get single candidate |
| DELETE | `/api/candidates/:id` | Remove candidate |

**Upload CV (form-data):**
```
file: <PDF file>
jobId: <optional job ID>
```

**Upload Spreadsheet (form-data):**
```
file: <CSV or Excel file>
jobId: <optional job ID>
```

CSV/Excel supported columns (flexible mapping):
- `First Name`, `Last Name`, `Email`, `Title/Headline`, `Skills`, `Years Experience`, `Location`, `LinkedIn`, `GitHub`

---

### Screening (Core Intelligence)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/screen/run/:jobId` | **Run full AI screening** |
| GET | `/api/screen/results/:jobId` | Get latest results |
| GET | `/api/screen/stats/:jobId` | Analytics dashboard data |
| GET | `/api/screen/candidate/:resultId/deep-analysis` | Deep analysis per candidate |

**Run Screening Request Body:**
```json
{
  "topN": 20,
  "candidateIds": ["optional", "array", "of", "ids"]
}
```

**Screening Response:**
```json
{
  "success": true,
  "data": {
    "screeningRunId": "uuid",
    "jobTitle": "Senior Backend Engineer",
    "totalCandidatesAnalyzed": 50,
    "shortlistedCount": 20,
    "processingTimeMs": 8432,
    "results": [
      {
        "rank": 1,
        "candidateName": "Amina Nkurunziza",
        "candidateEmail": "amina@email.com",
        "score": {
          "skillScore": 92,
          "experienceScore": 88,
          "projectScore": 85,
          "educationScore": 70,
          "certificationScore": 100,
          "totalScore": 89
        },
        "insight": {
          "strengths": ["Expert Node.js with 6 years", "Led team of 4 engineers"],
          "gaps": ["Limited cloud architecture exposure"],
          "recommendation": "Highly recommended. Strong backend profile.",
          "confidence": 0.91,
          "fitForRole": "Strong Fit"
        }
      }
    ]
  }
}
```

---

## 🏗️ Architecture

```
src/
├── ai/
│   ├── geminiClient.ts      # Gemini API wrapper with retry
│   ├── prompts.ts           # All prompts (documented)
│   ├── resumeParser.ts      # PDF → Talent Profile
│   ├── jobAnalyzer.ts       # JD → Structured Requirements
│   └── rankingEngine.ts     # Multi-candidate ranking + insights
├── config/
│   └── db.ts                # MongoDB connection
├── controllers/
│   ├── auth.controller.ts
│   ├── job.controller.ts
│   ├── candidate.controller.ts
│   └── screening.controller.ts  # Core screening logic
├── middleware/
│   ├── auth.middleware.ts   # JWT protection
│   └── error.middleware.ts
├── models/
│   ├── user.model.ts
│   ├── job.model.ts
│   ├── candidate.model.ts
│   └── screening-result.model.ts
├── routes/index.ts
├── services/
│   └── scoring.service.ts   # Hybrid scoring engine
├── types/index.ts            # Umurava Talent Profile schema types
└── utils/
    ├── fileParser.ts         # PDF, CSV, Excel parsers
    └── seed.ts               # Demo data
```

---

## 🧠 Scoring Formula

```
Total Score = 
  Skills Score × weights.skills +
  Experience Score × weights.experience +
  Project Score × weights.projects +
  Education Score × weights.education +
  Certification Score × weights.certifications
```

Default weights (AI-adjustable per job):
- Skills: **40%**
- Experience: **30%**
- Projects: **20%**
- Education: **5%**
- Certifications: **5%**

---

## ☁️ Deployment

### Backend (Railway)
1. Push to GitHub
2. Create Railway project → connect repo
3. Add env variables
4. Deploy

### Database (MongoDB Atlas)
1. Create free cluster
2. Get connection string → set as `MONGO_URI`

---

## 🧪 Testing Flow

```bash
# 1. Login
POST /api/auth/login
{ "email": "admin@umurava.africa", "password": "Admin@123456" }

# 2. Create or get a job
GET /api/jobs

# 3. Upload candidates
POST /api/candidates/umurava-bulk   (Scenario 1)
POST /api/candidates/upload-cv      (Scenario 2 - PDF)
POST /api/candidates/upload-spreadsheet  (Scenario 2 - CSV)

# 4. Run screening
POST /api/screen/run/:jobId

# 5. View results
GET /api/screen/results/:jobId
GET /api/screen/stats/:jobId
```
