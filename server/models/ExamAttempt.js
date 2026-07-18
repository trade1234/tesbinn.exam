import mongoose from "mongoose";

const examAttemptSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    startedAt: { type: Date, default: Date.now },
    submittedAt: Date,
    score: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    status: { type: String, enum: ["IN_PROGRESS", "PASS", "FAIL", "DISQUALIFIED", "RETAKE_GRANTED"], default: "IN_PROGRESS" },
    violationCount: { type: Number, default: 0, min: 0 },
    terminationReason: { type: String, default: "" },
    wasDisqualified: { type: Boolean, default: false, index: true },
    disqualificationCount: { type: Number, default: 0, min: 0 },
    lastDisqualifiedAt: Date,
    lastDisqualificationReason: { type: String, default: "" },
    retakeGrantedAt: Date,
    retakeExpiresAt: Date,
    retakeGrantedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

examAttemptSchema.index({ studentId: 1, examId: 1 }, { unique: true });

export const ExamAttempt = mongoose.model("ExamAttempt", examAttemptSchema);

