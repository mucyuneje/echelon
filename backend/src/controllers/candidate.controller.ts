import { Request, Response } from "express";
import { Candidate } from "../models/candidate.model";
import { parseResumeWithAI } from "../ai/resumeParser";
import { extractTextFromPDF, parseCSVToProfiles, parseExcelToProfiles } from "../utils/fileParser";
import { extractCandidateFeatures } from "../services/scoring.service";
import { AppError } from "../middleware/error.middleware";
import { AuthRequest } from "../middleware/auth.middleware";
import { TalentProfile } from "../types";

function buildOwnerFilter(req: AuthRequest) {
  if (req.user.role === "admin") return {};
  return { createdBy: req.user._id };
}

// ─── POST /api/candidates/upload-cv (single OR multiple PDFs/DOCXs) ──────────
export const uploadCV = async (req: AuthRequest, res: Response): Promise<void> => {
  const files = req.files as Express.Multer.File[] | undefined;
  const single = req.file as Express.Multer.File | undefined;
  const allFiles = files?.length ? files : single ? [single] : [];

  if (!allFiles.length) throw new AppError("No file(s) uploaded. Send PDF or Word files.", 400);

  const jobId = req.body.jobId || undefined;
  const results: any[] = [];
  const errors: string[] = [];

  for (const file of allFiles) {
    const isPdf  = file.mimetype === "application/pdf";
    const isDocx = file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                || file.mimetype === "application/msword"
                || file.originalname.toLowerCase().endsWith(".docx")
                || file.originalname.toLowerCase().endsWith(".doc");

    if (!isPdf && !isDocx) {
      errors.push(`${file.originalname}: only PDF or Word files accepted`);
      continue;
    }

    try {
      let text: string;
      if (isPdf) {
        text = await extractTextFromPDF(file.buffer);
      } else {
        // DOCX — extract with mammoth if available, else fall back to raw text
        try {
          const mammoth = require("mammoth");
          const { value } = await mammoth.extractRawText({ buffer: file.buffer });
          text = value;
        } catch {
          text = file.buffer.toString("utf-8").replace(/[^\x20-\x7E\n]/g, " ");
        }
      }

      const profile  = await parseResumeWithAI(text);
      const features = extractCandidateFeatures(profile);

      const candidate = await Candidate.create({
        source: isPdf ? "external_cv" : "external_docx",
        rawResumeText: text,
        profile, features,
        originalFileName: file.originalname,
        jobId: jobId || undefined,
        createdBy: req.user._id,
      });

      results.push({ candidateId: candidate._id, name: `${profile.firstName} ${profile.lastName}`, file: file.originalname });
    } catch (err: any) {
      errors.push(`${file.originalname}: ${err.message || "parse failed"}`);
    }
  }

  if (results.length === 0) throw new AppError(errors.join("; "), 400);

  res.status(201).json({
    success: true,
    message: `${results.length} candidate(s) uploaded and parsed by AI`,
    data: { count: results.length, candidates: results, errors },
  });
};

// ─── POST /api/candidates/upload-spreadsheet ─────────────────────────────────
export const uploadSpreadsheet = async (req: AuthRequest, res: Response): Promise<void> => {
  const files = req.files as Express.Multer.File[] | undefined;
  const single = req.file;
  const allFiles = files?.length ? files : single ? [single] : [];

  if (!allFiles.length) throw new AppError("No file uploaded", 400);

  const jobId = req.body.jobId || undefined;
  let totalInserted = 0;

  for (const file of allFiles) {
    const fileName = file.originalname.toLowerCase();
    const isCsv   = file.mimetype === "text/csv" || fileName.endsWith(".csv");
    const isExcel  = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

    if (!isCsv && !isExcel) continue;

    const { profiles, rawRows } = isCsv
      ? parseCSVToProfiles(file.buffer)
      : parseExcelToProfiles(file.buffer);

    if (!profiles.length) continue;

    const docs = profiles.map((profile, idx) => ({
      source: "external_csv" as const,
      rawCsvRow: rawRows[idx],
      profile,
      features: extractCandidateFeatures(profile),
      originalFileName: file.originalname,
      jobId: jobId || undefined,
      createdBy: req.user._id,
    }));

    const inserted = await Candidate.insertMany(docs, { ordered: false });
    totalInserted += inserted.length;
  }

  if (totalInserted === 0) throw new AppError("No candidates found in the uploaded file(s)", 400);

  res.status(201).json({
    success: true,
    message: `${totalInserted} candidates imported`,
    data: { count: totalInserted },
  });
};

