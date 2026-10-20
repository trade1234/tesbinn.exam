// Single source of truth for marking answers and calculating exam results.

// Words ignored when comparing short answers, so "the washed process" matches "washed process".
const FILLER_WORDS = new Set(["a", "an", "the"]);

function normalizeChoice(value = "") {
  return String(value ?? "").trim().toUpperCase();
}

function normalizePhrase(value = "") {
  return String(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word && !FILLER_WORDS.has(word))
    .join(" ");
}

// Splits a short answer into its listed items so order and separators don't matter:
// "Drying, browning and development" -> ["browning", "development", "drying"]
function answerParts(value = "") {
  return String(value ?? "")
    .split(/[,;\n/&]|\band\b/i)
    .map(normalizePhrase)
    .filter(Boolean)
    .sort();
}

function samePartList(left, right) {
  return left.length > 0 && left.length === right.length && left.every((part, index) => part === right[index]);
}

// A short-answer key may list accepted alternatives separated by "|", e.g. "Arabica | Coffea arabica".
export function isCorrectAnswer(question, selectedAnswer) {
  if (!question) return false;
  if (question.questionType === "SHORT_ANSWER") {
    const studentParts = answerParts(selectedAnswer);
    return String(question.correctAnswer ?? "")
      .split("|")
      .some((alternative) => samePartList(answerParts(alternative), studentParts));
  }
  const selected = normalizeChoice(selectedAnswer);
  return selected !== "" && selected === normalizeChoice(question.correctAnswer);
}

export function roundTo2(value) {
  return Math.round(Number(value) * 100) / 100;
}

// answerMap: Map of questionId (string) -> selected answer
export function gradeAnswers({ questions, answerMap, exam }) {
  const correctQuestions = questions.filter((question) => isCorrectAnswer(question, answerMap.get(String(question._id))));
  const score = roundTo2(correctQuestions.reduce((total, question) => total + Number(question.marks || 0), 0));
  const questionsTotalMarks = roundTo2(questions.reduce((total, question) => total + Number(question.marks || 0), 0));
  const totalMarks = questionsTotalMarks > 0 ? questionsTotalMarks : Number(exam?.totalMarks || 0);
  const percentage = totalMarks > 0 ? roundTo2((score / totalMarks) * 100) : 0;
  const status = percentage >= Number(exam?.passPercentage || 0) ? "PASS" : "FAIL";
  return { score, totalMarks, percentage, status, correctAnswers: correctQuestions.length };
}
