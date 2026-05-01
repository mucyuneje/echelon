import pdfParse from "pdf-parse";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { TalentProfile } from "../types";

// ─── PDF Validation ───────────────────────────────────────────────────────────

function assertValidPdfBytes(buffer: Buffer): void {
  const header = buffer.slice(0, 5).toString("ascii");
  if (header !== "%PDF-") {
    throw new Error(
      "The uploaded file does not appear to be a valid PDF. " +
        "Please check the file and try again."
    );
  }
}

// ─── PDF Parsing ──────────────────────────────────────────────────────────────

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  assertValidPdfBytes(buffer);

  try {
    const data = await pdfParse(buffer);
    if (!data.text || data.text.trim().length < 20) {
      throw new Error(
        "PDF appears to be empty or image-based (no extractable text). " +
          "Please upload a text-based PDF."
      );
    }
    return data.text;
  } catch (error: any) {
    if (error.message?.includes("XRef") || error.message?.includes("xref")) {
      throw new Error(
        "The PDF file is corrupted or uses an unsupported format. " +
          "Please try re-saving the PDF and uploading again."
      );
    }
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
}

// ─── JSON-aware column helpers ────────────────────────────────────────────────

/**
 * Safely parse a value that may be a JSON string or already an object/array.
 * Returns null if the value is empty or cannot be parsed.
 */
function tryParseJSON<T = any>(value: unknown): T | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "object") return value as T;
  if (typeof value === "number" || typeof value === "boolean") return value as unknown as T;

  const str = String(value).trim();
  if (!str || str === "[]" || str === "{}") return null;

  try {
    return JSON.parse(str) as T;
  } catch {
    return null;
  }
}

// ─── Column alias map ─────────────────────────────────────────────────────────

const COLUMN_ALIASES: Record<string, string[]> = {
  firstName: ["first name", "firstname", "first_name", "given name", "name"],
  lastName: ["last name", "lastname", "last_name", "surname", "family name"],
  email: ["email", "email address", "e-mail", "contact email"],
  headline: ["headline", "title", "job title", "position", "role", "professional title"],
  location: ["location", "city", "country", "address", "based in"],
  skills: ["skills", "skill set", "technologies", "tech stack", "competencies"],
  yearsExperience: ["years experience", "experience years", "total experience", "years of experience", "yoe"],
  education: ["education", "degree", "university", "school", "institution"],
  linkedin: ["linkedin", "linkedin url", "linkedin profile"],
  github: ["github", "github url", "github profile"],
  bio: ["bio", "summary", "about", "profile summary", "objective"],
  experience: ["experience", "work experience", "employment", "work history"],
  certifications: ["certifications", "certs", "certificates", "credentials"],
  projects: ["projects", "portfolio", "work samples"],
  availability: ["availability", "available", "status"],
  socialLinks: ["sociallinks", "social links", "social", "links", "social_links"],
};

function findColumn(row: Record<string, string>, fieldKey: string): string | undefined {
  const aliases = COLUMN_ALIASES[fieldKey] || [fieldKey];
  const entries = Object.entries(row);

  for (const alias of aliases) {
    const found = entries.find(([k]) => {
      const kl = k.toLowerCase().trim();
      return kl === alias || kl.includes(alias);
    });
    if (found) return found[1];
  }
  return undefined;
}

// ─── Skill normalisation ──────────────────────────────────────────────────────

type SkillLevel = "Beginner" | "Intermediate" | "Advanced" | "Expert";

function normaliseLevel(raw: string | undefined): SkillLevel {
  const map: Record<string, SkillLevel> = {
    beginner: "Beginner",
    junior: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
    expert: "Expert",
    senior: "Expert",
  };
  const key = (raw || "").toLowerCase().replace(/[^a-z]/g, "");
  return map[key] ?? "Intermediate";
}

/**
 * Parse the skills column, which may be:
 *  (a) a JSON array  → [ { name, level, yearsOfExperience }, ... ]
 *  (b) a plain comma/semicolon separated string → "Node.js, Python, AWS"
 */
