import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role, sessionId: user.currentSessionId || "" }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn
  });
}

