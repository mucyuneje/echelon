import { callGeminiWithRetry, extractJSON } from "./geminiClient";
import { buildResumeParserPrompt } from "./prompts";
import { TalentProfile } from "../types";

export async function parseResumeWithAI(resumeText: string): Promise<TalentProfile> {
  if (!resumeText || resumeText.trim().length < 50) {
    throw new Error("Resume text is too short or empty to parse");
  }

  const prompt = buildResumeParserPrompt(resumeText);
  const rawResponse = await callGeminiWithRetry(prompt);
  const jsonStr = extractJSON(rawResponse);

  let parsed: TalentProfile;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(`AI returned invalid JSON for resume parsing: ${jsonStr.slice(0, 200)}`);
  }

  // Validate required fields - fill defaults if missing
  return sanitizeParsedProfile(parsed);
}

function sanitizeParsedProfile(raw: any): TalentProfile {
  return {
    firstName: raw.firstName || "Unknown",
    lastName: raw.lastName || "",
    email: raw.email || "not_found@resume.com",
    headline: raw.headline || "Professional",
    bio: raw.bio || undefined,
    location: raw.location || "Not specified",
    skills: Array.isArray(raw.skills) ? raw.skills : [],
    languages: Array.isArray(raw.languages) ? raw.languages : [],
    experience: Array.isArray(raw.experience) ? raw.experience : [],
    education: Array.isArray(raw.education) ? raw.education : [],
    certifications: Array.isArray(raw.certifications) ? raw.certifications : [],
    projects: Array.isArray(raw.projects) ? raw.projects : [],
    availability: raw.availability || { status: "Open to Opportunities", type: "Full-time" },
    socialLinks: raw.socialLinks || {},
  };
}
