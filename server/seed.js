import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import { User } from "./models/User.js";
import { Course } from "./models/Course.js";
import { Exam } from "./models/Exam.js";
import { Question } from "./models/Question.js";

const DAY = 24 * 60 * 60 * 1000;

dotenv.config();

await connectDB();
await Promise.all([User.deleteMany(), Course.deleteMany(), Exam.deleteMany(), Question.deleteMany()]);

const [admin, student] = await User.create([
  { name: "System Administrator", email: "admin@university.edu", password: "password123", role: "ADMIN" },
  { name: "Jane Student", email: "student@university.edu", enrollmentNumber: "TSE/1234/2028", batchYear: 2028, trainingTaken: "Coffee Cupping", password: "password123", role: "STUDENT" }
]);

const [coffeeCupping] = await Course.create([
  {
    courseName: "Coffee Cupping",
    courseCode: "CCP101",
    description: "Sensory evaluation, aroma, flavor, acidity, body, and scoring methods for coffee quality."
  },
  {
    courseName: "Barista",
    courseCode: "BAR101",
    description: "Espresso preparation, milk steaming, equipment handling, drink recipes, and customer service basics."
  },
  {
    courseName: "International Import and Export",
    courseCode: "IEX101",
    description: "International trade documentation, customs basics, logistics, import/export procedures, and compliance."
  }
]);

const exam = await Exam.create({
  courseId: coffeeCupping._id,
  title: "Coffee Cupping Final Exam",
  description: "Final assessment covering coffee growing, processing, defects, grading, roasting, and cupping.",
  durationMinutes: 45,
  extraTimeMinutes: 0,
  totalMarks: 15,
  passPercentage: 50,
  startDate: new Date(Date.now() - DAY),
  endDate: new Date(Date.now() + 14 * DAY)
});

