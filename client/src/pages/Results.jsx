import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Eye, Filter, XCircle } from "lucide-react";
import DataTable from "../components/DataTable.jsx";
import Modal from "../components/Modal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api, downloadFile } from "../services/api.js";

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : "Not set";
}

function buildResultQuery(filters) {
  const params = new URLSearchParams();
  if (filters.courseId) params.set("courseId", filters.courseId);
  if (filters.date) {
    const start = new Date(`${filters.date}T00:00:00`);
    const end = new Date(`${filters.date}T23:59:59.999`);
    params.set("from", start.toISOString());
    params.set("to", end.toISOString());
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

function answerLabel(questionType, value, options = {}) {
  if (!value) return "No answer";
  if (questionType === "MULTIPLE_CHOICE") return `${value}. ${options[value] || ""}`.trim();
  if (questionType === "TRUE_FALSE") return value === "TRUE" ? "True" : "False";
  return value;
}
export default function Results() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("completed");
  const [completedRows, setCompletedRows] = useState([]);
  const [activeRows, setActiveRows] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filters, setFilters] = useState({ courseId: "", date: "" });
  const [review, setReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const query = useMemo(() => buildResultQuery(filters), [filters]);

  useEffect(() => {
    api.get("/courses").then((res) => setCourses(Array.isArray(res.data) ? res.data.filter(Boolean) : []));
  }, []);

  useEffect(() => {
    api.get(`/results${query}`).then((res) => setCompletedRows(Array.isArray(res.data) ? res.data.filter(Boolean) : []));
    if (isAdmin) {
      api.get(`/results/active${query}`).then((res) => setActiveRows(Array.isArray(res.data) ? res.data.filter(Boolean) : []));
    }
  }, [isAdmin, query]);

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function resetFilters() {
    setFilters({ courseId: "", date: "" });
  }
  async function openReview(row) {
    setReviewError("");
    setReviewLoading(true);
    try {
      if (!row?._id) throw new Error("Result record is missing an id.");
      let data;
      try {
        const response = await api.get(`/results/review/${row._id}`);
        data = response.data;
      } catch (firstError) {
        if (firstError.response?.status !== 404) throw firstError;
        const response = await api.get(`/results/${row._id}/review`);
        data = response.data;
      }
      setReview(data);
    } catch (error) {
      setReviewError(error.response?.data?.message || error.message || "Could not load answer sheet.");
    } finally {
      setReviewLoading(false);
    }
  }

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex min-w-0 flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <h2 className="break-words text-2xl font-bold text-slate-950 dark:text-slate-100">Results</h2>
          <p className="break-words text-sm text-slate-500 dark:text-slate-400">Results appear after a student submits or when the exam timer finishes.</p>
        </div>
        {isAdmin && (
          <div className="grid gap-2 sm:flex">
            <button className="btn-secondary" onClick={() => downloadFile("/results/export/pdf", "exam-results.pdf")}><Download size={16} /> PDF</button>
            <button className="btn-primary" onClick={() => downloadFile("/results/export/excel", "exam-results.xlsx")}><Download size={16} /> Excel</button>
          </div>
        )}
      </div>

      <section className="grid gap-3 rounded-xl border border-blue-100 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-[#111a2b] md:grid-cols-[1.3fr_1fr_auto] md:items-end">
        <label className="space-y-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-2"><Filter size={16} /> Course</span>
          <select className="input" value={filters.courseId} onChange={(event) => updateFilter("courseId", event.target.value)}>
            <option value="">All courses</option>
            {courses.filter(Boolean).map((course) => <option key={course._id} value={course._id}>{course.courseCode} - {course.courseName}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <span>Exam date</span>
          <input className="input" type="date" value={filters.date} onChange={(event) => updateFilter("date", event.target.value)} />
        </label>
        <button className="btn-secondary h-10" type="button" onClick={resetFilters}>Reset</button>
      </section>

      {isAdmin && (
        <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800">
          <button
            className={`shrink-0 border-b-2 px-4 py-3 sm:px-5 text-sm font-semibold transition ${activeTab === "completed" ? "border-blue-500 text-blue-600 dark:text-sky-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            onClick={() => setActiveTab("completed")}
          >
            Completed Exams ({completedRows.length})
          </button>
          <button
            className={`shrink-0 border-b-2 px-4 py-3 sm:px-5 text-sm font-semibold transition ${activeTab === "active" ? "border-blue-500 text-blue-600 dark:text-sky-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            onClick={() => setActiveTab("active")}
          >
            Active Exams ({activeRows.length})
          </button>
        </div>
      )}

      {activeTab === "completed" ? (
        <DataTable columns={[
          ...(isAdmin ? [{ key: "student", label: "Student", render: (row) => (
            <div>
              <p className="font-semibold text-slate-950 dark:text-slate-100">{row.studentId?.name}</p>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{row.studentId?.enrollmentNumber || row.studentId?.email}</p>
            </div>
          ) }] : []),
          { key: "course", label: "Course", render: (row) => row.examId?.courseId?.courseName },
          { key: "exam", label: "Exam", render: (row) => row.examId?.title },
          { key: "submittedAt", label: "Submitted / Finished", render: (row) => formatDateTime(row.submittedAt) },
          { key: "score", label: "Score" },
          { key: "percentage", label: "Percentage", render: (row) => `${row.percentage}%` },
          { key: "status", label: "Status", render: (row) => <span className={`rounded-full px-3 py-1 text-xs font-bold ${row.status === "PASS" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"}`}>{row.status}</span> },
          { key: "review", label: "Answer Sheet", render: (row) => (
            <button className="btn-secondary" type="button" onClick={() => openReview(row)}>
              <Eye size={15} /> View Answers
            </button>
          ) }
        ]} rows={completedRows} />
      ) : (
        <DataTable columns={[
          { key: "student", label: "Student", render: (row) => (
            <div>
              <p className="font-semibold text-slate-950 dark:text-slate-100">{row.studentId?.name}</p>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{row.studentId?.enrollmentNumber || row.studentId?.email}</p>
            </div>
          ) },
          { key: "course", label: "Course", render: (row) => row.examId?.courseId?.courseName },
          { key: "exam", label: "Exam", render: (row) => row.examId?.title },
          { key: "startedAt", label: "Started At", render: (row) => formatDateTime(row.startedAt) },
          { key: "duration", label: "Exam Duration", render: (row) => `${(row.examId?.durationMinutes || 0) + (row.examId?.extraTimeMinutes || 0)} min` },
          { key: "extraTime", label: "Exam Extra Time", render: (row) => row.examId?.extraTimeMinutes ? <span className="font-semibold text-amber-600 dark:text-amber-400">+{row.examId.extraTimeMinutes} min</span> : "None" }
        ]} rows={activeRows} empty="No students are currently taking any exams." />
      )}

      {(review || reviewLoading || reviewError) && (
        <Modal title="Answer Sheet" onClose={() => { setReview(null); setReviewError(""); }}>
          {reviewLoading && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">Loading answer sheet...</p>}
          {reviewError && <p className="rounded-lg bg-red-50 p-4 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-200">{reviewError}</p>}
          {review && (
            <div className="space-y-5">
              <div className="grid gap-3 rounded-xl bg-[#edf6ff] p-4 text-sm dark:bg-[#17324d] sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Student</p>
                  <p className="mt-1 font-semibold text-slate-950 dark:text-slate-100">{review.attempt?.studentId?.name || "Unknown student"}</p>
                  <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{review.attempt?.studentId?.enrollmentNumber || review.attempt?.studentId?.email || ""}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Score</p>
                  <p className="mt-1 font-semibold text-slate-950 dark:text-slate-100">{review.attempt?.score ?? 0}/{review.totalMarks ?? 0} ({review.attempt?.percentage ?? 0}%)</p>
                  <p className="text-xs font-bold text-[#0f88d2]">{review.attempt?.status || "UNKNOWN"}</p>
                </div>
              </div>

              <div className="space-y-3">
                {(review.items || []).filter(Boolean).map((item) => (
                  <article key={item.questionId} className={`rounded-xl border p-4 ${item.isCorrect ? "border-emerald-100 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20" : "border-red-100 bg-red-50/60 dark:border-red-900/40 dark:bg-red-950/20"}`}>
                    <div className="flex items-start gap-3">
                      {item.isCorrect ? <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={20} /> : <XCircle className="mt-0.5 shrink-0 text-red-600" size={20} />}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-slate-950 dark:text-slate-100">{item.number}. {item.questionText}</p>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.isCorrect ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>
                            {item.earnedMarks}/{item.marks} marks
                          </span>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                          <p className="rounded-lg bg-white/80 p-3 text-slate-700 dark:bg-[#111a2b] dark:text-slate-200">
                            <span className="block text-xs font-bold uppercase text-slate-400">Your answer</span>
                            {answerLabel(item.questionType, item.selectedAnswer, item.options)}
                          </p>
                          <p className="rounded-lg bg-white/80 p-3 text-slate-700 dark:bg-[#111a2b] dark:text-slate-200">
                            <span className="block text-xs font-bold uppercase text-slate-400">Correct answer</span>
                            {answerLabel(item.questionType, item.correctAnswer, item.options)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}    </div>
  );
}




