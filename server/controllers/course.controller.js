import { z } from "zod";
import { Course } from "../models/Course.js";
import { Exam } from "../models/Exam.js";

export const courseSchema = z.object({
  body: z.object({
    courseName: z.string().min(2),
    courseCode: z.string().min(2),
    description: z.string().optional()
  })
});

export async function listCourses(req, res, next) {
  try {
    const search = req.query.search;
    const query = search
      ? { $or: [{ courseName: new RegExp(search, "i") }, { courseCode: new RegExp(search, "i") }] }
      : {};
    const courses = await Course.find(query).sort({ createdAt: -1 });
    const exams = await Exam.aggregate([{ $group: { _id: "$courseId", count: { $sum: 1 } } }]);
    const counts = new Map(exams.map((item) => [String(item._id), item.count]));
    res.json(courses.map((course) => ({ ...course.toObject(), examCount: counts.get(String(course._id)) || 0 })));
  } catch (error) {
    next(error);
  }
}

export async function createCourse(req, res, next) {
  try {
    res.status(201).json(await Course.create(req.body));
  } catch (error) {
    next(error);
  }
}

export async function updateCourse(req, res, next) {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json(course);
  } catch (error) {
    next(error);
  }
}

export async function deleteCourse(req, res, next) {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    await Exam.deleteMany({ courseId: req.params.id });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

