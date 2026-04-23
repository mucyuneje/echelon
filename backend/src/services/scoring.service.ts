// ============================================================
// HYBRID SCORING ENGINE
// Combines rule-based scoring with AI insights
// Formula: Score = 0.4*Skills + 0.3*Experience + 0.2*Projects + 0.05*Education + 0.05*Certs
// ============================================================

import { ICandidate } from "../models/candidate.model";
import { IJob } from "../models/job.model";
import { ScoreBreakdown, StructuredJobRequirements } from "../types";

// ─── Skill Matching ────────────────────────────────────────────────────────────

function computeSkillScore(candidate: ICandidate, requirements: StructuredJobRequirements): number {
  // ✅ Fixed: filter out skills with undefined/null name before calling toLowerCase
  const candidateSkills = candidate.profile.skills
    .filter((s) => s?.name)
    .map((s) => s.name.toLowerCase());

  const requiredSkills = requirements.requiredSkills.map((s) => s.toLowerCase());
  const optionalSkills = requirements.optionalSkills.map((s) => s.toLowerCase());

  if (requiredSkills.length === 0) return 50; // No requirements = neutral score

  // Required skills: worth 70% of skill score
  let requiredMatches = 0;
  let proficiencyBonus = 0;

  for (const required of requiredSkills) {
    // ✅ Fixed: guard s.name before calling toLowerCase inside find
    const found = candidate.profile.skills.find(
      (s) => s?.name && (s.name.toLowerCase().includes(required) || required.includes(s.name.toLowerCase()))
    );
    if (found) {
      requiredMatches++;
      // Bonus for higher proficiency
      const levelBonus = { Expert: 1.0, Advanced: 0.8, Intermediate: 0.6, Beginner: 0.4 };
      proficiencyBonus += levelBonus[found.level] || 0.5;
    }
  }

  const requiredMatchRate = requiredMatches / requiredSkills.length;
  const avgProficiency = requiredMatches > 0 ? proficiencyBonus / requiredMatches : 0;

  // Optional skills: worth 30% of skill score
  let optionalMatches = 0;
  for (const optional of optionalSkills) {
    if (
      candidateSkills.some(
        (s) => s.includes(optional) || optional.includes(s)
      )
    ) {
      optionalMatches++;
    }
  }
  const optionalMatchRate =
    optionalSkills.length > 0 ? optionalMatches / optionalSkills.length : 0;

  const rawScore = requiredMatchRate * 0.7 * 100 + optionalMatchRate * 0.3 * 100;

  // Proficiency multiplier (0.7 to 1.0)
  const proficiencyMultiplier = 0.7 + avgProficiency * 0.3;

  return Math.min(100, rawScore * proficiencyMultiplier);
}

// ─── Experience Scoring ────────────────────────────────────────────────────────

function computeExperienceScore(candidate: ICandidate, requirements: StructuredJobRequirements): number {
  const yearsExperience = candidate.features.totalYearsExperience;
  const minRequired = requirements.minExperienceYears || 0;

  if (minRequired === 0) return Math.min(100, yearsExperience * 10);

  if (yearsExperience >= minRequired * 2) return 100;
  if (yearsExperience >= minRequired) {
    // Scales from 70 to 100 when meeting requirement
    return 70 + ((yearsExperience - minRequired) / minRequired) * 30;
  }
  if (yearsExperience >= minRequired * 0.5) {
    // 40-70 for partially meeting requirement
    return 40 + (yearsExperience / minRequired) * 30;
  }
  return Math.max(0, (yearsExperience / minRequired) * 40);
}

// ─── Project Scoring ────────────────────────────────────────────────────────────

function computeProjectScore(candidate: ICandidate, requirements: StructuredJobRequirements): number {
  const projects = candidate.profile.projects;
  if (!projects || projects.length === 0) return 0;

  let totalScore = 0;
  const requiredTech = [
    ...requirements.requiredSkills,
    ...requirements.optionalSkills,
  ].map((s) => s.toLowerCase());

  for (const project of projects) {
    let projectScore = 20; // Base score for having a project

    // Tech relevance
    // ✅ Fixed: guard t before calling toLowerCase
    const projectTech = (project.technologies || [])
      .filter((t) => t)
      .map((t) => t.toLowerCase());

    const techMatches = projectTech.filter((t) =>
      requiredTech.some((r) => r.includes(t) || t.includes(r))
    ).length;

    if (projectTech.length > 0) {
      projectScore += (techMatches / Math.max(projectTech.length, requiredTech.length)) * 50;
    }

    // Bonus: has description (shows communication)
    if (project.description && project.description.length > 50) projectScore += 15;

    // Bonus: has link (verifiable)
    if (project.link) projectScore += 15;

    totalScore += Math.min(100, projectScore);
  }

  // Average project score, capped at 100, with diminishing returns after 3 projects
  const projectCount = projects.length;
  const avgScore = totalScore / projectCount;
  const countBonus = Math.min(15, (projectCount - 1) * 5); // +5 per extra project, max +15

  return Math.min(100, avgScore + countBonus);
}

// ─── Education Scoring ────────────────────────────────────────────────────────

