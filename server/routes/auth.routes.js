import { Router } from "express";
import { z } from "zod";
import { forgotPassword, login, loginSchema, me, register, registerSchema, resetPassword } from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/forgot-password", validate(z.object({ body: z.object({ email: z.string().email() }) })), forgotPassword);
router.post("/reset-password", validate(z.object({ body: z.object({ token: z.string().min(1), password: z.string().min(6) }) })), resetPassword);
router.get("/me", protect, me);

export default router;

