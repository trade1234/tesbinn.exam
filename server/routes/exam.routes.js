import { Router } from "express";
import { z } from "zod";
import { authorize, protect } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { scheduleExam, scheduleExamSchema, createExam, deleteExam, examSchema, grantRetake, listExams, pauseExam, recordViolation, resumeExam, saveAnswers, startExam, submitExam, updateExam } from "../controllers/exam.controller.js";

const router = Router();

router.get("/", protect, authorize("ADMIN", "CUSTOMER_SERVICE", "STUDENT"), listExams);
router.post("/", protect, authorize("ADMIN", "CUSTOMER_SERVICE"), validate(examSchema), createExam);
router.post("/start", protect, authorize("STUDENT"), validate(z.object({ body: z.object({ examId: z.string().min(1) }) })), startExam);
router.put("/attempts/:attemptId/answers", protect, authorize("STUDENT"), validate(z.object({
  body: z.object({
    answers: z.array(z.object({
      questionId: z.string().min(1),
      selectedAnswer: z.string().optional().default(""),
      markedForReview: z.boolean().optional()
    }))
  })
})), saveAnswers);
router.post("/submit", protect, authorize("STUDENT"), validate(z.object({ body: z.object({ attemptId: z.string().min(1) }) })), submitExam);
router.post("/attempts/:attemptId/violation", protect, authorize("STUDENT"), recordViolation);
router.post("/attempts/:attemptId/retake", protect, authorize("ADMIN", "CUSTOMER_SERVICE"), validate(z.object({ params: z.object({ attemptId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid exam attempt") }) })), grantRetake);
router.put("/:id", protect, authorize("ADMIN", "CUSTOMER_SERVICE"), validate(examSchema), updateExam);
router.patch("/:id/schedule", protect, authorize("ADMIN", "CUSTOMER_SERVICE"), validate(scheduleExamSchema), scheduleExam);
router.patch("/:id/pause", protect, authorize("ADMIN"), pauseExam);
router.patch("/:id/resume", protect, authorize("ADMIN"), resumeExam);
router.delete("/:id", protect, authorize("ADMIN"), deleteExam);

export default router;
