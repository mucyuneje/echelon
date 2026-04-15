import { callGeminiWithRetry, extractJSON } from "./geminiClient";
import { buildJobAnalyzerPrompt } from "./prompts";
import { StructuredJobRequirements } from "../types";

export async function analyzeJobWithAI(
  jobTitle: string,
  jobDescription: string
): Promise<StructuredJobRequirements> {
  const prompt = buildJobAnalyzerPrompt(jobDescription, jobTitle);
  const rawResponse = await callGeminiWithRetry(prompt);
  const jsonStr = extractJSON(rawResponse);

  let parsed: StructuredJobRequirements;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(`AI returned invalid JSON for job analysis: ${jsonStr.slice(0, 200)}`);
  }

  // Ensure weights sum to 1.0
  const weights = parsed.weights;
  const total =
    weights.skills + weights.experience + weights.projects +
    weights.education + weights.certifications;

  if (Math.abs(total - 1.0) > 0.05) {
    // Normalize weights
    parsed.weights = {
      skills: weights.skills / total,
      experience: weights.experience / total,
      projects: weights.projects / total,
      education: weights.education / total,
      certifications: weights.certifications / total,
    };
  }

  return parsed;
}
