import crypto from "crypto";
import { z } from "zod";
import { User } from "../models/User.js";
import { signToken } from "../utils/tokens.js";
import { logActivity } from "../utils/logger.js";
import jwt from "jsonwebtoken";
import { LoginSession } from "../models/LoginSession.js";
import { setAuthCookie } from "../utils/authCookies.js";

async function createLoginSession(req, res, user) {
  const sessionId = crypto.randomUUID();
  user.currentSessionId = sessionId;
  user.lastActive = new Date();
  await user.save();
  if (user.role === "STUDENT") await LoginSession.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });
  const token = signToken(user);
  const expiresAt = new Date(jwt.decode(token).exp * 1000);
  await LoginSession.create({ userId: user._id, sessionId, userAgent: String(req.headers["user-agent"] || "").slice(0, 512), ipAddress: req.ip || "", expiresAt });
  setAuthCookie(res, token, expiresAt);
}

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    enrollmentNumber: z.string().optional(),
    password: z.string().length(5).regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]+$/)
  })
});

export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().trim().min(1).max(254),
    password: z.string().min(1).max(256),
    code: z.string().trim().max(64).optional()
  })
});

export async function register(req, res, next) {
  try {
    const existing = await User.findOne({ email: req.body.email });
    if (existing) return res.status(409).json({ message: "Email already exists" });

    const sessionId = crypto.randomUUID();
    const user = await User.create({
      ...req.body,
      role: "STUDENT",
      currentSessionId: sessionId,
      lastActive: new Date()
    });
    req.user = user;
    await logActivity(req, "REGISTER", "Registered a new account");
    await createLoginSession(req, res, user);
    res.status(201).json({ user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const identifier = req.body.identifier.trim();
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { enrollmentNumber: identifier }
      ]
    }).select("+password +loginFailures +loginLockedUntil");
    if (user?.loginLockedUntil > new Date()) return res.status(401).json({ message: "Invalid credentials or sign-in temporarily unavailable. Try again later." });
    if (!user || !(await user.comparePassword(req.body.password))) {
      if (user) {
        if (user.loginLockedUntil) await User.updateOne({ _id: user._id, loginLockedUntil: { $lte: new Date() } }, { loginFailures: 0, loginLockedUntil: null });
        const failed = await User.findOneAndUpdate({ _id: user._id }, { $inc: { loginFailures: 1 } }, { new: true }).select("+loginFailures");
        if (failed.loginFailures >= 10) await User.updateOne({ _id: user._id }, { loginLockedUntil: new Date(Date.now() + 15 * 60000) });
      }
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (!user.isActive) return res.status(403).json({ message: "Account is inactive" });

    user.loginFailures = 0;
    user.loginLockedUntil = undefined;
    await createLoginSession(req, res, user);

    req.user = user;
    await logActivity(req, "LOGIN", `Logged in successfully via ${user.role === "STUDENT" ? "student" : user.role === "ADMIN" ? "admin" : "customer service"} portal`);

    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res) {
  res.status(503).json({ message: "Password recovery is unavailable. Contact an administrator to reset your password." });
}

export async function resetPassword(req, res) {
  res.status(503).json({ message: "Password recovery is unavailable. Contact an administrator to reset your password." });
}

export function me(req, res) {
  res.json({ user: sanitizeUser(req.user) });
}

function sanitizeUser(user) {
  const data = user.toObject();
  delete data.password;
  delete data.resetPasswordToken;
  delete data.resetPasswordExpires;
  delete data.currentSessionId;
  delete data.passwordChangedAt;
  delete data.loginFailures;
  delete data.loginLockedUntil;
  delete data.generatedPassword;
  for (const field of ["mfaEnabled", "mfaSetupRequired", "mfaSecret", "mfaPendingSecret", "mfaPendingExpires", "mfaLastStep", "mfaRecoveryHashes"]) delete data[field];
  return data;
}

