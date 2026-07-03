import { Router } from "express";
import { z } from "zod";
import { authorize, protect } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { bulkCreateQuestions, createQuestion, deleteQuestion, listQuestions, questionSchema, updateQuestion } from "../controllers/question.controller.js";

const router = Router();

router.get("/", protect, listQuestions);
router.post("/", protect, authorize("ADMIN"), validate(questionSchema), createQuestion);
router.post("/bulk", protect, authorize("ADMIN"), validate(z.object({ body: z.object({ questions: z.array(questionSchema.shape.body) }) })), bulkCreateQuestions);
router.put("/:id", protect, authorize("ADMIN"), validate(questionSchema), updateQuestion);
router.delete("/:id", protect, authorize("ADMIN"), deleteQuestion);

export default router;

