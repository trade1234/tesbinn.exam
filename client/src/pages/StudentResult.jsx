import { useEffect, useState } from "react";
import { Download, ListChecks, LoaderCircle } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import ResultImageCanvas, { resultImageBlob } from "../components/ResultImageCanvas.jsx";
import { api } from "../services/api.js";

function resultFromReview(review) {
  const attempt = review?.attempt;
  if (!attempt) return null;
  return { attemptId: attempt._id, studentName: attempt.studentId?.name, enrollmentNumber: attempt.studentId?.enrollmentNumber || "", trainingType: attempt.studentId?.trainingTaken || attempt.examId?.courseId?.courseName || "", courseName: attempt.examId?.courseId?.courseName || "", examName: attempt.examId?.title || "", score: attempt.score, totalMarks: review.totalMarks, percentage: attempt.percentage, status: attempt.status, submittedAt: attempt.submittedAt };
}

export default function StudentResult() {
  const { attemptId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const initial = state?.result || null;
  const [result, setResult] = useState(initial);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  useEffect(() => {
    api.get(`/results/review/${attemptId}`).then(({ data }) => setResult(resultFromReview(data))).catch((requestError) => { if (!initial) setError(requestError.response?.data?.message || "Could not load this result."); });
  }, [attemptId]);
  useEffect(() => {
    if (result?.status !== "PASS") return;
    api.get("/certificates").then(({ data }) => {
      const certificate = data.find((item) => String(item.attemptId?._id || item.attemptId) === String(attemptId));
      if (certificate?._id) navigate(`/student/certificates/${certificate._id}`, { replace: true, state: { certificate } });
    }).catch(() => {});
  }, [attemptId, navigate, result?.status]);
  async function downloadImage() {
    if (!result) return;
    setDownloading(true);
    try {
      const blob = await resultImageBlob(result), url = URL.createObjectURL(blob), link = document.createElement("a");
      const safeName = (result.studentName || "student").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
      link.href = url; link.download = `${safeName || "student"}-exam-result.png`; link.click(); URL.revokeObjectURL(url);
    } finally { setDownloading(false); }
  }
  if (error) return <div className="rounded-xl bg-red-50 p-5 text-red-700">{error}</div>;
  if (!result) return <div className="flex items-center gap-3 p-8 text-slate-500"><LoaderCircle className="animate-spin" /> Loading result...</div>;
  return <div className="mx-auto max-w-5xl space-y-6">
    <div className="rounded-2xl bg-white p-5 shadow-soft dark:bg-[#111a2b] sm:flex sm:items-center sm:justify-between sm:p-7">
      <div><p className={`text-sm font-bold uppercase tracking-widest ${result.status === "PASS" ? "text-emerald-600" : "text-red-600"}`}>Exam submitted successfully</p><h1 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">Your result is ready</h1><p className="mt-2 text-slate-500 dark:text-slate-400">{result.studentName} · {result.score}/{result.totalMarks} ({result.percentage}%)</p></div>
      <div className="mt-5 flex flex-col gap-3 sm:mt-0 sm:flex-row"><Link className="btn-secondary" to="/student/results"><ListChecks size={17} /> All results</Link><button className="btn-primary" type="button" onClick={downloadImage} disabled={downloading}><Download size={17} /> {downloading ? "Preparing image..." : "Download result image"}</button></div>
    </div>
    <div className="mx-auto max-w-2xl"><ResultImageCanvas result={result} /></div>
  </div>;
}
