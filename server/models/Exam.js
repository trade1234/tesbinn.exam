import mongoose from "mongoose";

const examSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    durationMinutes: { type: Number, required: true, min: 1 },
    extraTimeMinutes: { type: Number, default: 0, min: 0 },
    totalMarks: { type: Number, required: true, min: 1 },
    passPercentage: { type: Number, required: true, min: 0, max: 100 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isPaused: { type: Boolean, default: false },
    pausedAt: Date
  },
  { timestamps: true }
);

export const Exam = mongoose.model("Exam", examSchema);

