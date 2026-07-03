import { z } from "zod";
import { Question } from "../models/Question.js";

export const questionSchema = z.object({
  body: z.object({
    examId: z.string().min(1),
    questionType: z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER"]).default("MULTIPLE_CHOICE"),
    questionText: z.string().min(3),
    optionA: z.string().optional().default(""),
    optionB: z.string().optional().default(""),
    optionC: z.string().optional().default(""),
    optionD: z.string().optional().default(""),
    correctAnswer: z.string().min(1),
    marks: z.coerce.number().min(0.1).default(1),
    order: z.coerce.number().min(0).optional()
  }).superRefine((question, ctx) => {
    if (question.questionType === "MULTIPLE_CHOICE") {
      ["optionA", "optionB", "optionC", "optionD"].forEach((field) => {
        if (!question[field]) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: "Option is required" });
        }
      });
      if (!["A", "B", "C", "D"].includes(question.correctAnswer)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["correctAnswer"], message: "Answer must be A, B, C, or D" });
      }
    }
    if (question.questionType === "TRUE_FALSE" && !["TRUE", "FALSE"].includes(question.correctAnswer)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["correctAnswer"], message: "Answer must be TRUE or FALSE" });
    }
  })
});

export async function listQuestions(req, res, next) {
  try {
    const query = req.query.examId ? { examId: req.query.examId } : {};
    const projection = req.user.role === "ADMIN" ? "" : "-correctAnswer";
    res.json(await Question.find(query).select(projection).populate("examId", "title courseId").sort({ createdAt: -1, order: -1 }));
  } catch (error) {
    next(error);
  }
}

export async function createQuestion(req, res, next) {
  try {
    const body = { ...req.body };
    if (body.order === undefined) {
      const lastQuestion = await Question.findOne({ examId: body.examId }).sort({ order: -1, createdAt: -1 });
      body.order = (lastQuestion?.order || 0) + 1;
    }
    res.status(201).json(await Question.create(body));
  } catch (error) {
    next(error);
  }
}

export async function bulkCreateQuestions(req, res, next) {
  try {
    const counters = new Map();
    const questionsWithOrder = [];
    for (const question of req.body.questions) {
      if (question.order !== undefined) {
        questionsWithOrder.push(question);
        continue;
      }

      const examId = String(question.examId);
      if (!counters.has(examId)) {
        const lastQuestion = await Question.findOne({ examId }).sort({ order: -1, createdAt: -1 });
        counters.set(examId, lastQuestion?.order || 0);
      }
      const nextOrder = counters.get(examId) + 1;
      counters.set(examId, nextOrder);
      questionsWithOrder.push({ ...question, order: nextOrder });
    }
    const questions = await Question.insertMany(questionsWithOrder);
    res.status(201).json(questions);
  } catch (error) {
    next(error);
  }
}

export async function updateQuestion(req, res, next) {
  try {
    const question = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!question) return res.status(404).json({ message: "Question not found" });
    res.json(question);
  } catch (error) {
    next(error);
  }
}

export async function deleteQuestion(req, res, next) {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) return res.status(404).json({ message: "Question not found" });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}


