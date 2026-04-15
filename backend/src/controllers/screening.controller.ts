import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { Job } from "../models/job.model";
import { Candidate } from "../models/candidate.model";
import { ScreeningResult } from "../models/screening-result.model";
import { calculateHybridScore } from "../services/scoring.service";
import { generateAIInsights, generateDeepCandidateAnalysis } from "../ai/rankingEngine";
import { analyzeJobWithAI } from "../ai/jobAnalyzer";
import { AppError } from "../middleware/error.middleware";

// ─── POST /api/screen/run/:jobId ─────────────────────────────────────────────
// Main screening engine: score all candidates for a job, rank, explain

export const runScreening = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const { jobId } = req.params;
  const { topN = 20, candidateIds } = req.body;

  // 1. Get job
  const job = await Job.findById(jobId);
  if (!job) throw new AppError("Job not found", 404);

  // 2. Ensure job has structured requirements (AI-analyzed)
  if (!job.structuredRequirements) {
    console.log("⚙️  Running job analysis first...");
    const structured = await analyzeJobWithAI(job.title, job.description);
    job.structuredRequirements = structured;
    await job.save();
  }

  // 3. Fetch candidates (all for this job, or specific IDs)
  const candidateFilter: any = {};
  if (candidateIds && Array.isArray(candidateIds)) {
    candidateFilter._id = { $in: candidateIds };
  } else {
    // Get candidates associated with this job OR all candidates (flexible)
    candidateFilter.$or = [{ jobId }, { jobId: { $exists: false } }];
  }

  const candidates = await Candidate.find(candidateFilter);

  if (candidates.length === 0) {
    throw new AppError(
      "No candidates found. Upload candidates first via /api/candidates/upload-cv or /upload-spreadsheet",
      400
    );
  }

  // 4. Compute algorithmic scores for all candidates
  const scored = candidates.map((candidate) => {
    const scoreBreakdown = calculateHybridScore(candidate, job);
    return { candidate, scoreBreakdown };
  });

  // 5. Sort by total score descending
  scored.sort((a, b) => b.scoreBreakdown.totalScore - a.scoreBreakdown.totalScore);

  // 6. Take top N
  const topCandidates = scored.slice(0, topN);

  // 7. Generate AI insights for top candidates (the "why" explanations)
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

  // 8. Build final results & assign ranks
  const screeningRunId = uuidv4();
  const finalResults = [];

  for (let rank = 0; rank < topCandidates.length; rank++) {
    const { candidate, scoreBreakdown } = topCandidates[rank];
    const insight = insightMap.get(candidate._id.toString()) || {
      strengths: ["Profile reviewed"],
      gaps: [],
      recommendation: "Review candidate manually",
      confidence: 0.5,
      fitForRole: "Partial Fit" as const,
    };

    // Blend: 70% algorithmic score + 30% AI-adjusted score
    const aiAdjustedScore = insightMap.get(candidate._id.toString())
      ? undefined
      : scoreBreakdown.totalScore;

    const processingTime = Date.now() - startTime;

    finalResults.push({
      jobId,
      candidateId: candidate._id,
      rank: rank + 1,
      score: scoreBreakdown,
      insight,
      processingTimeMs: processingTime,
      screeningRunId,
    });
  }

  // 9. Save results to DB
  await ScreeningResult.deleteMany({ jobId, screeningRunId: { $ne: screeningRunId } });
  await ScreeningResult.insertMany(finalResults);

  // 10. Build response with full candidate data
  const enrichedResults = finalResults.map((result, idx) => {
    const { candidate } = topCandidates[idx];
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
// Get latest screening results for a job

export const getScreeningResults = async (req: Request, res: Response): Promise<void> => {
  const { jobId } = req.params;

  // Get most recent run
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

  const job = await Job.findById(jobId).select("title company");

  res.json({
    success: true,
    data: {
      job,
      screeningRunId: latestResult.screeningRunId,
      runDate: latestResult.createdAt,
      results,
    },
  });
};

// ─── GET /api/screen/candidate/:resultId/deep-analysis ───────────────────────
// Deep AI analysis for a specific candidate result

export const getDeepAnalysis = async (req: Request, res: Response): Promise<void> => {
  const result = await ScreeningResult.findById(req.params.resultId).populate("candidateId");
  if (!result) throw new AppError("Screening result not found", 404);

  const job = await Job.findById(result.jobId);
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

// ─── GET /api/screen/stats/:jobId ───────────────────────────────────────────
// Analytics: score distribution, skill gaps across all candidates

export const getScreeningStats = async (req: Request, res: Response): Promise<void> => {
  const { jobId } = req.params;

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

  // Score buckets
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
        Math.round(
          (results.reduce((a, r) => a + r.insight.confidence, 0) / results.length) * 100
        ) / 100,
    },
  });
};
