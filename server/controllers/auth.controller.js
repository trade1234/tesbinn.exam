import crypto from "crypto";
import { z } from "zod";
import { User } from "../models/User.js";
import { signToken } from "../utils/tokens.js";
import { logActivity } from "../utils/logger.js";

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    enrollmentNumber: z.string().optional(),
    password: z.string().min(6),
    role: z.enum(["ADMIN", "STUDENT"]).default("STUDENT")
  })
});

export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(1),
    password: z.string().min(1)
  })
});

export async function register(req, res, next) {
  try {
    const existing = await User.findOne({ email: req.body.email });
    if (existing) return res.status(409).json({ message: "Email already exists" });

    const sessionId = crypto.randomUUID();
    const user = await User.create({
      ...req.body,
      currentSessionId: sessionId,
      lastActive: new Date()
    });
    await logActivity(user._id, "REGISTER", "Registered a new account");
    res.status(201).json({ token: signToken(user), user: sanitizeUser(user) });
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
    }).select("+password");
    if (!user || !(await user.comparePassword(req.body.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (!user.isActive) return res.status(403).json({ message: "Account is inactive" });

    const sessionId = crypto.randomUUID();
    user.currentSessionId = sessionId;
    user.lastActive = new Date();
    await user.save();

    await logActivity(user._id, "LOGIN", `Logged in successfully via ${user.role.toLowerCase() === "admin" ? "admin" : "student"} portal`);

    res.json({ token: signToken(user), user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.json({ message: "If the email exists, a reset token was generated" });

    const rawToken = crypto.randomBytes(24).toString("hex");
    user.resetPasswordToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 30);
    await user.save();

    res.json({ message: "Reset token generated", resetToken: rawToken });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const hashed = crypto.createHash("sha256").update(req.body.token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: new Date() }
    });
    if (!user) return res.status(400).json({ message: "Invalid or expired reset token" });

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ message: "Password reset successful" });
  } catch (error) {
    next(error);
  }
}

export function me(req, res) {
  res.json({ user: req.user });
}

function sanitizeUser(user) {
  const data = user.toObject();
  delete data.password;
  delete data.resetPasswordToken;
  delete data.resetPasswordExpires;
  return data;
}

