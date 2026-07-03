import { useEffect, useState } from "react";
import { AlertTriangle, CalendarClock, Clock3, Eye, PauseCircle, Pencil, PlayCircle, Plus, Search, Trash2 } from "lucide-react";
import DataTable from "../components/DataTable.jsx";
import Modal from "../components/Modal.jsx";
import { api } from "../services/api.js";

const blankExam = { courseId: "", title: "", description: "", durationMinutes: 30, extraTimeMinutes: 0, totalMarks: 10, passPercentage: 50, startDate: "" };
const blankQuestion = { examId: "", questionType: "MULTIPLE_CHOICE", questionText: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A", marks: 1, order: 0 };
const blankExtraTime = { examId: "", minutes: 5 };
const allQuestionsExamId = "ALL";
const blankQuestionBatch = { examId: "", questionType: "MULTIPLE_CHOICE", count: 1, marks: 1 };
const questionDraftStorageKey = "exam_question_draft";

function readQuestionDraft() {
  try {
    return JSON.parse(localStorage.getItem(questionDraftStorageKey) || "null");
  } catch {
    return null;
  }
}

function hasQuestionDraft(draft) {
  return Boolean(draft?.questionBatch?.examId || draft?.pendingQuestions?.length || draft?.questionForm?.questionText);
}

function formatDraftSavedAt(value) {
  return value ? new Date(value).toLocaleString() : "not saved yet";
}

function toLocalDateTimeInput(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function combineLocalDateAndTime(dateValue, timeValue) {
  if (!dateValue) return "";
  return `${dateValue}T${timeValue || "00:00"}`;
}

function localDateTimeToDate(value) {
  if (!value) return null;
  const text = String(value);
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(text)) return new Date(text);
  const [datePart, timePart = "00:00"] = text.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour = 0, minute = 0] = timePart.split(":").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, hour, minute);
}

function calculatedExamEndDate(exam) {
  const startDate = localDateTimeToDate(exam?.startDate);
  if (!startDate) return null;
  const totalMinutes = (Number(exam.durationMinutes) || 0) + (Number(exam.extraTimeMinutes) || 0);
  if (totalMinutes <= 0) return null;
  return new Date(startDate.getTime() + totalMinutes * 60000);
}

function isSameLocalDate(dateA, dateB) {
  return dateA.getFullYear() === dateB.getFullYear()
    && dateA.getMonth() === dateB.getMonth()
    && dateA.getDate() === dateB.getDate();
}

function defaultExamForm() {
  const startDate = new Date(Date.now() + 5 * 60000);
  return { ...blankExam, startDate: toLocalDateTimeInput(startDate) };
}

function apiErrorMessage(error) {
  return error?.response?.data?.message || "Request failed. Please check the form and try again.";
}

function questionTypeLabel(questionType) {
  if (questionType === "TRUE_FALSE") return "True / false";
  if (questionType === "SHORT_ANSWER") return "Short answer";
  return "Multiple choice";
}

function answerKeyForType(questionType) {
  if (questionType === "TRUE_FALSE") return "TRUE";
  if (questionType === "MULTIPLE_CHOICE") return "A";
  return "";
}

function toQuestionPayload(form) {
  const payload = { ...form };
  if (payload.order === "" || payload.order === 0 || payload.order === "0") delete payload.order;
  if (payload.questionType === "MULTIPLE_CHOICE") return payload;
  return { ...payload, optionA: "", optionB: "", optionC: "", optionD: "" };
}

function entityId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value._id || value.id || value.$oid || "");
}

function questionExamId(question) {
  return entityId(question.examId || question.exam || question.exam_id);
}
function examStatus(exam, now = Date.now()) {
  const start = new Date(exam.startDate).getTime();
  const end = new Date(exam.endDate).getTime();

  if (exam.isPaused) return { label: "Paused", className: "bg-orange-50 text-orange-700" };
  if (now < start) return { label: "Scheduled", className: "bg-amber-50 text-amber-700" };
  if (now > end) return { label: "Ended", className: "bg-slate-100 text-slate-600" };
  return { label: "Live", className: "bg-emerald-50 text-emerald-700" };
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : "Not set";
}

function countdownState(exam, now) {
  if (!exam) {
    return { label: "No exam selected", remaining: 0, mode: "idle", progress: 0 };
  }

  const start = new Date(exam.startDate).getTime();
  const end = new Date(exam.endDate).getTime();
  const current = now.getTime();

  if (exam.isPaused) {
    const pausedAt = exam.pausedAt ? new Date(exam.pausedAt).getTime() : current;
    const frozenRemaining = Math.max(Math.floor((end - pausedAt) / 1000), 0);
    const total = Math.max(end - start, 1);
    const elapsed = Math.min(Math.max(pausedAt - start, 0), total);
    return { label: "Paused", remaining: frozenRemaining, mode: "paused", progress: Math.round((elapsed / total) * 100) };
  }

  if (current < start) {
    return { label: "Starts in", remaining: Math.max(Math.floor((start - current) / 1000), 0), mode: "scheduled", progress: 0 };
  }

  if (current <= end) {
    const total = Math.max(end - start, 1);
    const elapsed = Math.min(Math.max(current - start, 0), total);
    return { label: "Time remaining", remaining: Math.max(Math.floor((end - current) / 1000), 0), mode: "live", progress: Math.round((elapsed / total) * 100) };
  }

  return { label: "Exam finished", remaining: 0, mode: "ended", progress: 100 };
}

function timeParts(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    { label: "HR", value: hours },
    { label: "MIN", value: minutes },
    { label: "SEC", value: seconds }
  ];
}

