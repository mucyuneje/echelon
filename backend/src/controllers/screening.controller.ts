import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { Job } from "../models/job.model";
import { Candidate } from "../models/candidate.model";
import { ScreeningResult } from "../models/screening-result.model";
import { calculateHybridScore } from "../services/scoring.service";
import { generateAIInsights, generateDeepCandidateAnalysis } from "../ai/rankingEngine";
import { analyzeJobWithAI } from "../ai/jobAnalyzer";
import { AppError } from "../middleware/error.middleware";
import { AuthRequest } from "../middleware/auth.middleware";

// Helper: build filter scoped to user (recruiters see only their own, admin sees all)
function buildOwnerFilter(req: AuthRequest) {
  if (req.user.role === "admin") return {};
  return { createdBy: req.user._id };
}

// ─── POST /api/screen/run/:jobId ─────────────────────────────────────────────
export const runScreening = async (req: AuthRequest, res: Response): Promise<void> => {
  const startTime = Date.now();
  const { jobId } = req.params;
  const { topN = 20, candidateIds } = req.body;

  // 1. Get job — scoped by owner
  const jobFilter: any = { _id: jobId, ...buildOwnerFilter(req) };
  const job = await Job.findOne(jobFilter);
  if (!job) throw new AppError("Job not found", 404);

  // 2. Ensure structured requirements exist
  if (!job.structuredRequirements) {
    console.log("⚙️  Running job analysis first...");
    const structured = await analyzeJobWithAI(job.title, job.description);
    job.structuredRequirements = structured;
    await job.save();
  }

  // 3. Fetch candidates scoped to this recruiter + this job
  // Only screen candidates explicitly assigned to this job
  const candidateFilter: any = { ...buildOwnerFilter(req), jobId };
  if (candidateIds && Array.isArray(candidateIds)) {
    candidateFilter._id = { $in: candidateIds };
  }

  const candidates = await Candidate.find(candidateFilter);

  if (candidates.length === 0) {
    throw new AppError(
      "No candidates found. Upload candidates first via /api/candidates/upload-cv or /upload-spreadsheet",
      400
    );
  }

  // 4. Score all candidates
  const scored = candidates.map((candidate) => {
    const scoreBreakdown = calculateHybridScore(candidate, job);
    return { candidate, scoreBreakdown };
  });

  // 5. Sort & take top N
  scored.sort((a, b) => b.scoreBreakdown.totalScore - a.scoreBreakdown.totalScore);
  const topCandidates = scored.slice(0, topN);

  // 6. Generate AI insights
  console.log(`🤖 Generating AI insights for top ${topCandidates.length} candidates...`);

  const aiInputs = topCandidates.map(({ candidate, scoreBreakdown }) => ({
    id: candidate._id.toString(),
    name: `${candidate.profile.firstName} ${candidate.profile.lastName}`,
    profile: {
      headline: candidate.profile.headline,
      skills: candidate.profile.skills,
      experience: candidate.profile.experience,
      education: candidate.profile.education,
      projects: candidate.profile.projects,
      certifications: candidate.profile.certifications,
      features: candidate.features,
    },
    computedScore: scoreBreakdown.totalScore,
  }));

  const insightMap = await generateAIInsights(
    job.title,
    job.description,
    job.structuredRequirements!,
    aiInputs
  );

  // 7. Build pre-results with AI insights attached, then re-sort by AI-adjusted score
  const FIT_PRIORITY: Record<string, number> = {
    "Strong Fit": 4,
    "Good Fit": 3,
    "Partial Fit": 2,
    "Poor Fit": 1,
  };

  const rankedCandidates = topCandidates
    .map(({ candidate, scoreBreakdown }) => {
      const insight = insightMap.get(candidate._id.toString()) || {
        strengths: ["Profile reviewed"],
        gaps: [],
        recommendation: "Review candidate manually",
        confidence: 0.5,
        fitForRole: "Partial Fit" as const,
        adjustedScore: scoreBreakdown.totalScore,
      };
      // Blend: 60% AI-adjusted score + 40% algorithmic score for final ordering
      const aiScore = (insight as any).adjustedScore ?? scoreBreakdown.totalScore;
      const blendedScore = Math.round(aiScore * 0.6 + scoreBreakdown.totalScore * 0.4);
      return { candidate, scoreBreakdown, insight, blendedScore };
    })
    .sort((a, b) => {
      // Primary: fit tier (Strong > Good > Partial > Poor)
      const fitDiff =
        (FIT_PRIORITY[b.insight.fitForRole] ?? 0) -
        (FIT_PRIORITY[a.insight.fitForRole] ?? 0);
      if (fitDiff !== 0) return fitDiff;
      // Secondary: blended score within same fit tier
      return b.blendedScore - a.blendedScore;
    });

  const screeningRunId = uuidv4();
  const finalResults = rankedCandidates.map(({ candidate, scoreBreakdown, insight }, idx) => ({
    jobId,
    candidateId: candidate._id,
    rank: idx + 1,
    score: scoreBreakdown,
    insight,
    processingTimeMs: Date.now() - startTime,
    screeningRunId,
  }));

  // 8. Save results (replace previous run for this job)
  await ScreeningResult.deleteMany({ jobId, screeningRunId: { $ne: screeningRunId } });
  await ScreeningResult.insertMany(finalResults);

  // 9. Build enriched response
  const enrichedResults = finalResults.map((result, idx) => {
    const { candidate } = rankedCandidates[idx];
    return {
      rank: result.rank,
      candidateId: candidate._id,
      candidateName: `${candidate.profile.firstName} ${candidate.profile.lastName}`,
      candidateEmail: candidate.profile.email,
      candidateHeadline: candidate.profile.headline,
      candidateLocation: candidate.profile.location,
      score: result.score,
      insight: result.insight,
      features: candidate.features,
      source: candidate.source,
    };
  });

  const totalTime = Date.now() - startTime;

  res.json({
    success: true,
    message: `Screening complete. ${topCandidates.length} candidates ranked.`,
    data: {
      screeningRunId,
      jobId,
      jobTitle: job.title,
      totalCandidatesAnalyzed: candidates.length,
      shortlistedCount: topCandidates.length,
      processingTimeMs: totalTime,
      results: enrichedResults,
    },
  });
};

