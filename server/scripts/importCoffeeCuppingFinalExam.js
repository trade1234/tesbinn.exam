import dotenv from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { connectDB } from "../config/db.js";
import { Course } from "../models/Course.js";
import { Exam } from "../models/Exam.js";
import { Question } from "../models/Question.js";

const DAY = 24 * 60 * 60 * 1000;

const questions = [
  { questionType: "MULTIPLE_CHOICE", questionText: "Which coffee type is mainly grown in Ethiopia?", optionA: "Robusta", optionB: "Liberica", optionC: "Excelsa", optionD: "Arabica", correctAnswer: "D", marks: 0.5 },
  { questionType: "MULTIPLE_CHOICE", questionText: "Coffee grows best at which altitude?", optionA: "Above 3000 m", optionB: "400-800 m", optionC: "Sea level", optionD: "1000-2000 m", correctAnswer: "D", marks: 0.5 },
  { questionType: "MULTIPLE_CHOICE", questionText: "Which processing method gives clean and bright coffee taste?", optionA: "Washed", optionB: "Honey", optionC: "Natural", optionD: "Fermented", correctAnswer: "A", marks: 0.5 },
  { questionType: "MULTIPLE_CHOICE", questionText: "What affects coffee quality?", optionA: "Processing", optionB: "Storage", optionC: "Transportation", optionD: "All of the above", correctAnswer: "D", marks: 0.5 },
  { questionType: "MULTIPLE_CHOICE", questionText: "Which one is a primary defect?", optionA: "Fungus", optionB: "Partial sour", optionC: "Immature bean", optionD: "Partial black", correctAnswer: "A", marks: 0.5 },
  { questionType: "MULTIPLE_CHOICE", questionText: "Which is a good coffee flavor?", optionA: "Astringent", optionB: "Moldy", optionC: "Fruity", optionD: "All", correctAnswer: "C", marks: 0.5 },
  { questionType: "MULTIPLE_CHOICE", questionText: "Screen size measures what?", optionA: "Bean size", optionB: "Moisture", optionC: "Density", optionD: "Floaters", correctAnswer: "A", marks: 0.5 },
  { questionType: "MULTIPLE_CHOICE", questionText: "In wet processing, what is removed first?", optionA: "Pulp (skin)", optionB: "Silver skin", optionC: "Parchment", optionD: "Bean inside", correctAnswer: "A", marks: 0.5 },
  { questionType: "MULTIPLE_CHOICE", questionText: "Which process gives fruity or wine-like taste?", optionA: "Natural", optionB: "Washed", optionC: "Honey", optionD: "Any of the above", correctAnswer: "A", marks: 0.5 },
  { questionType: "MULTIPLE_CHOICE", questionText: "Which one is NOT a coffee defect?", optionA: "Floater", optionB: "Moldy", optionC: "Floral", optionD: "Foreign matter", correctAnswer: "C", marks: 0.5 },
  { questionType: "TRUE_FALSE", questionText: "Coffee moisture should be around 20%.", correctAnswer: "FALSE", marks: 0.625 },
  { questionType: "TRUE_FALSE", questionText: "Foreign matter is a secondary defect.", correctAnswer: "FALSE", marks: 0.625 },
  { questionType: "TRUE_FALSE", questionText: "First crack means dark roast.", correctAnswer: "FALSE", marks: 0.625 },
  { questionType: "TRUE_FALSE", questionText: "Sour beans happen due to over fermentation.", correctAnswer: "TRUE", marks: 0.625 },
  { questionType: "TRUE_FALSE", questionText: "Full black bean is a primary defect.", correctAnswer: "TRUE", marks: 0.625 },
  { questionType: "TRUE_FALSE", questionText: "Phenolic taste is a chemical defect.", correctAnswer: "TRUE", marks: 0.625 },
  { questionType: "TRUE_FALSE", questionText: "Parchment is washed coffee.", correctAnswer: "FALSE", marks: 0.625 },
  { questionType: "TRUE_FALSE", questionText: "Cupping includes washing, roasting, and tasting.", correctAnswer: "FALSE", marks: 0.625 },
  { questionType: "SHORT_ANSWER", questionText: "What are the 3 main steps of roasting coffee?", correctAnswer: "Drying, browning, development", marks: 1 },
  { questionType: "SHORT_ANSWER", questionText: "List 4 primary coffee defects.", correctAnswer: "Full black, full sour, fungus damaged, foreign matter", marks: 1 },
  { questionType: "SHORT_ANSWER", questionText: "List secondary coffee defects.", correctAnswer: "Partial black, partial sour, parchment, floater, immature, withered, shell, broken, chipped, cut, hull, husk, slight insect damage", marks: 1 },
  { questionType: "SHORT_ANSWER", questionText: "List common coffee flavors.", correctAnswer: "Fruity, floral, chocolate, nutty, caramel, citrus", marks: 1 },
  { questionType: "SHORT_ANSWER", questionText: "List materials checked during coffee grading.", correctAnswer: "Defects, screen size, moisture, odor, color, bean size", marks: 1 }
];

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });
await connectDB();

const course = await Course.findOneAndUpdate(
  { courseCode: "CCP101" },
  {
    courseName: "Coffee Cupping",
    courseCode: "CCP101",
    description: "Sensory evaluation, aroma, flavor, acidity, body, and scoring methods for coffee quality."
  },
  { new: true, upsert: true, runValidators: true }
);

const exam = await Exam.findOneAndUpdate(
  { courseId: course._id, title: "Coffee Cupping Final Exam" },
  {
    courseId: course._id,
    title: "Coffee Cupping Final Exam",
    description: "Final assessment covering coffee growing, processing, defects, grading, roasting, and cupping.",
    durationMinutes: 45,
    extraTimeMinutes: 0,
    totalMarks: 15,
    passPercentage: 50,
    startDate: new Date(Date.now() - DAY),
    endDate: new Date(Date.now() + 14 * DAY)
  },
  { new: true, upsert: true, runValidators: true }
);

await Question.deleteMany({ examId: exam._id });
await Question.insertMany(questions.map((question) => ({ ...question, examId: exam._id })));

console.log(`Imported ${questions.length} questions for ${exam.title} (${exam.totalMarks} marks, pass ${exam.passPercentage}%).`);
process.exit(0);

