import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    attemptId: { type: mongoose.Schema.Types.ObjectId, ref: "ExamAttempt", required: true },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
    selectedAnswer: { type: String, default: "" },
    markedForReview: { type: Boolean, default: false }
  },
  { timestamps: true }
);

answerSchema.index({ attemptId: 1, questionId: 1 }, { unique: true });

export const Answer = mongoose.model("Answer", answerSchema);


