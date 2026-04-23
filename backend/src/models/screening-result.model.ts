import mongoose, { Document, Schema } from "mongoose";
import { ScoreBreakdown, CandidateInsight } from "../types";

export interface IScreeningResult extends Document {
  jobId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  rank: number;
  score: ScoreBreakdown;
  insight: CandidateInsight;
  processingTimeMs: number;
  screeningRunId: string; // Groups results from the same screening run
  createdAt: Date;
}

const scoreBreakdownSchema = new Schema({
  skillScore: Number,
  experienceScore: Number,
  projectScore: Number,
  educationScore: Number,
  certificationScore: Number,
  totalScore: Number,
}, { _id: false });

const insightSchema = new Schema({
  strengths: [String],
  gaps: [String],
  recommendation: String,
  confidence: Number,
  biasNote: String,
  fitForRole: {
    type: String,
    enum: ["Strong Fit", "Good Fit", "Partial Fit", "Poor Fit"],
  },
  alternativeRoleSuggestion: String,
}, { _id: false });

const screeningResultSchema = new Schema<IScreeningResult>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    candidateId: { type: Schema.Types.ObjectId, ref: "Candidate", required: true },
    rank: { type: Number, required: true },
    score: { type: scoreBreakdownSchema, required: true },
    insight: { type: insightSchema, required: true },
    processingTimeMs: { type: Number, default: 0 },
    screeningRunId: { type: String, required: true },
  },
  { timestamps: true }
);

screeningResultSchema.index({ jobId: 1, screeningRunId: 1 });
screeningResultSchema.index({ jobId: 1, rank: 1 });

export const ScreeningResult = mongoose.model<IScreeningResult>(
  "ScreeningResult",
  screeningResultSchema
);
