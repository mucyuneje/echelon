// ============================================================
// UMURAVA AI HACKATHON - TYPE DEFINITIONS
// Matches the official Talent Profile Schema Specification
// ============================================================

export interface SkillObject {
  name: string;
  level: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  yearsOfExperience: number;
}

export interface LanguageObject {
  name: string;
  proficiency: "Basic" | "Conversational" | "Fluent" | "Native";
}

export interface ExperienceObject {
  company: string;
  role: string;
  startDate: string; // YYYY-MM
  endDate: string | "Present";
  description: string;
  technologies: string[];
  isCurrent: boolean;
}

export interface EducationObject {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear: number;
  endYear: number | null;
}

export interface CertificationObject {
  name: string;
  issuer: string;
  issueDate: string; // YYYY-MM
}

export interface ProjectObject {
  name: string;
  description: string;
  technologies: string[];
  role: string;
  link?: string;
  startDate: string; // YYYY-MM
  endDate?: string; // YYYY-MM
}

export interface AvailabilityObject {
  status: "Available" | "Open to Opportunities" | "Not Available";
  type: "Full-time" | "Part-time" | "Contract";
  startDate?: string; // YYYY-MM-DD
}

export interface SocialLinksObject {
  linkedin?: string;
  github?: string;
  portfolio?: string;
  twitter?: string;
  [key: string]: string | undefined;
}

// Official Talent Profile Schema (Scenario 1 - Umurava Platform)
export interface TalentProfile {
  firstName: string;
  lastName: string;
  email: string;
  headline: string;
  bio?: string;
  location: string;
  skills: SkillObject[];
  languages?: LanguageObject[];
  experience: ExperienceObject[];
  education: EducationObject[];
  certifications?: CertificationObject[];
  projects: ProjectObject[];
  availability: AvailabilityObject;
  socialLinks?: SocialLinksObject;
}

// Job structured requirements (parsed by AI)
export interface JobWeights {
  skills: number;
  experience: number;
  projects: number;
  education: number;
  certifications: number;
}

export interface StructuredJobRequirements {
  requiredSkills: string[];
  optionalSkills: string[];
  minExperienceYears: number;
  educationLevel: string;
  weights: JobWeights;
  roleType: string;
  keyResponsibilities: string[];
}

// Scoring breakdown
export interface ScoreBreakdown {
  skillScore: number;       // 0-100
  experienceScore: number;  // 0-100
  projectScore: number;     // 0-100
  educationScore: number;   // 0-100
  certificationScore: number; // 0-100
  totalScore: number;       // 0-100 (weighted)
}

// AI-generated candidate insight
export interface CandidateInsight {
  strengths: string[];
  gaps: string[];
  recommendation: string;
  confidence: number;        // 0-1
  biasNote?: string;
  fitForRole: "Strong Fit" | "Good Fit" | "Partial Fit" | "Poor Fit";
  alternativeRoleSuggestion?: string;
}

// Final screening result per candidate
export interface ScreeningResultData {
  rank: number;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  score: ScoreBreakdown;
  insight: CandidateInsight;
}
