import { Router } from "express";
import { z } from "zod";
import { changePassword, createStudent, deleteStudent, listStudents, setStudentActive, studentDashboard, listOnlineStudents, listActivityLogs, updateStudent } from "../controllers/user.controller.js";
import { authorize, protect } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";

const router = Router();

const createStudentSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Full name is required"),
    batchYear: z.number().int().min(2000).max(2099),
    trainingTaken: z.string().min(1, "Training is required")
  })
});

const updateStudentSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Full name is required"),
    batchYear: z.number().int().min(2000).max(2099),
    trainingTaken: z.string().min(1, "Training is required"),
    isActive: z.boolean().optional(),
    generatePassword: z.boolean().optional()
  })
});
router.get("/students", protect, authorize("ADMIN"), listStudents);
router.post("/students", protect, authorize("ADMIN"), validate(createStudentSchema), createStudent);
router.put("/students/:id", protect, authorize("ADMIN"), validate(updateStudentSchema), updateStudent);
router.delete("/students/:id", protect, authorize("ADMIN"), deleteStudent);
router.patch("/students/:id/active", protect, authorize("ADMIN"), validate(z.object({ body: z.object({ isActive: z.boolean() }) })), setStudentActive);
router.get("/online", protect, authorize("ADMIN"), listOnlineStudents);
router.get("/activity-logs", protect, authorize("ADMIN"), listActivityLogs);
router.get("/dashboard/student", protect, authorize("STUDENT"), studentDashboard);
router.patch("/change-password", protect, validate(z.object({ body: z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(6) }) })), changePassword);

export default router;
