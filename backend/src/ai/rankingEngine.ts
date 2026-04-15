import { callGeminiWithRetry, extractJSON } from "./geminiClient";
import { buildRankingPrompt, buildCandidateAnalysisPrompt } from "./prompts";
import { CandidateInsight, StructuredJobRequirements } from "../types";

interface RankingInput {
  id: string;
  name: string;
  profile: object;
  computedScore: number;
}

interface AIRankingOutput {
  candidateId: string;
  adjustedScore: number;
  strengths: string[];
  gaps: string[];
  recommendation: string;
  confidence: number;
  biasNote: string | null;
  fitForRole: "Strong Fit" | "Good Fit" | "Partial Fit" | "Poor Fit";
  alternativeRoleSuggestion: string | null;
}

export async function generateAIInsights(
  jobTitle: string,
  jobDescription: string,
  structuredRequirements: StructuredJobRequirements,
  candidates: RankingInput[]
): Promise<Map<string, CandidateInsight>> {
  // Process in batches of 10 to avoid token limits
  const BATCH_SIZE = 10;
  const insightMap = new Map<string, CandidateInsight>();

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);

    const prompt = buildRankingPrompt(
      jobTitle,
      jobDescription,
      structuredRequirements,
      batch
    );

    const rawResponse = await callGeminiWithRetry(prompt);
    const jsonStr = extractJSON(rawResponse);

    let results: AIRankingOutput[];
    try {
      results = JSON.parse(jsonStr);
      if (!Array.isArray(results)) {
        // Sometimes Gemini wraps in object
        results = (results as any).candidates || (results as any).results || [];
      }
    } catch {
      console.error("Failed to parse AI ranking response:", jsonStr.slice(0, 500));
      // Fallback: generate basic insights for this batch
      results = batch.map((c) => ({
        candidateId: c.id,
        adjustedScore: c.computedScore,
        strengths: ["Profile reviewed"],
        gaps: ["Detailed analysis unavailable"],
        recommendation: "Manual review recommended",
        confidence: 0.5,
        biasNote: "AI analysis failed for this batch",
        fitForRole: "Partial Fit" as const,
        alternativeRoleSuggestion: null,
      }));
    }

    // Map results
    for (const result of results) {
      insightMap.set(result.candidateId, {
        strengths: result.strengths || [],
        gaps: result.gaps || [],
        recommendation: result.recommendation || "",
        confidence: result.confidence ?? 0.7,
        biasNote: result.biasNote || undefined,
        fitForRole: result.fitForRole || "Partial Fit",
        alternativeRoleSuggestion: result.alternativeRoleSuggestion || undefined,
      });
    }
  }

  return insightMap;
}

export async function generateDeepCandidateAnalysis(
  jobTitle: string,
  requirements: StructuredJobRequirements,
  candidate: object,
  rank: number,
  score: number
) {
  const prompt = buildCandidateAnalysisPrompt(
    jobTitle,
    requirements,
    candidate,
    rank,
    score
  );

  const rawResponse = await callGeminiWithRetry(prompt);
  const jsonStr = extractJSON(rawResponse);

  try {
    return JSON.parse(jsonStr);
  } catch {
    return {
      executiveSummary: "Analysis could not be generated. Please review manually.",
      detailedStrengths: [],
      detailedGaps: [],
      redFlags: [],
      suggestedInterviewQuestions: [],
      whatWouldMakeThemPerfect: "N/A",
      hiringRisk: "Medium",
      recommendation: "Consider",
    };
  }
}
