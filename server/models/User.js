import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    enrollmentNumber: { type: String, trim: true, sparse: true, unique: true },
    batchYear: { type: Number, trim: true },
    trainingTaken: { type: String, trim: true, default: "" },
    password: { type: String, required: true, minlength: 6, select: false },
    generatedPassword: { type: String, select: false },
    role: { type: String, enum: ["ADMIN", "STUDENT"], default: "STUDENT" },
    isActive: { type: Boolean, default: true },
    currentSessionId: { type: String, default: "" },
    lastActive: { type: Date },
    resetPasswordToken: String,
    resetPasswordExpires: Date
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.password);
};

export const User = mongoose.model("User", userSchema);