// ─── POST /api/candidates/umurava-bulk ───────────────────────────────────────
export const bulkIngestUmuravaProfiles = async (req: AuthRequest, res: Response): Promise<void> => {
  const profiles = req.body as TalentProfile[];
  if (!Array.isArray(profiles) || !profiles.length)
    throw new AppError("Body must be a non-empty array of Talent Profiles", 400);

  const jobId = req.query.jobId as string | undefined;
  const docs = profiles.map((profile) => ({
    source: "umurava_profile" as const,
    profile,
    features: extractCandidateFeatures(profile),
    jobId: jobId || undefined,
    createdBy: req.user._id,
  }));

  const inserted = await Candidate.insertMany(docs, { ordered: false });
  res.status(201).json({ success: true, message: `${inserted.length} Umurava profiles ingested`, data: { count: inserted.length } });
};

// ─── POST /api/candidates/umurava-profile (single) ───────────────────────────
export const ingestUmuravaProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = req.body as TalentProfile;
  if (!profile.firstName || !profile.email || !profile.skills)
    throw new AppError("Invalid Talent Profile. Required: firstName, lastName, email, skills", 400);

  const features = extractCandidateFeatures(profile);
  const candidate = await Candidate.create({ source: "umurava_profile", profile, features, createdBy: req.user._id });
  res.status(201).json({ success: true, message: "Umurava talent profile ingested", data: candidate });
};

// ─── GET /api/candidates ─────────────────────────────────────────────────────
export const getCandidates = async (req: AuthRequest, res: Response): Promise<void> => {
  const { jobId, source, page = "1", limit = "50", search, sort = "createdAt", order = "desc" } = req.query;

  const filter: any = buildOwnerFilter(req);
  if (jobId === "none") {
    filter.jobId = { $exists: false };
  } else if (jobId) {
    filter.jobId = jobId;
  }
  if (source) filter.source = source;
  if (search) {
    const re = new RegExp(search as string, "i");
    filter.$or = [
      { "profile.firstName": re },
      { "profile.lastName": re },
      { "profile.headline": re },
      { "profile.location": re },
    ];
  }

  const sortDir = order === "asc" ? 1 : -1;
  const sortMap: any = { createdAt: { createdAt: sortDir }, experience: { "features.totalYearsExperience": sortDir }, name: { "profile.firstName": sortDir } };
  const sortObj = sortMap[sort as string] || { createdAt: -1 };

  const skip  = (parseInt(page as string) - 1) * parseInt(limit as string);
  const total = await Candidate.countDocuments(filter);
  const candidates = await Candidate.find(filter)
    .sort(sortObj)
    .skip(skip)
    .limit(parseInt(limit as string))
    .populate("createdBy", "name email")
    .populate("jobId", "title company");

  res.json({ success: true, count: candidates.length, total, page: parseInt(page as string), pages: Math.ceil(total / parseInt(limit as string)), data: candidates });
};

// ─── GET /api/candidates/count-by-job ────────────────────────────────────────
export const countByJob = async (req: AuthRequest, res: Response): Promise<void> => {
  const filter = buildOwnerFilter(req);
  const counts = await Candidate.aggregate([
    { $match: { ...filter, jobId: { $exists: true } } },
    { $group: { _id: "$jobId", count: { $sum: 1 }, names: { $push: { $concat: ["$profile.firstName", " ", "$profile.lastName"] } } } },
  ]);
  const map: Record<string, { count: number; names: string[] }> = {};
  for (const c of counts) map[c._id.toString()] = { count: c.count, names: c.names };
  res.json({ success: true, data: map });
};

// ─── GET /api/candidates/:id ─────────────────────────────────────────────────
export const getCandidate = async (req: AuthRequest, res: Response): Promise<void> => {
  const filter: any = { _id: req.params.id, ...buildOwnerFilter(req) };
  const candidate = await Candidate.findOne(filter).populate("createdBy", "name email").populate("jobId", "title company");
  if (!candidate) throw new AppError("Candidate not found", 404);
  res.json({ success: true, data: candidate });
};

// ─── DELETE /api/candidates/:id ──────────────────────────────────────────────
export const deleteCandidate = async (req: AuthRequest, res: Response): Promise<void> => {
  const filter: any = { _id: req.params.id, ...buildOwnerFilter(req) };
  const candidate = await Candidate.findOneAndDelete(filter);
  if (!candidate) throw new AppError("Candidate not found", 404);
  res.json({ success: true, message: "Candidate removed" });
};
