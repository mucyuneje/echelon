import mongoose, { Document, Schema } from "mongoose";
import { TalentProfile } from "../types";

export interface ICandidate extends Document {
  source: "umurava_profile" | "external_cv" | "external_csv";
  rawResumeText?: string;
  rawCsvRow?: Record<string, string>;
  profile: TalentProfile;
  features: {
    totalYearsExperience: number;
    uniqueSkills: string[];
    projectCount: number;
    hasRelevantCertifications: boolean;
    seniorityLevel: "Junior" | "Mid" | "Senior" | "Lead" | "Unknown";
  };
  originalFileName?: string;
  jobId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const skillSchema = new Schema({
  name: String,
  level: { type: String, enum: ["Beginner", "Intermediate", "Advanced", "Expert"] },
  yearsOfExperience: Number,
}, { _id: false });

const experienceSchema = new Schema({
  company: String, role: String, startDate: String, endDate: String,
  description: String, technologies: [String], isCurrent: Boolean,
}, { _id: false });

const educationSchema = new Schema({
  institution: String, degree: String, fieldOfStudy: String,
  startYear: Number, endYear: Number,
}, { _id: false });

const certificationSchema = new Schema({
  name: String, issuer: String, issueDate: String,
}, { _id: false });

const projectSchema = new Schema({
  name: String, description: String, technologies: [String],
  role: String, link: String, startDate: String, endDate: String,
}, { _id: false });

const candidateSchema = new Schema<ICandidate>(
  {
    // FIX #2: added "external_docx" to valid source enum values
    source: {
      type: String,
      enum: ["umurava_profile", "external_cv", "external_csv", "external_docx"],
      required: true
    },
    rawResumeText: String,
    rawCsvRow: Schema.Types.Mixed,
    profile: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      email: { type: String, required: true },
      headline: String, bio: String, location: String,
      skills: [skillSchema], languages: Schema.Types.Mixed,
      experience: [experienceSchema], education: [educationSchema],
      certifications: [certificationSchema], projects: [projectSchema],
      availability: Schema.Types.Mixed, socialLinks: Schema.Types.Mixed,
    },
    features: {
      totalYearsExperience: { type: Number, default: 0 },
      uniqueSkills: [String],
      projectCount: { type: Number, default: 0 },
      hasRelevantCertifications: { type: Boolean, default: false },
      seniorityLevel: { type: String, enum: ["Junior", "Mid", "Senior", "Lead", "Unknown"], default: "Unknown" },
    },
    originalFileName: String,
    jobId: { type: Schema.Types.ObjectId, ref: "Job" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

candidateSchema.index({ "profile.email": 1, jobId: 1 });
candidateSchema.index({ createdBy: 1 });

export const Candidate = mongoose.model<ICandidate>("Candidate", candidateSchema);