// ─── GET /api/screen/results/:jobId ─────────────────────────────────────────
export const getScreeningResults = async (req: AuthRequest, res: Response): Promise<void> => {
  const { jobId } = req.params;

  // Verify job ownership
  const jobFilter: any = { _id: jobId, ...buildOwnerFilter(req) };
  const job = await Job.findOne(jobFilter).select("title company");
  if (!job) {
    res.json({ success: true, message: "No screening results yet", data: [] });
    return;
  }

  const latestResult = await ScreeningResult.findOne({ jobId }).sort({ createdAt: -1 });
  if (!latestResult) {
    res.json({ success: true, message: "No screening results yet", data: [] });
    return;
  }

  const results = await ScreeningResult.find({
    jobId,
    screeningRunId: latestResult.screeningRunId,
  })
    .sort({ rank: 1 })
    .populate("candidateId");

  res.json({
    success: true,
    data: { job, screeningRunId: latestResult.screeningRunId, runDate: latestResult.createdAt, results },
  });
};

// ─── GET /api/screen/stats/:jobId ───────────────────────────────────────────
export const getScreeningStats = async (req: AuthRequest, res: Response): Promise<void> => {
  const { jobId } = req.params;

  // Verify job ownership
  const jobFilter: any = { _id: jobId, ...buildOwnerFilter(req) };
  const job = await Job.findOne(jobFilter);
  if (!job) {
    res.json({ success: true, data: null });
    return;
  }

  const latestResult = await ScreeningResult.findOne({ jobId }).sort({ createdAt: -1 });
  if (!latestResult) {
    res.json({ success: true, data: null });
    return;
  }

  const results = await ScreeningResult.find({
    jobId,
    screeningRunId: latestResult.screeningRunId,
  });

  const scores = results.map((r) => r.score.totalScore);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const max = Math.max(...scores);
  const min = Math.min(...scores);

  const fitDistribution = results.reduce((acc: Record<string, number>, r) => {
    const fit = r.insight.fitForRole;
    acc[fit] = (acc[fit] || 0) + 1;
    return acc;
  }, {});

  const buckets = { "80-100": 0, "60-79": 0, "40-59": 0, "0-39": 0 };
  for (const score of scores) {
    if (score >= 80) buckets["80-100"]++;
    else if (score >= 60) buckets["60-79"]++;
    else if (score >= 40) buckets["40-59"]++;
    else buckets["0-39"]++;
  }

  res.json({
    success: true,
    data: {
      totalShortlisted: results.length,
      scoreStats: { avg: Math.round(avg), max, min },
      scoreBuckets: buckets,
      fitDistribution,
      avgConfidence:
        Math.round((results.reduce((a, r) => a + r.insight.confidence, 0) / results.length) * 100) / 100,
    },
  });
};

// ─── GET /api/screen/candidate/:resultId/deep-analysis ───────────────────────
export const getDeepAnalysis = async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await ScreeningResult.findById(req.params.resultId).populate("candidateId");
  if (!result) throw new AppError("Screening result not found", 404);

  // Verify job ownership
  const jobFilter: any = { _id: result.jobId, ...buildOwnerFilter(req) };
  const job = await Job.findOne(jobFilter);
  if (!job) throw new AppError("Job not found", 404);

  const candidate = result.candidateId as any;

  const deepAnalysis = await generateDeepCandidateAnalysis(
    job.title,
    job.structuredRequirements!,
    candidate.profile,
    result.rank,
    result.score.totalScore
  );

  res.json({
    success: true,
    data: {
      candidateName: `${candidate.profile.firstName} ${candidate.profile.lastName}`,
      rank: result.rank,
      score: result.score,
      deepAnalysis,
    },
  });
};