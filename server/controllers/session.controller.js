import { LoginSession } from "../models/LoginSession.js";
import { logActivity } from "../utils/logger.js";
import { clearAuthCookie } from "../utils/authCookies.js";

export async function listSessions(req, res, next) {
  try {
    const page = Math.max(1, Math.min(Number(req.query.page) || 1, 10000));
    const query = {};
    if (req.query.status !== "all") Object.assign(query, { revokedAt: null, expiresAt: { $gt: new Date() } });
    const [items, total] = await Promise.all([
      LoginSession.find(query).populate("userId", "name email enrollmentNumber role isActive").sort({ createdAt: -1 }).skip((page - 1) * 50).limit(50),
      LoginSession.countDocuments(query)
    ]);
    res.json({ items: items.map((session) => ({ ...session.toObject(), isCurrent: String(session._id) === String(req.loginSession._id) })), total, page, pages: Math.max(1, Math.ceil(total / 50)) });
  } catch (error) { next(error); }
}

export async function revokeSession(req, res, next) {
  try {
    const session = await LoginSession.findOneAndUpdate({ _id: req.params.id, revokedAt: null }, { revokedAt: new Date() }, { new: true }).populate("userId", "name email");
    if (!session) return res.status(404).json({ message: "Session not found or already signed out" });
    await logActivity(req, "REVOKE_SESSION", `Signed out a device for ${session.userId?.name || "deleted user"} (${session.userId?.email || ""})`);
    const isCurrent = String(session._id) === String(req.loginSession._id);
    if (isCurrent) clearAuthCookie(res);
    res.json({ message: "Device signed out", isCurrent });
  } catch (error) { next(error); }
}

export async function logout(req, res, next) {
  try {
    await LoginSession.updateOne({ _id: req.loginSession._id }, { revokedAt: new Date() });
    clearAuthCookie(res);
    await logActivity(req, "LOGOUT", "Signed out of this device");
    res.json({ message: "Signed out" });
  } catch (error) { next(error); }
}