await Question.create([
  {
    examId: exam._id,
    questionType: "MULTIPLE_CHOICE",
    questionText: "Which coffee type is mainly grown in Ethiopia?",
    optionA: "Robusta",
    optionB: "Liberica",
    optionC: "Excelsa",
    optionD: "Arabica",
    correctAnswer: "D",
    marks: 0.5
  },
  {
    examId: exam._id,
    questionType: "MULTIPLE_CHOICE",
    questionText: "Coffee grows best at which altitude?",
    optionA: "Above 3000 m",
    optionB: "400-800 m",
    optionC: "Sea level",
    optionD: "1000-2000 m",
    correctAnswer: "D",
    marks: 0.5
  },
  {
    examId: exam._id,
    questionType: "MULTIPLE_CHOICE",
    questionText: "Which processing method gives clean and bright coffee taste?",
    optionA: "Washed",
    optionB: "Honey",
    optionC: "Natural",
    optionD: "Fermented",
    correctAnswer: "A",
    marks: 0.5
  },
  {
    examId: exam._id,
    questionType: "MULTIPLE_CHOICE",
    questionText: "What affects coffee quality?",
    optionA: "Processing",
    optionB: "Storage",
    optionC: "Transportation",
    optionD: "All of the above",
    correctAnswer: "D",
    marks: 0.5
  },
  {
    examId: exam._id,
    questionType: "MULTIPLE_CHOICE",
    questionText: "Which one is a primary defect?",
    optionA: "Fungus",
    optionB: "Partial sour",
    optionC: "Immature bean",
    optionD: "Partial black",
    correctAnswer: "A",
    marks: 0.5
  },
  {
    examId: exam._id,
    questionType: "MULTIPLE_CHOICE",
    questionText: "Which is a good coffee flavor?",
    optionA: "Astringent",
    optionB: "Moldy",
    optionC: "Fruity",
    optionD: "All",
    correctAnswer: "C",
    marks: 0.5
  },
  {
    examId: exam._id,
    questionType: "MULTIPLE_CHOICE",
    questionText: "Screen size measures what?",
    optionA: "Bean size",
    optionB: "Moisture",
    optionC: "Density",
    optionD: "Floaters",
    correctAnswer: "A",
    marks: 0.5
  },
  {
    examId: exam._id,
    questionType: "MULTIPLE_CHOICE",
    questionText: "In wet processing, what is removed first?",
    optionA: "Pulp (skin)",
    optionB: "Silver skin",
    optionC: "Parchment",
    optionD: "Bean inside",
    correctAnswer: "A",
    marks: 0.5
  },
  {
    examId: exam._id,
    questionType: "MULTIPLE_CHOICE",
    questionText: "Which process gives fruity or wine-like taste?",
    optionA: "Natural",
    optionB: "Washed",
    optionC: "Honey",
    optionD: "Any of the above",
    correctAnswer: "A",
    marks: 0.5
  },
  {
    examId: exam._id,
    questionType: "MULTIPLE_CHOICE",
    questionText: "Which one is NOT a coffee defect?",
    optionA: "Floater",
    optionB: "Moldy",
    optionC: "Floral",
    optionD: "Foreign matter",
    correctAnswer: "C",
    marks: 0.5
  },
  { examId: exam._id, questionType: "TRUE_FALSE", questionText: "Coffee moisture should be around 20%.", correctAnswer: "FALSE", marks: 0.625 },
  { examId: exam._id, questionType: "TRUE_FALSE", questionText: "Foreign matter is a secondary defect.", correctAnswer: "FALSE", marks: 0.625 },
  { examId: exam._id, questionType: "TRUE_FALSE", questionText: "First crack means dark roast.", correctAnswer: "FALSE", marks: 0.625 },
  { examId: exam._id, questionType: "TRUE_FALSE", questionText: "Sour beans happen due to over fermentation.", correctAnswer: "TRUE", marks: 0.625 },
  { examId: exam._id, questionType: "TRUE_FALSE", questionText: "Full black bean is a primary defect.", correctAnswer: "TRUE", marks: 0.625 },
  { examId: exam._id, questionType: "TRUE_FALSE", questionText: "Phenolic taste is a chemical defect.", correctAnswer: "TRUE", marks: 0.625 },
  { examId: exam._id, questionType: "TRUE_FALSE", questionText: "Parchment is washed coffee.", correctAnswer: "FALSE", marks: 0.625 },
  { examId: exam._id, questionType: "TRUE_FALSE", questionText: "Cupping includes washing, roasting, and tasting.", correctAnswer: "FALSE", marks: 0.625 },
  {
    examId: exam._id,
    questionType: "SHORT_ANSWER",
    questionText: "What are the 3 main steps of roasting coffee?",
    correctAnswer: "Drying, browning, development",
    marks: 1
  },
  {
    examId: exam._id,
    questionType: "SHORT_ANSWER",
    questionText: "List 4 primary coffee defects.",
    correctAnswer: "Full black, full sour, fungus damaged, foreign matter",
    marks: 1
  },
  {
    examId: exam._id,
    questionType: "SHORT_ANSWER",
    questionText: "List secondary coffee defects.",
    correctAnswer: "Partial black, partial sour, parchment, floater, immature, withered, shell, broken, chipped, cut, hull, husk, slight insect damage",
    marks: 1
  },
  {
    examId: exam._id,
    questionType: "SHORT_ANSWER",
    questionText: "List common coffee flavors.",
    correctAnswer: "Fruity, floral, chocolate, nutty, caramel, citrus",
    marks: 1
  },
  {
    examId: exam._id,
    questionType: "SHORT_ANSWER",
    questionText: "List materials checked during coffee grading.",
    correctAnswer: "Defects, screen size, moisture, odor, color, bean size",
    marks: 1
  }
]);

console.log("Seed complete", {
  admin: admin.email,
  student: student.email,
  exam: exam.title,
  totalMarks: exam.totalMarks,
  passPercentage: exam.passPercentage
});
process.exit(0);
