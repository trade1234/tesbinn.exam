import mongoose from "mongoose";

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  sessionId: { type: String, required: true, unique: true, select: false },
  userAgent: { type: String, default: "" },
  ipAddress: { type: String, default: "" },
  lastActive: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  revokedAt: Date
}, { timestamps: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
export const LoginSession = mongoose.model("LoginSession", schema);
