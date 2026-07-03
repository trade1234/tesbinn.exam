import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    questionType: { type: String, enum: ["MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER"], default: "MULTIPLE_CHOICE" },
    questionText: { type: String, required: true },
    optionA: { type: String, default: "" },
    optionB: { type: String, default: "" },
    optionC: { type: String, default: "" },
    optionD: { type: String, default: "" },
    correctAnswer: { type: String, required: true, trim: true },
    marks: { type: Number, default: 1, min: 0.1 },
    order: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

questionSchema.index({ examId: 1, order: 1, createdAt: 1 });

questionSchema.pre("validate", function validateQuestion(next) {
  if (this.questionType === "MULTIPLE_CHOICE") {
    if (!["A", "B", "C", "D"].includes(this.correctAnswer)) {
      this.invalidate("correctAnswer", "Multiple choice answer must be A, B, C, or D");
    }
    ["optionA", "optionB", "optionC", "optionD"].forEach((field) => {
      if (!this[field]) this.invalidate(field, "Multiple choice options are required");
    });
  }
  if (this.questionType === "TRUE_FALSE" && !["TRUE", "FALSE"].includes(this.correctAnswer)) {
    this.invalidate("correctAnswer", "True/false answer must be TRUE or FALSE");
  }
  next();
});

export const Question = mongoose.model("Question", questionSchema);



