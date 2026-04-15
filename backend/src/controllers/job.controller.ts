import { Response } from "express";
import { Job } from "../models/job.model";
import { analyzeJobWithAI } from "../ai/jobAnalyzer";
import { AppError } from "../middleware/error.middleware";
import { AuthRequest } from "../middleware/auth.middleware";

// POST /api/jobs
export const createJob = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, company, description, location, jobType } = req.body;

  if (!title || !description || !company) {
    throw new AppError("Title, company, and description are required", 400);
  }

  // Create job first (fast)
  const job = await Job.create({
    title,
    company,
    description,
    location: location || "Remote",
    jobType: jobType || "Full-time",
    createdBy: req.user._id,
  });

  // Async: analyze job with AI in background (don't block response)
  analyzeJobWithAI(title, description)
    .then(async (structured) => {
      await Job.findByIdAndUpdate(job._id, { structuredRequirements: structured });
      console.log(`✅ Job "${title}" analyzed by AI`);
    })
    .catch((err) => {
      console.error(`⚠️  Job AI analysis failed for "${title}":`, err.message);
    });

  res.status(201).json({
    success: true,
    message: "Job created. AI analysis running in background.",
    data: job,
  });
};

// GET /api/jobs
export const getJobs = async (req: AuthRequest, res: Response): Promise<void> => {
  const jobs = await Job.find({ isActive: true })
    .sort({ createdAt: -1 })
    .populate("createdBy", "name email");

  res.json({ success: true, count: jobs.length, data: jobs });
};

// GET /api/jobs/:id
export const getJob = async (req: AuthRequest, res: Response): Promise<void> => {
  const job = await Job.findById(req.params.id).populate("createdBy", "name email");
  if (!job) throw new AppError("Job not found", 404);

  res.json({ success: true, data: job });
};

// PUT /api/jobs/:id
export const updateJob = async (req: AuthRequest, res: Response): Promise<void> => {
  const job = await Job.findById(req.params.id);
  if (!job) throw new AppError("Job not found", 404);

  const { title, company, description, location, jobType } = req.body;

  // If description changed, re-analyze
  const descriptionChanged = description && description !== job.description;

  Object.assign(job, { title, company, description, location, jobType });
  await job.save();

  if (descriptionChanged) {
    analyzeJobWithAI(job.title, job.description)
      .then(async (structured) => {
        await Job.findByIdAndUpdate(job._id, { structuredRequirements: structured });
      })
      .catch(console.error);
  }

  res.json({ success: true, message: "Job updated", data: job });
};

// DELETE /api/jobs/:id (soft delete)
export const deleteJob = async (req: AuthRequest, res: Response): Promise<void> => {
  const job = await Job.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!job) throw new AppError("Job not found", 404);

  res.json({ success: true, message: "Job deleted" });
};

// POST /api/jobs/:id/analyze  (manually trigger AI analysis)
export const analyzeJob = async (req: AuthRequest, res: Response): Promise<void> => {
  const job = await Job.findById(req.params.id);
  if (!job) throw new AppError("Job not found", 404);

  const structured = await analyzeJobWithAI(job.title, job.description);
  await Job.findByIdAndUpdate(job._id, { structuredRequirements: structured });

  res.json({
    success: true,
    message: "Job analyzed by AI",
    data: structured,
  });
};
