export interface User { _id: string; name: string; email: string; role: string }
export interface AuthState { user: User | null; token: string | null; loading: boolean; error: string | null }

export interface Job {
  _id: string; title: string; company: string; description: string
  location: string; jobType: string; isActive: boolean
  structuredRequirements: StructuredRequirements | null
  createdAt: string; createdBy: { name: string; email: string }
}
export interface StructuredRequirements {
  requiredSkills: string[]; optionalSkills: string[]; minExperienceYears: number
  educationLevel: string; roleType: string; keyResponsibilities: string[]
  weights: { skills: number; experience: number; projects: number; education: number; certifications: number }
}

export interface Skill { name: string; level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'; yearsOfExperience: number }
export interface CandidateProfile {
  firstName: string; lastName: string; email: string; headline: string
  bio?: string; location: string; skills: Skill[]
  experience: any[]; education: any[]; certifications: any[]; projects: any[]
  availability: { status: string; type: string }; socialLinks?: any
}
export interface CandidateFeatures {
  totalYearsExperience: number; uniqueSkills: string[]
  projectCount: number; hasRelevantCertifications: boolean
  seniorityLevel: string
}
export interface Candidate {
  _id: string; source: string; profile: CandidateProfile
  features: CandidateFeatures; originalFileName?: string; createdAt: string
}

export interface ScoreBreakdown {
  skillScore: number; experienceScore: number; projectScore: number
  educationScore: number; certificationScore: number; totalScore: number
}
export interface CandidateInsight {
  strengths: string[]; gaps: string[]; recommendation: string
  confidence: number; biasNote?: string
  fitForRole: 'Strong Fit' | 'Good Fit' | 'Partial Fit' | 'Poor Fit'
  alternativeRoleSuggestion?: string
}
export interface ScreeningResultItem {
  rank: number; candidateId: string; candidateName: string
  candidateEmail: string; candidateHeadline: string; candidateLocation: string
  score: ScoreBreakdown; insight: CandidateInsight
  features: CandidateFeatures; source: string
}
export interface ScreeningResponse {
  screeningRunId: string; jobId: string; jobTitle: string
  totalCandidatesAnalyzed: number; shortlistedCount: number
  processingTimeMs: number; results: ScreeningResultItem[]
}
export interface ScreeningStats {
  totalShortlisted: number
  scoreStats: { avg: number; max: number; min: number }
  scoreBuckets: Record<string, number>
  fitDistribution: Record<string, number>
  avgConfidence: number
}
