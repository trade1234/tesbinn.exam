import { z } from "zod";
import { User } from "../models/User.js";
import { logActivity } from "../utils/logger.js";

export const STAFF_ROLES = ["ADMIN", "CUSTOMER_SERVICE"];

const password = z.string().min(5, "Password must be at least 5 characters").regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, "Password must contain letters and numbers");

export const createAccountSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Full name is required"),
    email: z.string().trim().email("A valid email is required"),
    password,
    role: z.enum(STAFF_ROLES)
  })
});

export const updateAccountSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).optional(),
    role: z.enum(STAFF_ROLES).optional(),
    isActive: z.boolean().optional(),
    password: password.optional()
  })
});

function toAccount(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    lastActive: user.lastActive,
    createdAt: user.createdAt
  };
}

// Guard against locking everyone out of account management.
async function wouldRemoveLastAdmin(user, nextRole, nextActive) {
  if (user.role !== "ADMIN" || !user.isActive) return false;
  if (nextRole === "ADMIN" && nextActive) return false;
  const otherAdmins = await User.countDocuments({ role: "ADMIN", isActive: true, _id: { $ne: user._id } });
  return otherAdmins === 0;
}

export async function listAccounts(req, res, next) {
  try {
    const query = { role: { $in: STAFF_ROLES } };
    if (STAFF_ROLES.includes(req.query.role)) query.role = req.query.role;
    const users = await User.find(query).sort({ role: 1, name: 1 });
    res.json(users.map(toAccount));
  } catch (error) {
    next(error);
  }
}

export async function createAccount(req, res, next) {
  try {
    const email = req.body.email.toLowerCase();
    if (await User.exists({ email })) return res.status(409).json({ message: "An account with this email already exists" });

    const user = await User.create({ name: req.body.name, email, password: req.body.password, role: req.body.role });
    await logActivity(req, "CREATE_ACCOUNT", `Created ${user.role} account for ${user.email}`);
    res.status(201).json(toAccount(user));
  } catch (error) {
    next(error);
  }
}

export async function updateAccount(req, res, next) {
  try {
    const user = await User.findOne({ _id: req.params.id, role: { $in: STAFF_ROLES } });
    if (!user) return res.status(404).json({ message: "Account not found" });

    const isSelf = String(user._id) === String(req.user._id);
    const nextRole = req.body.role ?? user.role;
    const nextActive = req.body.isActive ?? user.isActive;
    if (isSelf && (nextRole !== user.role || !nextActive)) {
      return res.status(400).json({ message: "You cannot change your own role or deactivate your own account" });
    }
    if (await wouldRemoveLastAdmin(user, nextRole, nextActive)) {
      return res.status(400).json({ message: "At least one active admin account is required" });
    }

    if (req.body.name) user.name = req.body.name;
    user.role = nextRole;
    user.isActive = nextActive;
    if (req.body.password) user.password = req.body.password;
    await user.save();

    await logActivity(req, "UPDATE_ACCOUNT", `Updated account ${user.email} (role: ${user.role}, active: ${user.isActive}${req.body.password ? ", password reset" : ""})`);
    res.json(toAccount(user));
  } catch (error) {
    next(error);
  }
}

export async function deleteAccount(req, res, next) {
  try {
    const user = await User.findOne({ _id: req.params.id, role: { $in: STAFF_ROLES } });
    if (!user) return res.status(404).json({ message: "Account not found" });
    if (String(user._id) === String(req.user._id)) return res.status(400).json({ message: "You cannot delete your own account" });
    if (await wouldRemoveLastAdmin(user, null, false)) return res.status(400).json({ message: "At least one active admin account is required" });

    await user.deleteOne();
    await logActivity(req, "DELETE_ACCOUNT", `Deleted ${user.role} account ${user.email}`);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}
