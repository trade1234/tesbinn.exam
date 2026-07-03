import { ActivityLog } from "../models/ActivityLog.js";

export async function logActivity(reqOrUserId, action, details = "") {
  try {
    let userId;
    let ipAddress = "";
    let userAgent = "";

    if (reqOrUserId && reqOrUserId.user) {
      // It is a Request object
      userId = reqOrUserId.user._id;
      ipAddress = reqOrUserId.ip || reqOrUserId.headers["x-forwarded-for"] || reqOrUserId.socket.remoteAddress || "";
      userAgent = reqOrUserId.headers["user-agent"] || "";
    } else {
      // It is a direct User ID or object
      userId = reqOrUserId?._id || reqOrUserId;
    }

    if (!userId) return;

    await ActivityLog.create({
      userId,
      action,
      details,
      ipAddress,
      userAgent
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}
