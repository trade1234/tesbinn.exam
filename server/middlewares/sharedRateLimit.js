import crypto from "node:crypto";
import mongoose from "mongoose";
import { env } from "../config/env.js";
const schema = new mongoose.Schema({ _id: String, count: Number, expiresAt: Date }, { versionKey: false });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const RateBucket = mongoose.model("RateBucket", schema);
export function sharedRateLimit(scope, max, windowMs = 15 * 60000) {
  return async (req, res, next) => {
    try {
      const now = Date.now();
      const window = Math.floor(now / windowMs);
      const ip = crypto.createHmac("sha256", env.jwtSecret).update(req.ip || "unknown").digest("hex");
      const id = `${scope}:${ip}:${window}`;
      const expiresAt = new Date((window + 1) * windowMs);
      let bucket;
      try { bucket = await RateBucket.findOneAndUpdate({ _id: id }, { $inc: { count: 1 }, $setOnInsert: { expiresAt } }, { upsert: true, new: true }); }
      catch (error) {
        if (error.code !== 11000) throw error;
        bucket = await RateBucket.findOneAndUpdate({ _id: id }, { $inc: { count: 1 } }, { new: true });
      }
      if (bucket.count > max) {
        res.set("Retry-After", String(Math.ceil((expiresAt.getTime() - now) / 1000)));
        return res.status(429).json({ message: "Too many requests. Please try again later." });
      }
      next();
    } catch (error) {
      res.status(503).json({ message: "Request protection is temporarily unavailable. Please try again later." });
    }
  };
}
