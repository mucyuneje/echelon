import pdfParse from "pdf-parse";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { TalentProfile } from "../types";

// ─── PDF Validation ───────────────────────────────────────────────────────────
// Checks the PDF header magic bytes before handing the buffer to pdf-parse.
// pdf-parse will throw an opaque "bad XRef entry" error on corrupted files;
// this guard converts that into a clean 400-level AppError message.

function assertValidPdfBytes(buffer: Buffer): void {
  // Every valid PDF starts with "%PDF-"
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
  // Validate before parsing — converts corrupted-file crashes into clear errors
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
    // Re-wrap pdf-parse errors (e.g. "bad XRef entry") with a user-friendly message
    if (error.message?.includes("XRef") || error.message?.includes("xref")) {
      throw new Error(
        "The PDF file is corrupted or uses an unsupported format. " +
          "Please try re-saving the PDF and uploading again."
      );
    }
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
}

// ─── CSV/Excel to TalentProfile Array ─────────────────────────────────────────

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
};

function findColumn(row: Record<string, string>, fieldKey: string): string | undefined {
  const aliases = COLUMN_ALIASES[fieldKey] || [fieldKey];
  const rowKeysLower = Object.keys(row).map((k) => k.toLowerCase().trim());

  for (const alias of aliases) {
    const idx = rowKeysLower.findIndex((k) => k === alias || k.includes(alias));
    if (idx !== -1) {
      return Object.values(row)[idx];
    }
  }
  return undefined;
}

function csvRowToTalentProfile(row: Record<string, string>): TalentProfile {
  const firstName = findColumn(row, "firstName") || "Unknown";
  const lastName = findColumn(row, "lastName") || "";

  let parsedFirst = firstName;
  let parsedLast = lastName;
  if (!lastName && firstName.includes(" ")) {
    const parts = firstName.split(" ");
    parsedFirst = parts[0];
    parsedLast = parts.slice(1).join(" ");
  }

  const rawSkills = findColumn(row, "skills") || "";
  const skillNames = rawSkills
    .split(/[,|;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const skills = skillNames.map((name) => ({
    name,
    level: "Intermediate" as const,
    yearsOfExperience: 0,
  }));

  const yearsExpStr = findColumn(row, "yearsExperience") || "0";
  const yearsExp = parseFloat(yearsExpStr.replace(/[^0-9.]/g, "")) || 0;

  const experience =
    yearsExp > 0
      ? [
          {
            company: "Previous Employer",
            role: findColumn(row, "headline") || "Professional",
            startDate: `${new Date().getFullYear() - Math.ceil(yearsExp)}-01`,
            endDate: "Present",
            description: findColumn(row, "bio") || "",
            technologies: skillNames,
            isCurrent: true,
          },
        ]
      : [];

  const rawEdu = findColumn(row, "education") || "";
  const education = rawEdu
    ? [
        {
          institution: rawEdu,
          degree: "Bachelor's",
          fieldOfStudy: "Not specified",
          startYear: 2015,
          endYear: 2019,
        },
      ]
    : [];

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
    experience,
    education,
    certifications: [],
    projects: [],
    availability: {
      status: "Open to Opportunities",
      type: "Full-time",
    },
    socialLinks: {
      linkedin: findColumn(row, "linkedin"),
      github: findColumn(row, "github"),
    },
  };
}

export function parseCSVToProfiles(
  buffer: Buffer
): { profiles: TalentProfile[]; rawRows: Record<string, string>[] } {
  const csvString = buffer.toString("utf-8");

  let rawRows: Record<string, string>[] = [];
  let parseErrors: any[] = [];

  Papa.parse<Record<string, string>>(csvString, {
    header: true,
    skipEmptyLines: true,
    complete(results) {
      rawRows = results.data;
      parseErrors = results.errors;
    },
  });

  if (parseErrors.length > 0) {
    console.warn("CSV parse warnings:", parseErrors.slice(0, 3));
  }
  const profiles = rawRows.map(csvRowToTalentProfile);

  return { profiles, rawRows };
}

export function parseExcelToProfiles(
  buffer: Buffer
): { profiles: TalentProfile[]; rawRows: Record<string, string>[] } {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, string>>(firstSheet, {
    raw: false,
    defval: "",
  });

  const profiles = rawRows.map(csvRowToTalentProfile);
  return { profiles, rawRows };
}
