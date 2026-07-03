import { Router } from "express";
import { courseSchema, createCourse, deleteCourse, listCourses, updateCourse } from "../controllers/course.controller.js";
import { authorize, protect } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";

const router = Router();

router.get("/", protect, listCourses);
router.post("/", protect, authorize("ADMIN"), validate(courseSchema), createCourse);
router.put("/:id", protect, authorize("ADMIN"), validate(courseSchema), updateCourse);
router.delete("/:id", protect, authorize("ADMIN"), deleteCourse);

export default router;