function parseSkillsColumn(raw: string | undefined): TalentProfile["skills"] {
  if (!raw) return [];

  // Try JSON first
  const parsed = tryParseJSON<any[]>(raw);
  if (Array.isArray(parsed)) {
    return parsed
      .filter((s) => s && typeof s === "object" && s.name)
      .map((s) => ({
        name: String(s.name).trim(),
        level: normaliseLevel(s.level),
        yearsOfExperience: Number(s.yearsOfExperience) || 0,
      }));
  }

  // Fallback: plain-text list
  return String(raw)
    .split(/[,|;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => ({ name, level: "Intermediate" as SkillLevel, yearsOfExperience: 0 }));
}

/**
 * Parse the experience column, which may be:
 *  (a) a JSON array  → [ { company, role, startDate, endDate, description, technologies, isCurrent }, ... ]
 *  (b) missing / empty → []
 */
function parseExperienceColumn(raw: string | undefined): TalentProfile["experience"] {
  if (!raw) return [];

  const parsed = tryParseJSON<any[]>(raw);
  if (Array.isArray(parsed)) {
    return parsed
      .filter((e) => e && typeof e === "object")
      .map((e) => ({
        company: String(e.company || "Unknown Company").trim(),
        role: String(e.role || "Professional").trim(),
        startDate: String(e.startDate || "").trim(),
        endDate: String(e.endDate || "Present").trim(),
        description: String(e.description || "").trim(),
        technologies: Array.isArray(e.technologies)
          ? e.technologies.map(String)
          : String(e.technologies || "")
              .split(/[,;]/)
              .map((t) => t.trim())
              .filter(Boolean),
        isCurrent: Boolean(e.isCurrent),
      }));
  }

  return [];
}

/**
 * Parse the education column, which may be a JSON array or a plain string.
 */
function parseEducationColumn(
  raw: string | undefined
): TalentProfile["education"] {
  if (!raw) return [];

  const parsed = tryParseJSON<any[]>(raw);
  if (Array.isArray(parsed)) {
    return parsed
      .filter((e) => e && typeof e === "object")
      .map((e) => ({
        institution: String(e.institution || "Unknown Institution").trim(),
        degree: String(e.degree || "Bachelor's").trim(),
        fieldOfStudy: String(e.fieldOfStudy || "Not specified").trim(),
        startYear: Number(e.startYear) || 2015,
        endYear: Number(e.endYear) || 2019,
      }));
  }

  // Fallback: treat as single institution string
  const str = String(raw).trim();
  if (!str) return [];
  return [
    {
      institution: str,
      degree: "Bachelor's",
      fieldOfStudy: "Not specified",
      startYear: 2015,
      endYear: 2019,
    },
  ];
}

/**
 * Parse the certifications column.
 */
function parseCertificationsColumn(
  raw: string | undefined
): TalentProfile["certifications"] {
  if (!raw) return [];

  const parsed = tryParseJSON<any[]>(raw);
  if (Array.isArray(parsed)) {
    return parsed
      .filter((c) => c && typeof c === "object" && c.name)
      .map((c) => ({
        name: String(c.name).trim(),
        issuer: String(c.issuer || "").trim(),
        issueDate: String(c.issueDate || "").trim(),
        expiryDate: c.expiryDate ? String(c.expiryDate).trim() : undefined,
        credentialId: c.credentialId ? String(c.credentialId).trim() : undefined,
        url: c.url ? String(c.url).trim() : undefined,
      }));
  }

  return [];
}

/**
 * Parse the projects column.
 */
function parseProjectsColumn(raw: string | undefined): TalentProfile["projects"] {
  if (!raw) return [];

  const parsed = tryParseJSON<any[]>(raw);
  if (Array.isArray(parsed)) {
    return parsed
      .filter((p) => p && typeof p === "object" && p.name)
      .map((p) => ({
        name: String(p.name).trim(),
        description: String(p.description || "").trim(),
        technologies: Array.isArray(p.technologies)
          ? p.technologies.map(String)
          : String(p.technologies || "")
              .split(/[,;]/)
              .map((t) => t.trim())
              .filter(Boolean),
        role: p.role ? String(p.role).trim() : undefined,
        link: p.link ? String(p.link).trim() : undefined,
        startDate: p.startDate ? String(p.startDate).trim() : undefined,
        endDate: p.endDate ? String(p.endDate).trim() : undefined,
      }));
  }

  return [];
}

/**
 * Parse the availability column (JSON object or plain string).
 */
function parseAvailabilityColumn(
  raw: string | undefined
): TalentProfile["availability"] {
  const defaults: TalentProfile["availability"] = {
    status: "Open to Opportunities",
    type: "Full-time",
  };

  if (!raw) return defaults;

  const parsed = tryParseJSON<any>(raw);
  if (parsed && typeof parsed === "object") {
    return {
      status: parsed.status || defaults.status,
      type: parsed.type || defaults.type,
      startDate: parsed.startDate,
    };
  }

  return defaults;
}

/**
 * Parse the socialLinks column (JSON object or plain string).
 */
function parseSocialLinksColumn(
  raw: string | undefined,
  linkedinFallback: string | undefined,
  githubFallback: string | undefined
): TalentProfile["socialLinks"] {
  const parsed = tryParseJSON<any>(raw);
  if (parsed && typeof parsed === "object") {
    return {
      linkedin: parsed.linkedin || linkedinFallback,
      github: parsed.github || githubFallback,
      portfolio: parsed.portfolio,
      twitter: parsed.twitter,
      website: parsed.website,
    };
  }

  return {
    linkedin: linkedinFallback,
    github: githubFallback,
  };
}

/**
 * Compute total years of experience from parsed experience array.
 */
function computeTotalYearsExperience(
  experience: TalentProfile["experience"]
): number {
  if (!experience.length) return 0;

  let total = 0;
  const now = new Date();

  for (const exp of experience) {
    const start = exp.startDate ? new Date(exp.startDate + "-01") : null;
    const end =
      exp.isCurrent || !exp.endDate || exp.endDate === "Present"
        ? now
        : new Date(exp.endDate + "-01");

    if (start && end && end > start) {
      total += (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    }
  }

  return Math.round(total * 10) / 10;
}

// ─── Core row → TalentProfile conversion ─────────────────────────────────────

function csvRowToTalentProfile(row: Record<string, string>): TalentProfile {
  // ── Name ──
  const firstName = findColumn(row, "firstName") || "Unknown";
  const lastName = findColumn(row, "lastName") || "";

  let parsedFirst = firstName;
  let parsedLast = lastName;
  if (!lastName && firstName.includes(" ")) {
    const parts = firstName.split(" ");
    parsedFirst = parts[0];
    parsedLast = parts.slice(1).join(" ");
  }

  // ── JSON-aware column parsing ──
  const skills = parseSkillsColumn(findColumn(row, "skills"));
  const experience = parseExperienceColumn(findColumn(row, "experience"));
  const education = parseEducationColumn(findColumn(row, "education"));
  const certifications = parseCertificationsColumn(findColumn(row, "certifications"));
  const projects = parseProjectsColumn(findColumn(row, "projects"));
  const availability = parseAvailabilityColumn(findColumn(row, "availability"));
  const socialLinks = parseSocialLinksColumn(
    findColumn(row, "socialLinks"),
    findColumn(row, "linkedin"),
    findColumn(row, "github")
  );

  // ── yearsExperience: prefer computed from experience array, then raw column ──
  const computedYears = computeTotalYearsExperience(experience);
  const rawYearsStr = findColumn(row, "yearsExperience") || "0";
  const rawYears = parseFloat(rawYearsStr.replace(/[^0-9.]/g, "")) || 0;
  const totalYears = computedYears > 0 ? computedYears : rawYears;

  // ── Fallback experience entry if column was missing but yearsExperience given ──
  const resolvedExperience =
    experience.length === 0 && totalYears > 0
      ? [
          {
            company: "Previous Employer",
            role: findColumn(row, "headline") || "Professional",
            startDate: `${new Date().getFullYear() - Math.ceil(totalYears)}-01`,
            endDate: "Present",
            description: findColumn(row, "bio") || "",
            technologies: skills.map((s) => s.name),
            isCurrent: true,
          },
        ]
      : experience;

  return {
    firstName: parsedFirst,
    lastName: parsedLast,
    email:
      findColumn(row, "email") ||
      `${parsedFirst.toLowerCase()}.${parsedLast.toLowerCase()}@unknown.com`,
    headline: findColumn(row, "headline") || "Professional",
    bio: findColumn(row, "bio"),
    location: findColumn(row, "location") || "Not specified",
    skills,
    experience: resolvedExperience,
    education,
    certifications,
    projects,
    availability,
    socialLinks,
  };
}

// ─── CSV Parsing ──────────────────────────────────────────────────────────────

export function parseCSVToProfiles(
  buffer: Buffer
): { profiles: TalentProfile[]; rawRows: Record<string, string>[] } {
  const csvString = buffer.toString("utf-8");

  const result = Papa.parse<Record<string, string>>(csvString, {
    header: true,
    skipEmptyLines: true,
  });

  const rawRows = (result.data || []) as Record<string, string>[];

  const profiles = rawRows
    .map(csvRowToTalentProfile)
    .filter((p) => p.firstName && p.firstName !== "Unknown");

  return { profiles, rawRows };
}

// ─── Excel Parsing ────────────────────────────────────────────────────────────

export function parseExcelToProfiles(
  buffer: Buffer
): { profiles: TalentProfile[]; rawRows: Record<string, string>[] } {
  const workbook = XLSX.read(buffer, { type: "buffer" });

  if (!workbook.SheetNames.length) {
    throw new Error("No sheets found in Excel file");
  }

  // Prefer a "Complete Data" sheet if present (contains full JSON columns),
  // otherwise fall back to processing every sheet.
  const completeDataSheet = workbook.SheetNames.find(
    (n) => n.toLowerCase().replace(/\s/g, "") === "completedata"
  );

  const sheetsToProcess = completeDataSheet
    ? [completeDataSheet]
    : workbook.SheetNames;

  const allProfiles: TalentProfile[] = [];
  const allRawRows: Record<string, string>[] = [];

  for (const sheetName of sheetsToProcess) {
    const sheet = workbook.Sheets[sheetName];

    // sheet_to_json with header:1 gives us raw rows as arrays
    const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
    });

    if (rawRows.length < 2) continue; // need at least header + one data row

    // Find the actual header row (skip title/meta rows that don't look like headers)
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(5, rawRows.length); i++) {
      const row = rawRows[i] as any[];
      // A header row has multiple non-empty string cells
      const nonEmptyStrings = row.filter(
        (v) => v !== null && v !== "" && typeof v === "string"
      ).length;
      if (nonEmptyStrings >= 3) {
        headerRowIndex = i;
        break;
      }
    }

    const headers = (rawRows[headerRowIndex] as any[]).map((h: any) =>
      String(h ?? "").toLowerCase().trim()
    );

    const dataRows = rawRows.slice(headerRowIndex + 1);

    const cleaned = dataRows
      .map((row: any[]) => {
        const obj: Record<string, string> = {};
        headers.forEach((h: string, i: number) => {
          const val = row[i];
          obj[h] = val !== null && val !== undefined ? String(val) : "";
        });
        return obj;
      })
      .filter((row) => Object.values(row).some((v) => v !== ""));

    allRawRows.push(...cleaned);

    const profiles = cleaned
      .map(csvRowToTalentProfile)
      .filter((p) => p.firstName && p.firstName !== "Unknown");

    allProfiles.push(...profiles);
  }

  return {
    profiles: allProfiles,
    rawRows: allRawRows,
  };
}