function ClockSegment({ label, value, active }) {
  return (
    <div className={`rounded-xl border px-3 py-2 text-center shadow-sm transition ${active ? "border-emerald-200 bg-emerald-50 text-emerald-800 shadow-emerald-100" : "border-slate-100 bg-white text-slate-700 dark:border-slate-700 dark:bg-[#17223a] dark:text-slate-100"}`}>
      <p className="font-mono text-2xl font-black tabular-nums tracking-tight">{String(value).padStart(2, "0")}</p>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
function ActionIconButton({ label, icon: Icon, onClick, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#17223a] dark:text-slate-200 dark:hover:bg-slate-800",
    blue: "border-blue-100 bg-blue-50 text-blue-700 hover:border-blue-200 hover:bg-blue-100 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200 dark:hover:bg-sky-900/40",
    amber: "border-amber-100 bg-amber-50 text-amber-700 hover:border-amber-200 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-900/40",
    red: "border-red-100 bg-red-50 text-red-600 hover:border-red-200 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-900/40"
  };

  return (
    <button
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${tones[tone]}`}
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      <Icon size={16} />
    </button>
  );
}

function toExamPayload(exam, overrides = {}) {
  const payload = {
    courseId: exam.courseId?._id || exam.courseId,
    title: exam.title,
    description: exam.description || "",
    durationMinutes: exam.durationMinutes,
    extraTimeMinutes: exam.extraTimeMinutes || 0,
    totalMarks: exam.totalMarks,
    passPercentage: exam.passPercentage,
    startDate: exam.startDate,
    ...overrides
  };
  const startDate = localDateTimeToDate(payload.startDate);
  const endDate = calculatedExamEndDate(payload);
  return {
    ...payload,
    startDate: startDate ? startDate.toISOString() : payload.startDate,
    endDate: endDate ? endDate.toISOString() : payload.endDate
  };
}

export default function ExamManagement() {
  const [courses, setCourses] = useState([]);
  const [exams, setExams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [examForm, setExamForm] = useState(blankExam);
  const [editingExamId, setEditingExamId] = useState("");
  const [questionForm, setQuestionForm] = useState(blankQuestion);
  const [extraTimeForm, setExtraTimeForm] = useState(blankExtraTime);
  const [questionBatch, setQuestionBatch] = useState(blankQuestionBatch);
  const [pendingQuestions, setPendingQuestions] = useState([]);
  const [questionStep, setQuestionStep] = useState(1);
  const [questionMessage, setQuestionMessage] = useState("");
  const [questionDraftSavedAt, setQuestionDraftSavedAt] = useState("");
  const [formError, setFormError] = useState("");
  const [modal, setModal] = useState(null);
  const [savingId, setSavingId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [questionDeleteTarget, setQuestionDeleteTarget] = useState(null);
  const [selectedQuestionExamId, setSelectedQuestionExamId] = useState(allQuestionsExamId);
  const [questionSearch, setQuestionSearch] = useState("");
  const [questionDetail, setQuestionDetail] = useState(null);
  const [selectedStartExamId, setSelectedStartExamId] = useState("");
  const [now, setNow] = useState(new Date());

  async function loadQuestions(examId = selectedQuestionExamId) {
    setQuestionsLoading(true);
    try {
      const query = examId && examId !== allQuestionsExamId ? `?examId=${encodeURIComponent(examId)}` : "";
      const { data } = await api.get(`/questions${query}`);
      const questionList = Array.isArray(data) ? data : data?.questions || [];
      setQuestions(questionList);
      return questionList;
    } finally {
      setQuestionsLoading(false);
    }
  }
  function load() {
    Promise.all([api.get("/courses"), api.get("/exams")]).then(([c, e]) => {
      setCourses(c.data);
      setExams(e.data);
      loadQuestions(allQuestionsExamId);
      setSelectedStartExamId((current) => current || e.data[0]?._id || "");
      setSelectedQuestionExamId((current) => current || allQuestionsExamId);
      setExtraTimeForm((current) => ({ ...current, examId: current.examId || e.data[0]?._id || "" }));
    });
  }

  useEffect(load, []);

  useEffect(() => {
    loadQuestions(selectedQuestionExamId);
  }, [selectedQuestionExamId]);

  useEffect(() => {
    if (!["questionSetup", "questionBatch"].includes(modal)) return;
    const draft = { pendingQuestions, questionBatch, questionForm, questionStep, savedAt: new Date().toISOString() };
    localStorage.setItem(questionDraftStorageKey, JSON.stringify(draft));
    setQuestionDraftSavedAt(draft.savedAt);
  }, [modal, pendingQuestions, questionBatch, questionForm, questionStep]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  async function saveExam(e) {
    e.preventDefault();
    setFormError("");
    const action = e.nativeEvent.submitter?.value || "save";
    const startDate = localDateTimeToDate(examForm.startDate);
    const endDate = calculatedExamEndDate(examForm);
    if (startDate && endDate && !isSameLocalDate(startDate, endDate)) {
      setFormError("Exam end time must remain on the same date as the selected exam date.");
      return;
    }

    try {
      if (editingExamId) {
        setSavingId(editingExamId);
        await api.put(`/exams/${editingExamId}`, toExamPayload(examForm));
        setEditingExamId("");
        setExamForm(blankExam);
        setModal(null);
        load();
        return;
      }

      const { data: createdExam } = await api.post("/exams", examForm);
      setExamForm(blankExam);
      if (action === "addQuestions") {
        localStorage.removeItem(questionDraftStorageKey);
        setQuestionDraftSavedAt("");
        setPendingQuestions([]);
        setQuestionStep(1);
        setQuestionMessage("Exam saved. Choose the first question type and number of questions.");
        setQuestionBatch({ ...blankQuestionBatch, examId: createdExam._id });
        setSelectedQuestionExamId(createdExam._id);
        setModal("questionSetup");
      } else {
        setModal(null);
      }
      load();
    } catch (error) {
      setFormError(apiErrorMessage(error));
    } finally {
      setSavingId("");
    }
  }

  function openCreateExam() {
    setFormError("");
    setEditingExamId("");
    setExamForm(defaultExamForm());
    setModal("exam");
  }

  function openEditSchedule(exam) {
    setFormError("");
    setEditingExamId(exam._id);
    setExamForm({
      ...toExamPayload(exam),
      startDate: toLocalDateTimeInput(new Date(exam.startDate))
    });
    setModal("exam");
  }

  async function saveQuestion(e) {
    e.preventDefault();
    setFormError("");
    if (!questionForm._id) return;

    try {
      const currentExamId = questionForm.examId;
      await api.put(`/questions/${questionForm._id}`, toQuestionPayload(questionForm));
      setSelectedQuestionExamId(currentExamId);
      setModal(null);
      setQuestionForm(blankQuestion);
      load();
    } catch (error) {
      setFormError(apiErrorMessage(error));
    }
  }

  function openAddQuestion() {
    const examId = selectedQuestionExamId === allQuestionsExamId ? exams[0]?._id || "" : selectedQuestionExamId || exams[0]?._id || "";
    setFormError("");
    const savedDraft = readQuestionDraft();
    if (hasQuestionDraft(savedDraft)) {
      setQuestionMessage(`Restored autosaved question draft from ${formatDraftSavedAt(savedDraft.savedAt)}.`);
      setQuestionDraftSavedAt(savedDraft.savedAt || "");
      setPendingQuestions(savedDraft.pendingQuestions || []);
      setQuestionStep(savedDraft.questionStep || 1);
      setQuestionBatch(savedDraft.questionBatch || { ...blankQuestionBatch, examId });
      setQuestionForm(savedDraft.questionForm || blankQuestion);
    } else {
      setQuestionMessage("");
      setQuestionDraftSavedAt("");
      setPendingQuestions([]);
      setQuestionStep(1);
      setQuestionBatch({ ...blankQuestionBatch, examId });
      setQuestionForm(blankQuestion);
    }
    setModal("questionSetup");
  }

  function discardQuestionDraft() {
    const examId = selectedQuestionExamId === allQuestionsExamId ? exams[0]?._id || "" : selectedQuestionExamId || exams[0]?._id || "";
    localStorage.removeItem(questionDraftStorageKey);
    setPendingQuestions([]);
    setQuestionStep(1);
    setQuestionBatch({ ...blankQuestionBatch, examId });
    setQuestionForm(blankQuestion);
    setQuestionDraftSavedAt("");
    setQuestionMessage("Autosaved question draft discarded.");
  }

  function startQuestionBatch(e) {
    e.preventDefault();
    setFormError("");
    const questionType = questionBatch.questionType;
    setQuestionStep(1);
    setQuestionForm({
      ...blankQuestion,
      examId: questionBatch.examId,
      questionType,
      marks: questionBatch.marks,
      correctAnswer: answerKeyForType(questionType)
    });
    setModal("questionBatch");
  }

  function saveDraftQuestion(e) {
    e.preventDefault();
    setFormError("");
    const payload = toQuestionPayload(questionForm);
    const nextPending = [...pendingQuestions, payload];
    const batchCount = Number(questionBatch.count) || 1;
    setPendingQuestions(nextPending);

    if (questionStep < batchCount) {
      setQuestionStep((current) => current + 1);
      setQuestionForm({
        ...blankQuestion,
        examId: questionBatch.examId,
        questionType: questionBatch.questionType,
        marks: questionBatch.marks,
        correctAnswer: answerKeyForType(questionBatch.questionType)
      });
      return;
    }

    setQuestionMessage(`${nextPending.length} draft question${nextPending.length === 1 ? "" : "s"} ready. Choose another type to continue or submit all.`);
    setQuestionForm(blankQuestion);
    setModal("questionSetup");
  }

  async function submitPendingQuestions() {
    if (!pendingQuestions.length) return;
    setFormError("");
    setSavingId("questions");
    try {
      await api.post("/questions/bulk", { questions: pendingQuestions });
      localStorage.removeItem(questionDraftStorageKey);
      setQuestionDraftSavedAt("");
      setSelectedQuestionExamId(questionBatch.examId);
      setPendingQuestions([]);
      setQuestionMessage("");
      setModal(null);
      load();
    } catch (error) {
      setFormError(apiErrorMessage(error));
    } finally {
      setSavingId("");
    }
  }

  function openEditQuestion(question) {
    setFormError("");
    setQuestionMessage("");
    setQuestionForm({
      ...blankQuestion,
      ...question,
      examId: question.examId?._id || question.examId,
      questionType: question.questionType || "MULTIPLE_CHOICE",
      correctAnswer: question.correctAnswer || answerKeyForType(question.questionType || "MULTIPLE_CHOICE")
    });
    setModal("question");
  }

  async function addExtraTime(e) {
    e.preventDefault();
    const exam = exams.find((item) => item._id === extraTimeForm.examId);
    const minutes = Number(extraTimeForm.minutes) || 0;
    if (!exam || minutes <= 0) return;

    setSavingId(exam._id);
    try {
      await api.put(`/exams/${exam._id}`, toExamPayload(exam, {
        extraTimeMinutes: (Number(exam.extraTimeMinutes) || 0) + minutes
      }));
      setModal(null);
      setExtraTimeForm({ examId: exam._id, minutes: 5 });
      load();
    } finally {
      setSavingId("");
    }
  }

  async function startExamNow(exam) {
    const startDate = new Date();

    setSavingId(exam._id);
    try {
      await api.put(`/exams/${exam._id}`, toExamPayload(exam, {
        startDate: startDate.toISOString()
      }));
      load();
    } finally {
      setSavingId("");
    }
  }

  const examTitleById = new Map(exams.map((exam) => [exam._id, exam.title]));
  const selectedQuestionExam = selectedQuestionExamId === allQuestionsExamId ? null : exams.find((exam) => exam._id === selectedQuestionExamId);
  const examQuestionCards = (selectedQuestionExamId === allQuestionsExamId ? exams : selectedQuestionExam ? [selectedQuestionExam] : []).map((exam) => {
    const examQuestions = questions
      .filter((question) => questionExamId(question) === exam._id)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const visibleQuestions = examQuestions.filter((question) => {
      const searchText = questionSearch.trim().toLowerCase();
      if (!searchText) return true;
      return [
        question.questionText,
        question.correctAnswer,
        question.optionA,
        question.optionB,
        question.optionC,
        question.optionD,
        questionTypeLabel(question.questionType),
        exam.title
      ].filter(Boolean).join(" ").toLowerCase().includes(searchText);
    });
    return {
      exam,
      questions: visibleQuestions,
      total: examQuestions.length,
      multipleChoice: examQuestions.filter((question) => question.questionType === "MULTIPLE_CHOICE").length,
      trueFalse: examQuestions.filter((question) => question.questionType === "TRUE_FALSE").length,
      shortAnswer: examQuestions.filter((question) => question.questionType === "SHORT_ANSWER").length
    };
  });
  const selectedStartExam = exams.find((exam) => exam._id === selectedStartExamId);
  const selectedClock = countdownState(selectedStartExam, now);
  const isLiveClock = selectedClock.mode === "live";
  const isPausedClock = selectedClock.mode === "paused";
  const examDateValue = examForm.startDate ? examForm.startDate.slice(0, 10) : "";
  const examStartTimeValue = examForm.startDate ? examForm.startDate.slice(11, 16) : "";
  const calculatedEndDate = calculatedExamEndDate(examForm);

  async function openQuestionDetails(exam, fallbackQuestions = []) {
    const latestQuestions = await loadQuestions(exam._id);
    setSelectedQuestionExamId(exam._id);
    const detailQuestions = latestQuestions.length ? latestQuestions : fallbackQuestions;
    setQuestionDetail({ title: exam.title, questions: detailQuestions });
  }

  async function startSelectedExam() {
    if (!selectedStartExam) return;
    await startExamNow(selectedStartExam);
  }

  async function toggleSelectedPause() {
    if (!selectedStartExam) return;
    setSavingId(selectedStartExam._id);
    try {
      const action = selectedStartExam.isPaused ? "resume" : "pause";
      await api.patch(`/exams/${selectedStartExam._id}/${action}`);
      load();
    } finally {
      setSavingId("");
    }
  }

  async function removeExam() {
    if (!deleteTarget) return;
    setSavingId(deleteTarget._id);
    try {
      await api.delete(`/exams/${deleteTarget._id}`);
      setDeleteTarget(null);
      load();
    } finally {
      setSavingId("");
    }
  }

  async function removeQuestion() {
    if (!questionDeleteTarget) return;
    setSavingId(questionDeleteTarget._id);
    try {
      await api.delete(`/questions/${questionDeleteTarget._id}`);
      setQuestionDeleteTarget(null);
      load();
    } finally {
      setSavingId("");
    }
  }

  function manageExamQuestions(exam) {
    setSelectedQuestionExamId(exam._id);
    document.getElementById("exam-questions")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex min-w-0 flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <h2 className="break-words text-2xl font-bold">Exam Management</h2>
          <p className="break-words text-sm text-slate-500">Create exams, set start and end time, then start an exam immediately when needed.</p>
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <button className="btn-secondary" onClick={() => setModal("extraTime")}><Clock3 size={16} /> Extra Time</button>
          <button className="btn-secondary" onClick={openAddQuestion}><Plus size={16} /> Add Question</button>
          <button className="btn-primary" onClick={openCreateExam}><Plus size={16} /> Create Exam</button>
        </div>
      </div>

      <section className="grid min-w-0 gap-4 rounded-xl border border-blue-100 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-[#111a2b] xl:grid-cols-[minmax(0,1fr)_340px_auto_auto] lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#287fae] dark:text-sky-300">
            <PlayCircle size={18} /> Start Exam
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Select an exam and make it live immediately. The countdown updates every second for the selected exam.</p>
          <select className="input mt-4 w-full max-w-xl" value={selectedStartExamId} onChange={(event) => setSelectedStartExamId(event.target.value)} disabled={!exams.length}>
            {!exams.length && <option value="">No exams created</option>}
            {exams.map((exam) => (
              <option key={exam._id} value={exam._id}>{exam.title} - {exam.courseId?.courseCode || exam.courseId?.courseName || "Course"}</option>
            ))}
          </select>
        </div>

        <div className={`min-w-0 overflow-hidden rounded-2xl border p-4 transition ${isLiveClock ? "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50 shadow-[0_18px_45px_rgba(16,185,129,0.18)]" : isPausedClock ? "border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 shadow-[0_18px_45px_rgba(249,115,22,0.16)]" : "border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-[#17223a]"}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`relative flex h-3 w-3 ${isLiveClock ? "animate-pulse" : ""}`}>
                {isLiveClock && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
                {isPausedClock && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-60" />}
                <span className={`relative inline-flex h-3 w-3 rounded-full ${isLiveClock ? "bg-emerald-500" : isPausedClock ? "bg-orange-500" : selectedClock.mode === "scheduled" ? "bg-amber-400" : "bg-slate-400"}`} />
              </span>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-100">{selectedClock.label}</p>
            </div>
            <Clock3 className={isLiveClock ? "animate-spin text-emerald-600 [animation-duration:3s]" : isPausedClock ? "text-orange-600" : "text-slate-400"} size={20} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 min-[420px]:gap-3">
            {timeParts(selectedClock.remaining).map((part) => <ClockSegment key={part.label} {...part} active={isLiveClock} />)}
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div className={`h-full rounded-full transition-all duration-1000 ${isLiveClock ? "bg-emerald-500" : isPausedClock ? "bg-orange-500" : "bg-amber-400"}`} style={{ width: `${selectedClock.progress}%` }} />
          </div>
          <p className="mt-2 truncate text-xs font-medium text-slate-500 dark:text-slate-400">{selectedStartExam ? selectedStartExam.title : "Create an exam to show the clock."}</p>
        </div>

        <button className="btn-primary min-h-11 w-full px-6 sm:w-auto" type="button" onClick={startSelectedExam} disabled={!selectedStartExam || savingId === selectedStartExam?._id}>
          <PlayCircle size={18} /> {savingId === selectedStartExam?._id ? "Starting..." : "Start Exam"}
        </button>
        <button className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-6 sm:w-auto py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${selectedStartExam?.isPaused ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-orange-500 text-white hover:bg-orange-600"}`} type="button" onClick={toggleSelectedPause} disabled={!selectedStartExam || savingId === selectedStartExam?._id}>
          {selectedStartExam?.isPaused ? <PlayCircle size={18} /> : <PauseCircle size={18} />}
          {selectedStartExam?.isPaused ? "Resume Exam" : "Pause Exam"}
        </button>
      </section>

      <DataTable columns={[
        { key: "title", label: "Exam" },
        { key: "course", label: "Course", render: (row) => row.courseId?.courseName },
        { key: "status", label: "Status", render: (row) => {
          const status = examStatus(row, now.getTime());
          return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>;
        } },
        { key: "durationMinutes", label: "Duration", render: (row) => `${row.durationMinutes} min` },
        { key: "extraTimeMinutes", label: "Extra Time", render: (row) => `${row.extraTimeMinutes || 0} min` },
        { key: "passPercentage", label: "Pass %", render: (row) => `${row.passPercentage}%` },
        { key: "startDate", label: "Starts", render: (row) => formatDateTime(row.startDate) },
        { key: "endDate", label: "Ends", render: (row) => formatDateTime(row.endDate) },
        { key: "actions", label: "Actions", render: (row) => (
          <div className="flex items-center gap-2"><ActionIconButton label="Edit schedule" icon={CalendarClock} onClick={() => openEditSchedule(row)} tone="amber" /><ActionIconButton label="Edit questions" icon={Pencil} onClick={() => manageExamQuestions(row)} tone="blue" /><ActionIconButton label="Delete exam" icon={Trash2} onClick={() => setDeleteTarget(row)} tone="red" /></div>
        ) }
      ]} rows={exams} />
      <section id="exam-questions" className="space-y-4 rounded-xl border border-blue-100 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-[#111a2b]">
        <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-end">
          <div>
            <h3 className="text-xl font-bold">Exam Questions</h3>
            <p className="break-words text-sm text-slate-500 dark:text-slate-400">Filter questions as cards, then click a card to view full details.</p>
          </div>
          <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_minmax(180px,220px)_auto] xl:min-w-[720px]">
            <select className="input" value={selectedQuestionExamId} onChange={(event) => setSelectedQuestionExamId(event.target.value)} disabled={!exams.length}>
              {!exams.length && <option value="">No exams created</option>}
              {!!exams.length && <option value={allQuestionsExamId}>All Exams</option>}
              {exams.map((exam) => <option key={exam._id} value={exam._id}>{exam.title}</option>)}
            </select>
            <label className="relative block min-w-0">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input className="input pl-9" placeholder="Search questions" value={questionSearch} onChange={(event) => setQuestionSearch(event.target.value)} />
            </label>
            <button className="btn-primary whitespace-nowrap" type="button" onClick={openAddQuestion}><Plus size={16} /> Add Question</button>
          </div>
        </div>

        {questionsLoading && <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 dark:bg-slate-800 dark:text-sky-200">Loading questions from backend...</p>}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {examQuestionCards.length ? examQuestionCards.map(({ exam, questions: cardQuestions, total, multipleChoice, trueFalse, shortAnswer }) => (
            <button
              key={exam._id}
              className="group min-h-[220px] rounded-xl border border-blue-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#1e9bf0] hover:shadow-[0_18px_45px_rgba(30,155,240,0.14)] disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-800 dark:bg-[#17223a] dark:hover:border-sky-700"
              type="button"
              onClick={() => openQuestionDetails(exam, cardQuestions)}
              disabled={questionsLoading}
            >
              <div className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Exam</p>
                    <h4 className="mt-1 line-clamp-2 text-lg font-bold text-slate-950 dark:text-slate-100">{exam.title}</h4>
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{exam.courseId?.courseCode || exam.courseId?.courseName || "Course"}</p>
                  </div>
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0f88d2] dark:bg-sky-950/40 dark:text-sky-300"><Eye size={18} /></span>
                </div>

                <p className="mt-4 line-clamp-2 flex-1 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
                  {cardQuestions[0]?.questionText || (total ? "No questions match this search." : "No questions added for this exam.")}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-blue-50 pt-3 dark:border-slate-800">
                  <div className="rounded-xl bg-blue-50 p-3 text-center dark:bg-sky-950/30">
                    <p className="text-2xl font-black text-[#0f88d2] dark:text-sky-300">{cardQuestions.length}</p>
                    <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Shown</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800">
                    <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{total}</p>
                    <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Total</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">Choice {multipleChoice}</span>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">T/F {trueFalse}</span>
                  <span className="rounded-full bg-purple-50 px-2.5 py-1 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300">Short {shortAnswer}</span>
                </div>
              </div>
            </button>
          )) : (
            <div className="rounded-xl border border-dashed border-blue-100 bg-blue-50/60 p-6 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400 md:col-span-2 xl:col-span-3">
              No exams created.
            </div>
          )}
        </div>
      </section>
      {questionDetail && (
        <Modal title="All Questions" onClose={() => setQuestionDetail(null)}>
          <div className="space-y-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-slate-800 dark:bg-[#17324d]">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">{questionDetail.title}</p>
              <p className="mt-1 text-lg font-bold text-slate-950 dark:text-slate-100">{questionDetail.questions.length} question{questionDetail.questions.length === 1 ? "" : "s"}</p>
            </div>

            <div className="max-h-[62vh] space-y-3 overflow-y-auto pr-1">
              {questionDetail.questions.map((question, index) => (
                <article key={question._id} className="rounded-xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-[#0f172a]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-sky-950/40 dark:text-sky-200">Question {question.order || index + 1}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{questionTypeLabel(question.questionType)}</span>
                        {selectedQuestionExamId === allQuestionsExamId && <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700 dark:bg-purple-950/30 dark:text-purple-200">{examTitleById.get(questionExamId(question)) || "Exam"}</span>}
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{question.marks} mark{Number(question.marks) === 1 ? "" : "s"}</span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-950 dark:text-slate-100">{question.questionText}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <ActionIconButton label="Edit question" icon={Pencil} onClick={() => { setQuestionDetail(null); openEditQuestion(question); }} tone="blue" />
                      <ActionIconButton label="Delete question" icon={Trash2} onClick={() => { setQuestionDetail(null); setQuestionDeleteTarget(question); }} tone="red" />
                    </div>
                  </div>

                  {question.questionType === "MULTIPLE_CHOICE" && (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {[["A", question.optionA], ["B", question.optionB], ["C", question.optionC], ["D", question.optionD]].map(([letter, option]) => (
                        <div key={letter} className={`rounded-lg border px-3 py-2 text-sm ${question.correctAnswer === letter ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200" : "border-slate-100 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-[#111a2b] dark:text-slate-200"}`}>
                          <span className="font-black">{letter}.</span> {option || "Not provided"}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">Correct answer:</span>
                    <span className="ml-2 font-mono font-black text-emerald-800 dark:text-emerald-200">{question.correctAnswer}</span>
                  </div>
                </article>
              ))}
            </div>

            <div className="flex justify-end">
              <button className="btn-secondary" type="button" onClick={() => setQuestionDetail(null)}>Close</button>
            </div>
          </div>
        </Modal>
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-[#111a2b]">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300">
                <AlertTriangle size={26} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-950 dark:text-slate-100">Delete exam?</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  This will permanently delete <span className="font-semibold text-slate-950 dark:text-slate-100">{deleteTarget.title}</span> and all of its questions.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button className="btn-secondary" type="button" onClick={() => setDeleteTarget(null)} disabled={savingId === deleteTarget._id}>Cancel</button>
              <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300" type="button" onClick={removeExam} disabled={savingId === deleteTarget._id}>
                <Trash2 size={16} /> {savingId === deleteTarget._id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      {questionDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-[#111a2b]">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300">
                <AlertTriangle size={26} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-950 dark:text-slate-100">Delete question?</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  This will permanently delete this question from the exam.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button className="btn-secondary" type="button" onClick={() => setQuestionDeleteTarget(null)} disabled={savingId === questionDeleteTarget._id}>Cancel</button>
              <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300" type="button" onClick={removeQuestion} disabled={savingId === questionDeleteTarget._id}>
                <Trash2 size={16} /> {savingId === questionDeleteTarget._id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}      {modal === "exam" && (
        <Modal title={editingExamId ? "Edit Schedule" : "Create Exam"} onClose={() => { setModal(null); setEditingExamId(""); }}>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={saveExam}>
            {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-200 sm:col-span-2">{formError}</p>}
            <select className="input sm:col-span-2" value={examForm.courseId} onChange={(e) => setExamForm({ ...examForm, courseId: e.target.value })} required>
              <option value="">Select course</option>
              {courses.map((course) => <option key={course._id} value={course._id}>{course.courseCode} - {course.courseName}</option>)}
            </select>
            <input className="input sm:col-span-2" placeholder="Exam title" value={examForm.title} onChange={(e) => setExamForm({ ...examForm, title: e.target.value })} required />
            <input className="input" type="number" min="1" placeholder="Exam total time (minutes)" value={examForm.durationMinutes} onChange={(e) => setExamForm({ ...examForm, durationMinutes: e.target.value })} required />
            <input className="input" type="number" min="0" placeholder="Extra time minutes" value={examForm.extraTimeMinutes} onChange={(e) => setExamForm({ ...examForm, extraTimeMinutes: e.target.value })} />
            <input className="input" type="number" placeholder="Total marks" value={examForm.totalMarks} onChange={(e) => setExamForm({ ...examForm, totalMarks: e.target.value })} required />
            <input className="input" type="number" placeholder="Pass percentage" value={examForm.passPercentage} onChange={(e) => setExamForm({ ...examForm, passPercentage: e.target.value })} required />
            <label className="space-y-1 text-sm font-semibold text-slate-600">
              <span>Exam date</span>
              <input className="input" type="date" value={examDateValue} onChange={(e) => setExamForm({ ...examForm, startDate: combineLocalDateAndTime(e.target.value, examStartTimeValue) })} required />
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-600">
              <span>Starting time</span>
              <input className="input" type="time" value={examStartTimeValue} onChange={(e) => setExamForm({ ...examForm, startDate: combineLocalDateAndTime(examDateValue, e.target.value) })} required />
            </label>
            <div className="space-y-1 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <span className="block">End time</span>
              <span className="block text-slate-950 dark:text-slate-100">{calculatedEndDate ? calculatedEndDate.toLocaleString() : "Calculated from start time"}</span>
            </div>
            <textarea className="input sm:col-span-2" placeholder="Description" value={examForm.description} onChange={(e) => setExamForm({ ...examForm, description: e.target.value })} />
            <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
              <button className="btn-secondary" type="submit" value="save" disabled={Boolean(editingExamId) && savingId === editingExamId}>{Boolean(editingExamId) && savingId === editingExamId ? "Saving..." : editingExamId ? "Save Schedule" : "Save Exam"}</button>
              {!editingExamId && <button className="btn-primary" type="submit" value="addQuestions"><Plus size={16} /> Save Exam and Add Questions</button>}
            </div>
          </form>
        </Modal>
      )}
      {modal === "extraTime" && (
        <Modal title="Add Extra Time" onClose={() => setModal(null)}>
          <form className="grid gap-3" onSubmit={addExtraTime}>
            <label className="space-y-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <span>Exam</span>
              <select className="input" value={extraTimeForm.examId} onChange={(e) => setExtraTimeForm({ ...extraTimeForm, examId: e.target.value })} required>
                <option value="">Select exam</option>
                {exams.map((exam) => <option key={exam._id} value={exam._id}>{exam.title} - {exam.courseId?.courseCode || exam.courseId?.courseName || "Course"}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <span>Extra time minutes</span>
              <input className="input" type="number" min="1" value={extraTimeForm.minutes} onChange={(e) => setExtraTimeForm({ ...extraTimeForm, minutes: e.target.value })} required />
            </label>
            <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">This adds minutes to the exam extra time and extends the end time for students.</p>
            <button className="btn-primary" disabled={savingId === extraTimeForm.examId}><Clock3 size={16} /> {savingId === extraTimeForm.examId ? "Adding..." : "Add Extra Time"}</button>
          </form>
        </Modal>
      )}
      {modal === "questionSetup" && (
        <Modal title="Add Questions" onClose={() => setModal(null)}>
          <form className="grid gap-4" onSubmit={startQuestionBatch}>
            {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-200">{formError}</p>}
            {questionMessage && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200">{questionMessage}</p>}
            <div className="flex flex-col gap-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-slate-700 dark:bg-slate-800 dark:text-sky-200 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-semibold">Question draft autosaved locally: {formatDraftSavedAt(questionDraftSavedAt)}</span>
              {(questionDraftSavedAt || pendingQuestions.length > 0 || questionForm.questionText) && <button className="text-left text-sm font-bold text-red-600 hover:text-red-700 dark:text-red-300" type="button" onClick={discardQuestionDraft}>Discard autosaved draft</button>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-semibold text-slate-600 dark:text-slate-300 sm:col-span-2">
                <span>Exam</span>
                <select className="input" value={questionBatch.examId} onChange={(event) => setQuestionBatch({ ...questionBatch, examId: event.target.value })} disabled={pendingQuestions.length > 0} required>
                  <option value="">Select exam</option>
                  {exams.map((exam) => <option key={exam._id} value={exam._id}>{exam.title}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                <span>Question type</span>
                <select className="input" value={questionBatch.questionType} onChange={(event) => setQuestionBatch({ ...questionBatch, questionType: event.target.value })} required>
                  <option value="MULTIPLE_CHOICE">Multiple choice</option>
                  <option value="TRUE_FALSE">True / false</option>
                  <option value="SHORT_ANSWER">Short answer</option>
                </select>
              </label>
              <label className="space-y-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                <span>Number of questions</span>
                <input className="input" type="number" min="1" value={questionBatch.count} onChange={(event) => setQuestionBatch({ ...questionBatch, count: event.target.value })} required />
              </label>
              <label className="space-y-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                <span>Marks per question</span>
                <input className="input" type="number" min="0.1" step="0.1" value={questionBatch.marks} onChange={(event) => setQuestionBatch({ ...questionBatch, marks: event.target.value })} required />
              </label>
              <div className="rounded-xl bg-blue-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <p className="font-bold text-slate-900 dark:text-slate-100">Draft questions: {pendingQuestions.length}</p>
                <p className="mt-1">Current batch: {questionTypeLabel(questionBatch.questionType)}</p>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <button className="btn-secondary" type="button" onClick={() => setModal(null)}>Cancel</button>
              <div className="grid gap-3 sm:flex sm:flex-row">
                <button className="btn-secondary" type="button" onClick={submitPendingQuestions} disabled={!pendingQuestions.length || savingId === "questions"}>{savingId === "questions" ? "Submitting..." : "Submit All Questions"}</button>
                <button className="btn-primary" type="submit"><Plus size={16} /> Start Adding</button>
              </div>
            </div>
          </form>
        </Modal>
      )}
      {modal === "questionBatch" && (
        <Modal title={`Add ${questionTypeLabel(questionBatch.questionType)} Question ${questionStep} of ${questionBatch.count}`} onClose={() => setModal("questionSetup")}>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={saveDraftQuestion}>
            {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-200 sm:col-span-2">{formError}</p>}
            <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 dark:bg-slate-800 dark:text-sky-200 sm:col-span-2">
              Draft questions ready: {pendingQuestions.length}. Autosaved locally: {formatDraftSavedAt(questionDraftSavedAt)}
            </div>
            <textarea className="input sm:col-span-2" placeholder="Question text" value={questionForm.questionText} onChange={(event) => setQuestionForm({ ...questionForm, questionText: event.target.value })} required />
            <label className="space-y-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <span>Question order</span>
              <input className="input" type="number" min="0" placeholder="Auto" value={questionForm.order || ""} onChange={(event) => setQuestionForm({ ...questionForm, order: event.target.value })} />
            </label>

            {questionForm.questionType === "MULTIPLE_CHOICE" ? (
              <>
                {["A", "B", "C", "D"].map((letter) => <input key={letter} className="input" placeholder={`Option ${letter}`} value={questionForm[`option${letter}`]} onChange={(event) => setQuestionForm({ ...questionForm, [`option${letter}`]: event.target.value })} required />)}
                <label className="space-y-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <span>Correct answer</span>
                  <select className="input" value={questionForm.correctAnswer} onChange={(event) => setQuestionForm({ ...questionForm, correctAnswer: event.target.value })}>
                    {["A", "B", "C", "D"].map((letter) => <option key={letter}>{letter}</option>)}
                  </select>
                </label>
              </>
            ) : questionForm.questionType === "TRUE_FALSE" ? (
              <label className="space-y-1 text-sm font-semibold text-slate-600 dark:text-slate-300 sm:col-span-2">
                <span>Correct answer</span>
                <select className="input" value={questionForm.correctAnswer} onChange={(event) => setQuestionForm({ ...questionForm, correctAnswer: event.target.value })}>
                  <option value="TRUE">True</option>
                  <option value="FALSE">False</option>
                </select>
              </label>
            ) : (
              <label className="space-y-1 text-sm font-semibold text-slate-600 dark:text-slate-300 sm:col-span-2">
                <span>Answer key</span>
                <input className="input" placeholder="Type the expected short answer" value={questionForm.correctAnswer} onChange={(event) => setQuestionForm({ ...questionForm, correctAnswer: event.target.value })} required />
              </label>
            )}

            <label className="space-y-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <span>Marks</span>
              <input className="input" type="number" min="0.1" step="0.1" value={questionForm.marks} onChange={(event) => setQuestionForm({ ...questionForm, marks: event.target.value })} required />
            </label>
            <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:justify-between">
              <button className="btn-secondary" type="button" onClick={() => setModal("questionSetup")}>Back</button>
              <button className="btn-primary" type="submit">{questionStep < Number(questionBatch.count) ? "Save and Next" : "Save Batch"}</button>
            </div>
          </form>
        </Modal>
      )}      {modal === "question" && (
        <Modal title={questionForm._id ? "Edit Question" : "Add Question"} onClose={() => setModal(null)}>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={saveQuestion}>
            {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-200 sm:col-span-2">{formError}</p>}
            <select className="input sm:col-span-2" value={questionForm.examId} onChange={(e) => setQuestionForm({ ...questionForm, examId: e.target.value })} required>
              <option value="">Select exam</option>
              {exams.map((exam) => <option key={exam._id} value={exam._id}>{exam.title}</option>)}
            </select>
            <select
              className="input sm:col-span-2"
              value={questionForm.questionType}
              onChange={(e) => setQuestionForm({
                ...questionForm,
                questionType: e.target.value,
                correctAnswer: answerKeyForType(e.target.value),
                optionA: e.target.value === "MULTIPLE_CHOICE" ? questionForm.optionA : "",
                optionB: e.target.value === "MULTIPLE_CHOICE" ? questionForm.optionB : "",
                optionC: e.target.value === "MULTIPLE_CHOICE" ? questionForm.optionC : "",
                optionD: e.target.value === "MULTIPLE_CHOICE" ? questionForm.optionD : ""
              })}
            >
              <option value="MULTIPLE_CHOICE">Multiple choice</option>
              <option value="TRUE_FALSE">True / false</option>
              <option value="SHORT_ANSWER">Short answer</option>
            </select>
            <textarea className="input sm:col-span-2" placeholder="Question text" value={questionForm.questionText} onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })} required />
            <label className="space-y-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <span>Question order</span>
              <input className="input" type="number" min="0" placeholder="Auto" value={questionForm.order || ""} onChange={(e) => setQuestionForm({ ...questionForm, order: e.target.value })} />
            </label>

            {questionForm.questionType === "MULTIPLE_CHOICE" ? (
              <>
                {["A", "B", "C", "D"].map((letter) => <input key={letter} className="input" placeholder={`Option ${letter}`} value={questionForm[`option${letter}`]} onChange={(e) => setQuestionForm({ ...questionForm, [`option${letter}`]: e.target.value })} required />)}
                <label className="space-y-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <span>Correct answer</span>
                  <select className="input" value={questionForm.correctAnswer} onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}>
                    {["A", "B", "C", "D"].map((letter) => <option key={letter}>{letter}</option>)}
                  </select>
                </label>
              </>
            ) : questionForm.questionType === "TRUE_FALSE" ? (
              <label className="space-y-1 text-sm font-semibold text-slate-600 dark:text-slate-300 sm:col-span-2">
                <span>Correct answer</span>
                <select className="input" value={questionForm.correctAnswer} onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}>
                  <option value="TRUE">True</option>
                  <option value="FALSE">False</option>
                </select>
              </label>
            ) : (
              <label className="space-y-1 text-sm font-semibold text-slate-600 dark:text-slate-300 sm:col-span-2">
                <span>Answer key</span>
                <input className="input" placeholder="Type the expected short answer" value={questionForm.correctAnswer} onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })} required />
              </label>
            )}

            <label className="space-y-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <span>Marks</span>
              <input className="input" type="number" min="0.1" step="0.1" value={questionForm.marks} onChange={(e) => setQuestionForm({ ...questionForm, marks: e.target.value })} />
            </label>
            {questionMessage && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200 sm:col-span-2">{questionMessage}</p>}
            <button className="btn-primary sm:col-span-2">{questionForm._id ? "Save Question Changes" : "Save Question and Add Next"}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
