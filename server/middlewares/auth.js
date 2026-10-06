import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { LoginSession } from "../models/LoginSession.js";
import { auditStaffActions } from "../utils/logger.js";
import { cookieToken, requireBrowserRequest } from "../utils/authCookies.js";

export async function protect(req, res, next) {
  try {
    const token = cookieToken(req);

    if (!token) return res.status(401).json({ message: "Authentication required" });

    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] });
    if (!payload.sessionId) return res.status(401).json({ message: "Session invalidated: Please sign in again." });
    const user = await User.findById(payload.id).select("-password -resetPasswordToken -resetPasswordExpires +passwordChangedAt");
    if (!user || !user.isActive) return res.status(401).json({ message: "Invalid account" });

    const session = await LoginSession.findOne({ sessionId: payload.sessionId, userId: user._id, revokedAt: null, expiresAt: { $gt: new Date() } });
    if (!session || (user.passwordChangedAt && session.createdAt < user.passwordChangedAt)) return res.status(401).json({ message: "Session invalidated: Please sign in again." });
    if (user.role === "STUDENT" && user.currentSessionId !== payload.sessionId) {
      return res.status(401).json({ message: "Session invalidated: You logged in from another device or browser." });
    }
    if (Date.now() - new Date(session.lastActive).getTime() > 30000) await LoginSession.updateOne({ _id: session._id, revokedAt: null }, { lastActive: new Date() });
    req.loginSession = session;
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.headers["x-exam-request"] !== "1") return requireBrowserRequest(req, res, next);

    // Update lastActive timestamp with a throttle of 30 seconds
    if (user.role === "STUDENT") {
      const now = new Date();
      if (!user.lastActive || (now - new Date(user.lastActive)) > 30000) {
        user.lastActive = now;
        await User.findByIdAndUpdate(user._id, { lastActive: now });
      }
    }

    req.user = user;
    auditStaffActions(req, res);
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}

