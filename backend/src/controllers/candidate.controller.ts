import { Request, Response } from "express";
import { Candidate } from "../models/candidate.model";
import { parseResumeWithAI } from "../ai/resumeParser";
import { extractTextFromPDF, parseCSVToProfiles, parseExcelToProfiles } from "../utils/fileParser";
import { extractCandidateFeatures } from "../services/scoring.service";
import { AppError } from "../middleware/error.middleware";
import { TalentProfile } from "../types";

// ─── POST /api/candidates/upload-cv ──────────────────────────────────────────

export const uploadCV = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) throw new AppError("No file uploaded. Send a PDF file.", 400);
  if (req.file.mimetype !== "application/pdf") {
    throw new AppError("Only PDF files are accepted for CV upload", 400);
  }

  const jobId = req.body.jobId || undefined;

  // extractTextFromPDF now validates the PDF header first, so corrupted files
  // throw a descriptive Error that we surface as a 400 below.
  let text: string;
  try {
    text = await extractTextFromPDF(req.file.buffer);
  } catch (err: any) {
    // PDF validation / parse failures → 400, not 500
    throw new AppError(err.message ?? "Failed to read the uploaded PDF.", 400);
  }

  // Parse with AI — network / quota errors bubble up as 500 (correct)
  const profile = await parseResumeWithAI(text);
  const features = extractCandidateFeatures(profile);

  const candidate = await Candidate.create({
    source: "external_cv",
    rawResumeText: text,
    profile,
    features,
    originalFileName: req.file.originalname,
    jobId: jobId || undefined,
  });

  res.status(201).json({
    success: true,
    message: "CV uploaded and parsed by AI",
    data: candidate,
  });
};

// ─── POST /api/candidates/upload-spreadsheet ─────────────────────────────────

export const uploadSpreadsheet = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) throw new AppError("No file uploaded", 400);

  const jobId = req.body.jobId || undefined;
  const mimeType = req.file.mimetype;
  const fileName = req.file.originalname.toLowerCase();

  let profiles: TalentProfile[];
  let rawRows: Record<string, string>[];

  const isCsv =
    mimeType === "text/csv" ||
    mimeType === "application/csv" ||
    fileName.endsWith(".csv");

  const isExcel =
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel" ||
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".xls");

  if (isCsv) {
    ({ profiles, rawRows } = parseCSVToProfiles(req.file.buffer));
  } else if (isExcel) {
    ({ profiles, rawRows } = parseExcelToProfiles(req.file.buffer));
  } else {
    throw new AppError("Only CSV and Excel (.xlsx, .xls) files are accepted", 400);
  }

  if (profiles.length === 0) {
    throw new AppError("No candidates found in the uploaded file", 400);
  }

  const candidateDocs = profiles.map((profile, idx) => ({
    source: "external_csv" as const,
    rawCsvRow: rawRows[idx],
    profile,
    features: extractCandidateFeatures(profile),
    originalFileName: req.file!.originalname,
    jobId: jobId || undefined,
  }));

  const inserted = await Candidate.insertMany(candidateDocs, { ordered: false });

  res.status(201).json({
    success: true,
    message: `${inserted.length} candidates imported from spreadsheet`,
    data: {
      count: inserted.length,
      candidateIds: inserted.map((c) => c._id),
    },
  });
};

// ─── POST /api/candidates/umurava-profile ────────────────────────────────────

export const ingestUmuravaProfile = async (req: Request, res: Response): Promise<void> => {
  const profile = req.body as TalentProfile;

  if (!profile.firstName || !profile.email || !profile.skills) {
    throw new AppError(
      "Invalid Talent Profile. Required fields: firstName, lastName, email, skills, experience, education, projects, availability",
      400
    );
  }

  const features = extractCandidateFeatures(profile);

  const candidate = await Candidate.create({
    source: "umurava_profile",
    profile,
    features,
  });

  res.status(201).json({
    success: true,
    message: "Umurava talent profile ingested",
    data: candidate,
  });
};

// ─── POST /api/candidates/umurava-bulk ───────────────────────────────────────

export const bulkIngestUmuravaProfiles = async (req: Request, res: Response): Promise<void> => {
  const profiles = req.body as TalentProfile[];

  if (!Array.isArray(profiles) || profiles.length === 0) {
    throw new AppError("Body must be a non-empty array of Talent Profiles", 400);
  }

  const jobId = req.query.jobId as string | undefined;

  const candidateDocs = profiles.map((profile) => ({
    source: "umurava_profile" as const,
    profile,
    features: extractCandidateFeatures(profile),
    jobId: jobId || undefined,
  }));

  const inserted = await Candidate.insertMany(candidateDocs, { ordered: false });

  res.status(201).json({
    success: true,
    message: `${inserted.length} Umurava profiles ingested`,
    data: { count: inserted.length },
  });
};

// ─── GET /api/candidates ─────────────────────────────────────────────────────

export const getCandidates = async (req: Request, res: Response): Promise<void> => {
  const { jobId, source, page = "1", limit = "20" } = req.query;

  const filter: any = {};
  if (jobId) filter.jobId = jobId;
  if (source) filter.source = source;

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const total = await Candidate.countDocuments(filter);
  const candidates = await Candidate.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit as string));

  res.json({
    success: true,
    count: candidates.length,
    total,
    page: parseInt(page as string),
    pages: Math.ceil(total / parseInt(limit as string)),
    data: candidates,
  });
};

// ─── GET /api/candidates/:id ─────────────────────────────────────────────────

export const getCandidate = async (req: Request, res: Response): Promise<void> => {
  const candidate = await Candidate.findById(req.params.id);
  if (!candidate) throw new AppError("Candidate not found", 404);

  res.json({ success: true, data: candidate });
};

// ─── DELETE /api/candidates/:id ──────────────────────────────────────────────

export const deleteCandidate = async (req: Request, res: Response): Promise<void> => {
  const candidate = await Candidate.findByIdAndDelete(req.params.id);
  if (!candidate) throw new AppError("Candidate not found", 404);

  res.json({ success: true, message: "Candidate removed" });
};
