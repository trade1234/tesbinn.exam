import { Course } from "../models/Course.js";

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeCourseName(value = "") {
  return String(value).trim().replace(/\s+/g, " ").toLowerCase();
}

export function courseMatchesTraining(course, trainingTaken = "") {
  return normalizeCourseName(course?.courseName) === normalizeCourseName(trainingTaken);
}

export async function findAssignedCourseForStudent(student) {
  const trainingTaken = student?.trainingTaken?.trim();
  if (!trainingTaken) return null;

  const exactMatch = await Course.findOne({
    courseName: new RegExp(`^${escapeRegExp(trainingTaken)}$`, "i")
  });
  if (exactMatch) return exactMatch;

  const courses = await Course.find().select("courseName courseCode description");
  return courses.find((course) => courseMatchesTraining(course, trainingTaken)) || null;
}
