import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

/**
 * Middleware for authenticating third-party system requests via API key or Admin JWT.
 * External systems can send:
 * - Header: `x-api-key: <API_KEY>`
 * - Header: `Authorization: Bearer <API_KEY>`
 * - Query param: `?api_key=<API_KEY>` or `?apiKey=<API_KEY>`
 * - Admin JWT: `Authorization: Bearer <JWT_TOKEN>`
 */
export async function authenticateThirdParty(req, res, next) {
  try {
    const apiKeyFromHeader = req.headers["x-api-key"];
    const apiKeyFromQuery = req.query.api_key || req.query.apiKey;
    const authHeader = req.headers.authorization || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

    const expectedApiKey = env.thirdPartyApiKey;

    // 1. Direct API key validation
    if (apiKeyFromHeader === expectedApiKey || apiKeyFromQuery === expectedApiKey || bearerToken === expectedApiKey) {
      req.authMethod = "API_KEY";
      return next();
    }

    // 2. Admin JWT validation alternative
    if (bearerToken) {
      try {
        const payload = jwt.verify(bearerToken, env.jwtSecret);
        const user = await User.findById(payload.id).select("-password");
        if (user && user.isActive && user.role === "ADMIN") {
          req.user = user;
          req.authMethod = "ADMIN_JWT";
          return next();
        }
      } catch {
        // Fall through to 401 response below
      }
    }

    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or missing API Key / Authorization token.",
      hint: "Provide 'x-api-key' header, 'api_key' query param, or Bearer token."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Authentication processing failed",
      error: error.message
    });
  }
}
