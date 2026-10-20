import test from "node:test";
import assert from "node:assert/strict";
import { gradeAnswers, isCorrectAnswer } from "../utils/grading.js";

const shortAnswer = { questionType: "SHORT_ANSWER", correctAnswer: "Drying, browning, development" };

test("short answers ignore case, punctuation, list order and 'and' separators", () => {
  assert.equal(isCorrectAnswer(shortAnswer, "drying, browning, development"), true);
  assert.equal(isCorrectAnswer(shortAnswer, "Drying, browning and development."), true);
  assert.equal(isCorrectAnswer(shortAnswer, "development; drying & browning"), true);
  assert.equal(isCorrectAnswer(shortAnswer, "  DRYING,BROWNING ,  development  "), true);
});

test("short answers still reject missing, extra or wrong items", () => {
  assert.equal(isCorrectAnswer(shortAnswer, "drying, browning"), false);
  assert.equal(isCorrectAnswer(shortAnswer, "drying, browning, development, cooling"), false);
  assert.equal(isCorrectAnswer(shortAnswer, "drying, roasting, development"), false);
  assert.equal(isCorrectAnswer(shortAnswer, ""), false);
});

test("short answers accept any alternative separated by |", () => {
  const question = { questionType: "SHORT_ANSWER", correctAnswer: "Arabica | Coffea arabica" };
  assert.equal(isCorrectAnswer(question, "arabica"), true);
  assert.equal(isCorrectAnswer(question, "The Coffea Arabica"), true);
  assert.equal(isCorrectAnswer(question, "Robusta"), false);
});

test("choice answers tolerate case and whitespace but not blanks", () => {
  assert.equal(isCorrectAnswer({ questionType: "MULTIPLE_CHOICE", correctAnswer: "B" }, " b "), true);
  assert.equal(isCorrectAnswer({ questionType: "TRUE_FALSE", correctAnswer: "TRUE" }, "true"), true);
  assert.equal(isCorrectAnswer({ questionType: "MULTIPLE_CHOICE", correctAnswer: "B" }, "C"), false);
  assert.equal(isCorrectAnswer({ questionType: "MULTIPLE_CHOICE", correctAnswer: "B" }, undefined), false);
});

test("exactly reaching the pass percentage is a PASS", () => {
  const questions = [1, 2, 3, 4].map((id) => ({ _id: id, questionType: "MULTIPLE_CHOICE", correctAnswer: "A", marks: 12.5 }));
  const answerMap = new Map([["1", "A"], ["2", "A"], ["3", "B"]]);
  assert.deepEqual(gradeAnswers({ questions, answerMap, exam: { passPercentage: 50 } }), {
    score: 25, totalMarks: 50, percentage: 50, status: "PASS", correctAnswers: 2
  });
  assert.equal(gradeAnswers({ questions, answerMap, exam: { passPercentage: 60 } }).status, "FAIL");
});

test("decimal marks are totalled without floating point drift", () => {
  const questions = Array.from({ length: 8 }, (_, id) => ({ _id: id, questionType: "TRUE_FALSE", correctAnswer: "TRUE", marks: 0.625 }));
  const answerMap = new Map(questions.map((question) => [String(question._id), "TRUE"]));
  const result = gradeAnswers({ questions, answerMap, exam: { passPercentage: 50 } });
  assert.equal(result.score, 5);
  assert.equal(result.totalMarks, 5);
  assert.equal(result.percentage, 100);
});