function computeEducationScore(candidate: ICandidate, requirements: StructuredJobRequirements): number {
  const education = candidate.profile.education;
  if (!education || education.length === 0) return 30; // Some score even without formal education

  const degreeLevel: Record<string, number> = {
    phd: 100,
    doctorate: 100,
    master: 85,
    bachelor: 70,
    associate: 55,
    diploma: 45,
    certificate: 40,
    high: 30,
  };

  let maxScore = 30;
  for (const edu of education) {
    // ✅ Fixed: guard edu.degree before calling toLowerCase
    if (!edu?.degree) continue;
    const degreeLower = edu.degree.toLowerCase();
    for (const [key, score] of Object.entries(degreeLevel)) {
      if (degreeLower.includes(key)) {
        maxScore = Math.max(maxScore, score);
        break;
      }
    }
  }

  // Bonus: CS-related field of study
  const csFields = ["computer", "software", "information", "data", "engineering", "mathematics"];
  const hasCSField = education.some((e) =>
    // ✅ Fixed: guard e.fieldOfStudy before calling toLowerCase
    e?.fieldOfStudy && csFields.some((f) => e.fieldOfStudy.toLowerCase().includes(f))
  );
  if (hasCSField) maxScore = Math.min(100, maxScore + 10);

  return maxScore;
}

// ─── Certification Scoring ────────────────────────────────────────────────────

function computeCertificationScore(
  candidate: ICandidate,
  requirements: StructuredJobRequirements
): number {
  const certs = candidate.profile.certifications;
  if (!certs || certs.length === 0) return 0;

  const requiredTech = requirements.requiredSkills.map((s) => s.toLowerCase());
  let score = 0;

  for (const cert of certs) {
    // ✅ Fixed: guard cert.name before calling toLowerCase
    if (!cert?.name) continue;
    const certName = cert.name.toLowerCase();
    const isRelevant = requiredTech.some(
      (tech) => certName.includes(tech) || tech.includes(certName.split(" ")[0])
    );
    score += isRelevant ? 30 : 10;
  }

  return Math.min(100, score);
}

// ─── Main Scoring Function ──────────────────────────────────────────────────────

export function calculateHybridScore(candidate: ICandidate, job: IJob): ScoreBreakdown {
  const requirements = job.structuredRequirements;

  if (!requirements) {
    // No structured requirements yet - return baseline
    return {
      skillScore: 50,
      experienceScore: 50,
      projectScore: 50,
      educationScore: 50,
      certificationScore: 50,
      totalScore: 50,
    };
  }

  const skillScore = Math.round(computeSkillScore(candidate, requirements));
  const experienceScore = Math.round(computeExperienceScore(candidate, requirements));
  const projectScore = Math.round(computeProjectScore(candidate, requirements));
  const educationScore = Math.round(computeEducationScore(candidate, requirements));
  const certificationScore = Math.round(computeCertificationScore(candidate, requirements));

  const w = requirements.weights;
  const totalScore = Math.round(
    skillScore * w.skills +
    experienceScore * w.experience +
    projectScore * w.projects +
    educationScore * w.education +
    certificationScore * w.certifications
  );

  return {
    skillScore,
    experienceScore,
    projectScore,
    educationScore,
    certificationScore,
    totalScore: Math.min(100, totalScore),
  };
}

// ─── Feature Extraction ────────────────────────────────────────────────────────

export function extractCandidateFeatures(profile: any) {
  // Calculate total years of experience
  let totalYearsExperience = 0;
  if (profile.experience && Array.isArray(profile.experience)) {
    for (const exp of profile.experience) {
      try {
        const start = new Date(exp.startDate + "-01");
        const end =
          exp.endDate === "Present" || exp.isCurrent
            ? new Date()
            : new Date(exp.endDate + "-01");
        const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
        if (years > 0 && years < 50) totalYearsExperience += years;
      } catch {
        // Skip invalid dates
      }
    }
  }

  const uniqueSkills = [
    ...new Set(
      (profile.skills || []).map((s: any) => s.name?.toLowerCase()).filter(Boolean)
    ),
  ] as string[];

  const projectCount = (profile.projects || []).length;
  const hasRelevantCertifications = (profile.certifications || []).length > 0;

  // Seniority level heuristic
  let seniorityLevel: "Junior" | "Mid" | "Senior" | "Lead" | "Unknown" = "Unknown";
  const years = totalYearsExperience;
  if (years < 2) seniorityLevel = "Junior";
  else if (years < 5) seniorityLevel = "Mid";
  else if (years < 10) seniorityLevel = "Senior";
  else seniorityLevel = "Lead";

  // Override with headline keywords
  const headline = (profile.headline || "").toLowerCase();
  if (headline.includes("junior") || headline.includes("entry")) seniorityLevel = "Junior";
  else if (headline.includes("senior") || headline.includes("sr.")) seniorityLevel = "Senior";
  else if (headline.includes("lead") || headline.includes("principal")) seniorityLevel = "Lead";

  return {
    totalYearsExperience: Math.round(totalYearsExperience * 10) / 10,
    uniqueSkills,
    projectCount,
    hasRelevantCertifications,
    seniorityLevel,
  };
}