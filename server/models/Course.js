import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    courseName: { type: String, required: true, trim: true },
    courseCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: "" }
  },
  { timestamps: true }
);

export const Course = mongoose.model("Course", courseSchema);

