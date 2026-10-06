import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    courseName: { type: String, required: true, trim: true },
    courseCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: "" },
    certificatesVisible: { type: Boolean, default: true },
    certificatesActive: { type: Boolean, default: true },
    certificateDeactivationReason: { type: String, default: "", trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const Course = mongoose.model("Course", courseSchema);

