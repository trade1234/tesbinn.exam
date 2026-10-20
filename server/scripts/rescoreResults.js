// Re-grades completed exam attempts against the current answer key and grading rules.
// Usage:
//   node scripts/rescoreResults.js                      -> dry run for all completed attempts
//   node scripts/rescoreResults.js TSE/0640/2026        -> dry run for one student (enrollment number)
//   node scripts/rescoreResults.js TSE/0640/2026 --fix  -> save corrected scores and certificates
import "../config/env.js";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { ExamAttempt } from "../models/ExamAttempt.js";
import { User } from "../models/User.js";
import { gradeAttempt, rescoreExamAttempts } from "../controllers/result.controller.js";

const args = process.argv.slice(2);
const fix = args.includes("--fix");
const enrollmentNumber = args.find((arg) => !arg.startsWith("--"));

await connectDB();

const query = { status: { $in: ["PASS", "FAIL"] } };
if (enrollmentNumber) {
  const student = await User.findOne({ enrollmentNumber });
  if (!student) {
    console.error(`No student found with enrollment number ${enrollmentNumber}`);
    process.exit(1);
  }
  query.studentId = student._id;
}

const attempts = await ExamAttempt.find(query).populate("studentId", "name enrollmentNumber");
const examsToFix = new Set();
let mismatches = 0;

for (const attempt of attempts) {
  const grade = await gradeAttempt(attempt);
  if (!grade) continue;
  const { exam, questions, answers, score, totalMarks, percentage, status } = grade;
  const wrong = attempt.score !== score || attempt.percentage !== percentage || attempt.status !== status;
  if (enrollmentNumber || wrong) {
    console.log(`${attempt.studentId?.name} (${attempt.studentId?.enrollmentNumber}) - ${exam.title} [pass mark ${exam.passPercentage}%]`);
    console.log(`  stored:  ${attempt.score}/${totalMarks} (${attempt.percentage}%) ${attempt.status}`);
    console.log(`  correct: ${score}/${totalMarks} (${percentage}%) ${status}${wrong ? "   <-- MISMATCH" : ""}`);
    console.log(`  answered ${answers.filter((answer) => answer.selectedAnswer).length}/${questions.length} questions`);
  }
  if (wrong) {
    mismatches += 1;
    examsToFix.add(String(exam._id));
  }
}

console.log(`\nChecked ${attempts.length} attempt(s); ${mismatches} stored result(s) differ from the current grading.`);

if (fix && examsToFix.size) {
  for (const examId of examsToFix) await rescoreExamAttempts(examId);
  console.log(`Re-graded all completed attempts for ${examsToFix.size} exam(s).`);
} else if (mismatches) {
  console.log("Run again with --fix to save the corrected results.");
}

await mongoose.disconnect();
