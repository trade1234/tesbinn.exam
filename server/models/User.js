import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    enrollmentNumber: { type: String, trim: true, sparse: true, unique: true },
    batchYear: { type: Number, trim: true },
    trainingTaken: { type: String, trim: true, default: "" },
    password: { type: String, required: true, minlength: 5, select: false },
    generatedPassword: { type: String, select: false },
    role: { type: String, enum: ["ADMIN", "CUSTOMER_SERVICE", "STUDENT"], default: "STUDENT" },
    isActive: { type: Boolean, default: true },
    currentSessionId: { type: String, default: "" },
    lastActive: { type: Date },
    passwordChangedAt: { type: Date, select: false },
    loginFailures: { type: Number, default: 0, select: false },
    loginLockedUntil: { type: Date, select: false },
    // Legacy enrollment data is hidden and ignored after MFA removal.
    mfaEnabled: { type: Boolean, select: false },
    mfaSecret: { type: String, select: false },
    mfaPendingSecret: { type: String, select: false },
    mfaPendingExpires: { type: Date, select: false },
    mfaLastStep: { type: Number, default: -1, select: false },
    mfaRecoveryHashes: { type: [String], select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false }
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.passwordChangedAt = new Date();
  this.currentSessionId = "";
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.password);
};

export const User = mongoose.model("User", userSchema);
