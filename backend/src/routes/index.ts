import { Router } from "express";
import multer from "multer";
import { protect } from "../middleware/auth.middleware";

import { register, login, getMe } from "../controllers/auth.controller";
import { createJob, getJobs, getJob, updateJob, deleteJob, analyzeJob } from "../controllers/job.controller";
import {
  uploadCV, uploadSpreadsheet, ingestUmuravaProfile, bulkIngestUmuravaProfiles,
  getCandidates, getCandidate, deleteCandidate, countByJob,
} from "../controllers/candidate.controller";
import { runScreening, getScreeningResults, getDeepAnalysis, getScreeningStats } from "../controllers/screening.controller";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "text/csv", "application/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(csv|pdf|docx|doc|xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed. Use PDF, Word (.docx), CSV, or Excel."));
    }
  },
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post("/auth/register", register);
router.post("/auth/login", login);
router.get("/auth/me", protect, getMe);

// ─── Jobs ─────────────────────────────────────────────────────────────────────
router.post("/jobs", protect, createJob);
router.get("/jobs", protect, getJobs);
router.get("/jobs/:id", protect, getJob);
router.put("/jobs/:id", protect, updateJob);
router.delete("/jobs/:id", protect, deleteJob);
router.post("/jobs/:id/analyze", protect, analyzeJob);

// ─── Candidates ───────────────────────────────────────────────────────────────
// Multi-file upload for PDFs/DOCX — accepts array field "files" OR single "file"
router.post("/candidates/upload-cv", protect, upload.any(), uploadCV);
router.post("/candidates/upload-spreadsheet", protect, upload.any(), uploadSpreadsheet);
router.post("/candidates/umurava-profile", protect, ingestUmuravaProfile);
router.post("/candidates/umurava-bulk", protect, bulkIngestUmuravaProfiles);
router.get("/candidates/count-by-job", protect, countByJob);
router.get("/candidates", protect, getCandidates);
router.get("/candidates/:id", protect, getCandidate);
router.delete("/candidates/:id", protect, deleteCandidate);

// ─── Screening ────────────────────────────────────────────────────────────────
router.post("/screen/run/:jobId", protect, runScreening);
router.get("/screen/results/:jobId", protect, getScreeningResults);
router.get("/screen/stats/:jobId", protect, getScreeningStats);
router.get("/screen/candidate/:resultId/deep-analysis", protect, getDeepAnalysis);

export default router;
