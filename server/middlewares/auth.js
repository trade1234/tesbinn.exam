import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) return res.status(401).json({ message: "Authentication required" });

    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.id).select("-password");
    if (!user || !user.isActive) return res.status(401).json({ message: "Invalid account" });

    // Enforce single login session for students
    if (user.role === "STUDENT" && payload.sessionId && user.currentSessionId !== payload.sessionId) {
      return res.status(401).json({ message: "Session invalidated: You logged in from another device or browser." });
    }

    // Update lastActive timestamp with a throttle of 30 seconds
    if (user.role === "STUDENT") {
      const now = new Date();
      if (!user.lastActive || (now - new Date(user.lastActive)) > 30000) {
        user.lastActive = now;
        await User.findByIdAndUpdate(user._id, { lastActive: now });
      }
    }

    req.user = user;
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

