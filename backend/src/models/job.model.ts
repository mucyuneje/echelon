import mongoose, { Document, Schema } from "mongoose";
import { StructuredJobRequirements } from "../types";

export interface IJob extends Document {
  title: string;
  company: string;
  description: string;
  location: string;
  jobType: "Full-time" | "Part-time" | "Contract" | "Remote";
  structuredRequirements: StructuredJobRequirements | null;
  createdBy: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const jobWeightsSchema = new Schema({
  skills: { type: Number, default: 0.4 },
  experience: { type: Number, default: 0.3 },
  projects: { type: Number, default: 0.2 },
  education: { type: Number, default: 0.05 },
  certifications: { type: Number, default: 0.05 },
}, { _id: false });

const structuredRequirementsSchema = new Schema({
  requiredSkills: [String],
  optionalSkills: [String],
  minExperienceYears: Number,
  educationLevel: String,
  roleType: String,
  keyResponsibilities: [String],
  weights: jobWeightsSchema,
}, { _id: false });

const jobSchema = new Schema<IJob>(
  {
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    jobType: {
      type: String,
      enum: ["Full-time", "Part-time", "Contract", "Remote"],
      default: "Full-time",
    },
    structuredRequirements: { type: structuredRequirementsSchema, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Job = mongoose.model<IJob>("Job", jobSchema);
