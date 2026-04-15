# AI Recruitment Frontend — Umurava Hackathon

Next.js 14 + TypeScript + Tailwind CSS + Redux Toolkit frontend for the AI Recruitment Platform.

## Quick Start

```bash
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL to your backend URL
npm run dev
```

Open http://localhost:3000

## Pages

| Route | Description |
|-------|-------------|
| `/auth` | Login / Register |
| `/dashboard` | Overview stats and quick actions |
| `/jobs` | List all jobs |
| `/jobs/new` | Create a new job |
| `/candidates` | View and upload candidates |
| `/screening/[jobId]` | **Run AI screening and view ranked results** |

## Features

- **Auth** — JWT login/register with Redux state
- **Jobs** — Create jobs, AI auto-analyzes requirements in background
- **Candidates** — Upload PDFs, CSV/Excel, or Umurava JSON profiles
- **Screening** — Run AI screening, view ranked candidates with score breakdowns, strengths/gaps, recommendations
- **Charts** — Radar chart (scoring weights) + bar chart (score distribution) via Recharts
- **Dropzone** — Drag-and-drop file upload

## Deploy to Vercel

```bash
# Push to GitHub, then:
# 1. Go to vercel.com → New Project → Import repo
# 2. Add env: NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
# 3. Deploy
```
