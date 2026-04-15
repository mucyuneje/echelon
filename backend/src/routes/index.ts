import { Router } from "express";
import multer from "multer";
import { protect } from "../middleware/auth.middleware";

// Controllers
import { register, login, getMe } from "../controllers/auth.controller";
import {
  createJob,
  getJobs,
  getJob,
  updateJob,
  deleteJob,
  analyzeJob,
} from "../controllers/job.controller";
import {
  uploadCV,
  uploadSpreadsheet,
  ingestUmuravaProfile,
  bulkIngestUmuravaProfiles,
  getCandidates,
  getCandidate,
  deleteCandidate,
} from "../controllers/candidate.controller";
import {
  runScreening,
  getScreeningResults,
  getDeepAnalysis,
  getScreeningStats,
} from "../controllers/screening.controller";

const router = Router();

// Memory storage for file uploads (no disk I/O)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "text/csv",
      "application/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed. Use PDF, CSV, or Excel."));
    }
  },
});

// ─── Auth Routes ──────────────────────────────────────────────────────────────
router.post("/auth/register", register);
router.post("/auth/login", login);
router.get("/auth/me", protect, getMe);

// ─── Job Routes ───────────────────────────────────────────────────────────────
router.post("/jobs", protect, createJob);
router.get("/jobs", protect, getJobs);
router.get("/jobs/:id", protect, getJob);
router.put("/jobs/:id", protect, updateJob);
router.delete("/jobs/:id", protect, deleteJob);
router.post("/jobs/:id/analyze", protect, analyzeJob); // Manual AI re-analysis

// ─── Candidate Routes ─────────────────────────────────────────────────────────
// External CVs (PDF upload)
router.post("/candidates/upload-cv", protect, upload.single("file"), uploadCV);

// External spreadsheet (CSV/Excel)
router.post(
  "/candidates/upload-spreadsheet",
  protect,
  upload.single("file"),
  uploadSpreadsheet
);

// Umurava platform profiles (Scenario 1)
router.post("/candidates/umurava-profile", protect, ingestUmuravaProfile);
router.post("/candidates/umurava-bulk", protect, bulkIngestUmuravaProfiles);

// CRUD
router.get("/candidates", protect, getCandidates);
router.get("/candidates/:id", protect, getCandidate);
router.delete("/candidates/:id", protect, deleteCandidate);

// ─── Screening Routes ─────────────────────────────────────────────────────────
router.post("/screen/run/:jobId", protect, runScreening);
router.get("/screen/results/:jobId", protect, getScreeningResults);
router.get("/screen/stats/:jobId", protect, getScreeningStats);
router.get("/screen/candidate/:resultId/deep-analysis", protect, getDeepAnalysis);

export default router;
