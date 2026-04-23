// ============================================================
// UMURAVA AI HACKATHON - PROMPT ENGINEERING
// All prompts centralized here for easy tuning & documentation
// ============================================================

/**
 * PROMPT 1: Resume Parser
 * Converts raw resume text into the Umurava Talent Profile Schema
 */
export function buildResumeParserPrompt(resumeText: string): string {
  return `You are an expert HR data extraction system. Extract structured information from the resume below.

INSTRUCTIONS:
- Extract ALL available information accurately
- For missing fields, use reasonable defaults (empty arrays, "Unknown", etc.)
- Skills level: infer from context ("Beginner" | "Intermediate" | "Advanced" | "Expert")
- Dates format: "YYYY-MM" for experience/projects, number for education years
- Be precise about technologies mentioned

Return ONLY valid JSON matching this exact schema, no extra text:

{
  "firstName": "string",
  "lastName": "string",
  "email": "string (or 'not_found@email.com' if missing)",
  "headline": "string (infer from their top role/skills)",
  "bio": "string (summary if available, else null)",
  "location": "string (or 'Not specified')",
  "skills": [
    { "name": "string", "level": "Beginner|Intermediate|Advanced|Expert", "yearsOfExperience": number }
  ],
  "languages": [
    { "name": "string", "proficiency": "Basic|Conversational|Fluent|Native" }
  ],
  "experience": [
    {
      "company": "string",
      "role": "string",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM or Present",
      "description": "string",
      "technologies": ["string"],
      "isCurrent": boolean
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "fieldOfStudy": "string",
      "startYear": number,
      "endYear": number or null
    }
  ],
  "certifications": [
    { "name": "string", "issuer": "string", "issueDate": "YYYY-MM" }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "technologies": ["string"],
      "role": "string",
      "link": "string or null",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM or null"
    }
  ],
  "availability": {
    "status": "Available|Open to Opportunities|Not Available",
    "type": "Full-time|Part-time|Contract"
  },
  "socialLinks": {
    "linkedin": "string or null",
    "github": "string or null",
    "portfolio": "string or null"
  }
}

RESUME TEXT:
${resumeText}`;
}

/**
 * PROMPT 2: Job Analyzer
 * Converts raw job description into structured requirements with weights
 */
export function buildJobAnalyzerPrompt(jobDescription: string, jobTitle: string): string {
  return `You are an expert job requirements analyst. Analyze this job posting and extract structured requirements.

INSTRUCTIONS:
- Extract explicit AND implied requirements
- Assign weights that sum to exactly 1.0 based on job priorities
- Be specific about skill names (exact technology names)
- Estimate minimum experience from context

Return ONLY valid JSON, no extra text:

{
  "requiredSkills": ["string - must-have skills/technologies"],
  "optionalSkills": ["string - nice-to-have skills"],
  "minExperienceYears": number,
  "educationLevel": "High School|Associate|Bachelor's|Master's|PhD|Not Required",
  "roleType": "string (e.g., Backend Engineer, Data Scientist)",
  "keyResponsibilities": ["string - top 5 main responsibilities"],
  "weights": {
    "skills": number (0.0-1.0),
    "experience": number (0.0-1.0),
    "projects": number (0.0-1.0),
    "education": number (0.0-1.0),
    "certifications": number (0.0-1.0)
  }
}

Note: weights MUST sum to exactly 1.0

JOB TITLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription}`;
}

/**
 * PROMPT 3: Multi-Candidate Ranking + Explanation
 * The most critical prompt - ranks candidates and generates explanations
 * Processes up to 20 candidates in a single call
 */
export function buildRankingPrompt(
  jobTitle: string,
  jobDescription: string,
  structuredRequirements: object,
  candidatesWithScores: Array<{ id: string; name: string; profile: object; computedScore: number }>
): string {
  return `You are a senior AI recruiter analyzing candidates for a job position. Your task is to validate pre-computed scores, rank candidates, and generate clear explanations for each.

JOB: ${jobTitle}
STRUCTURED REQUIREMENTS: ${JSON.stringify(structuredRequirements, null, 2)}

CANDIDATES (with pre-computed algorithmic scores):
${JSON.stringify(candidatesWithScores, null, 2)}

INSTRUCTIONS:
1. Review each candidate against the job requirements
2. For each candidate, identify their top 3 strengths relative to THIS role
3. Identify up to 3 gaps or concerns
4. Write a 1-2 sentence recommendation
5. Assign a final adjusted score (0-100) that considers both algorithmic score and your assessment
6. Flag any potential bias concerns (incomplete data, unconventional backgrounds, etc.)
7. Suggest an alternative role if candidate is not ideal for this role but has strong skills

Return ONLY valid JSON array, no extra text:

[
  {
    "candidateId": "string (use the id provided)",
    "adjustedScore": number (0-100),
    "strengths": ["string - specific, evidence-based strength related to job"],
    "gaps": ["string - specific gap or concern"],
    "recommendation": "string - 1-2 sentences, recruiter-friendly",
    "confidence": number (0.0-1.0, lower if incomplete data),
    "biasNote": "string or null (flag if limited data affects fairness)",
    "fitForRole": "Strong Fit|Good Fit|Partial Fit|Poor Fit",
    "alternativeRoleSuggestion": "string or null"
  }
]

Be specific and reference actual skills/experience from the profile. Avoid vague statements.`;
}

/**
 * PROMPT 4: Single Candidate Deep Analysis
 * For the "Why was this candidate selected/rejected" feature
 */
export function buildCandidateAnalysisPrompt(
  jobTitle: string,
  requirements: object,
  candidate: object,
  rank: number,
  score: number
): string {
  return `You are a senior recruiter explaining a hiring decision to a stakeholder.

JOB: ${jobTitle}
REQUIREMENTS: ${JSON.stringify(requirements)}
CANDIDATE: ${JSON.stringify(candidate)}
RANK: #${rank} | SCORE: ${score}/100

Provide a detailed, honest analysis explaining:
1. WHY this candidate received this ranking
2. What makes them stand out (or not)
3. Specific risks or red flags if any
4. Interview questions to ask this specific candidate
5. What would make them a perfect fit

Return ONLY valid JSON:
{
  "executiveSummary": "string (3-4 sentences for a busy hiring manager)",
  "detailedStrengths": ["string - detailed, evidence-based"],
  "detailedGaps": ["string - specific concerns with context"],
  "redFlags": ["string or empty array"],
  "suggestedInterviewQuestions": ["string - specific to this candidate"],
  "whatWouldMakeThemPerfect": "string",
  "hiringRisk": "Low|Medium|High",
  "recommendation": "Strongly Recommend|Recommend|Consider|Not Recommended"
}`;
}
