import { Router } from "express";
import { z } from "zod";
import { forgotPassword, login, loginSchema, me, register, registerSchema, resetPassword } from "../controllers/auth.controller.js";
import { protect, authorize } from "../middlewares/auth.js";
import { sharedRateLimit } from "../middlewares/sharedRateLimit.js";
import { requireBrowserRequest } from "../utils/authCookies.js";
import { listSessions, revokeSession, logout } from "../controllers/session.controller.js";
import { validate } from "../middlewares/validate.js";

const router = Router();
router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.use(requireBrowserRequest);
const loginLimiter = sharedRateLimit("login", 30);
const recoveryLimiter = sharedRateLimit("recovery", 10);

router.use(["/register", "/forgot-password", "/reset-password"], recoveryLimiter);
router.post("/register", validate(registerSchema), register);
router.post("/login", loginLimiter, validate(loginSchema), login);
router.post("/logout", protect, logout);
router.get("/sessions", protect, authorize("ADMIN"), validate(z.object({ query: z.object({ page: z.coerce.number().int().min(1).max(10000).default(1), status: z.enum(["active", "all"]).default("active") }) })), listSessions);
router.delete("/sessions/:id", protect, authorize("ADMIN"), validate(z.object({ params: z.object({ id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid session") }) })), revokeSession);
router.post("/forgot-password", validate(z.object({ body: z.object({ email: z.string().email() }) })), forgotPassword);
router.post("/reset-password", validate(z.object({ body: z.object({ token: z.string().min(1), password: z.string().length(5).regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]+$/) }) })), resetPassword);
router.get("/me", protect, me);

export default router;

