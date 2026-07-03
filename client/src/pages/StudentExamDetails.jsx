import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, Clock3, FileText, PlayCircle, Scale, ShieldCheck } from "lucide-react";
import { api } from "../services/api.js";

const courseImages = [
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80"
];

export default function StudentExamDetails() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(new Date());
  const exam = useMemo(() => exams.find((item) => item?._id === examId), [exams, examId]);
  const image = courseImages[Math.abs((examId || "").length) % courseImages.length];

  useEffect(() => {
    api.get("/exams").then((res) => setExams(Array.isArray(res.data) ? res.data.filter(Boolean) : []));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(interval);
  }, []);

  if (!exam) {
    return (
      <main className="min-h-screen bg-[#edf4fb] p-4 sm:p-8">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-8 text-center text-slate-500 shadow-[0_18px_45px_rgba(30,41,59,0.07)]">
          Loading exam details...
        </div>
      </main>
    );
  }

  const startDate = new Date(exam.startDate);
  const endDate = new Date(exam.endDate);
  const extraTimeMinutes = exam.extraTimeMinutes || 0;
  const totalDuration = (exam.durationMinutes || 0) + extraTimeMinutes;
  const isBeforeStart = now < startDate;
  const isAfterEnd = now > endDate;
  const isExamOpen = !isBeforeStart && !isAfterEnd && !exam.isPaused;
  const availabilityMessage = exam.isPaused ? "This exam is paused by the administrator." : isBeforeStart ? `This exam starts at ${startDate.toLocaleString()}.` : isAfterEnd ? "This exam has ended." : "Exam is live.";

  async function startExam() {
    setError("");
    if (!isExamOpen) {
      setError(availabilityMessage);
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/exams/start", { examId });
      sessionStorage.setItem("active_exam", JSON.stringify(data));
      navigate(`/student/exam/${data.attempt._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not start the exam.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#edf4fb] px-3 py-4 text-slate-950 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <button className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0f88d2] shadow-sm transition hover:bg-[#f8fbff]" onClick={() => window.close() || navigate("/student/courses")} type="button">
          <ArrowLeft size={18} /> Back to exams
        </button>

        <section className="overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-[0_24px_70px_rgba(30,41,59,0.14)]">
          <div className="relative h-56 overflow-hidden sm:h-80 lg:h-[360px]">
            <img className="h-full w-full object-cover" src={image} alt={`${exam.courseId?.courseName || "Course"} cover`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/5" />
            <div className="absolute bottom-5 left-5 right-5 text-white sm:bottom-9 sm:left-9 sm:right-9">
              <p className="mb-3 inline-flex rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#0f88d2] shadow-sm">{exam.courseId?.courseCode || "COURSE"}</p>
              <h1 className="max-w-3xl break-words text-2xl font-semibold tracking-tight sm:text-5xl">{exam.title}</h1>
              <p className="mt-3 break-words text-base text-white/85 sm:text-xl">{exam.courseId?.courseName}</p>
            </div>
          </div>

          <div className="grid gap-6 p-4 sm:gap-8 sm:p-8 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px] lg:p-10">
            <div className="space-y-7 sm:space-y-9">
              <section>
                <h2 className="text-xl font-semibold text-slate-950 sm:text-2xl">About This Exam</h2>
                <p className="mt-4 max-w-4xl leading-8 text-slate-600">
                  {exam.description || "Read all questions carefully. The timer starts only when this exam is live and you press Start Exam. Your answers are saved automatically while you move through the exam."}
                </p>
                <div className={`mt-5 rounded-2xl px-4 py-3 text-sm font-semibold ${isExamOpen ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {availabilityMessage}
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl bg-[#edf6ff] p-4 sm:rounded-2xl sm:p-5">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#0f88d2]"><Clock3 size={17} /> Duration</div>
                    <p className="text-xl font-semibold text-slate-950 sm:text-2xl">{totalDuration} min</p>
                    {extraTimeMinutes > 0 && <p className="mt-1 text-sm font-semibold text-amber-700">Includes +{extraTimeMinutes} min extra</p>}
                  </div>
                  <div className="rounded-xl bg-[#eefbf4] p-4 sm:rounded-2xl sm:p-5">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-700"><Scale size={17} /> Exam Weight</div>
                    <p className="text-xl font-semibold text-slate-950 sm:text-2xl">{exam.totalMarks} marks</p>
                  </div>
                  <div className="rounded-xl bg-[#fff7ed] p-4 sm:rounded-2xl sm:p-5">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-orange-700"><Clock3 size={17} /> Start Time</div>
                    <p className="break-words font-semibold text-slate-950">{startDate.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl bg-[#fdf2f8] p-4 sm:rounded-2xl sm:p-5">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-pink-700"><CalendarDays size={17} /> End Time</div>
                    <p className="break-words font-semibold text-slate-950">{endDate.toLocaleString()}</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-950 sm:text-2xl">Exam Policy</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {[
                    "Cheating, copying, screenshots, outside help, or using unauthorized materials is not allowed.",
                    "Opening another tab, refreshing, or closing the exam page may interrupt your attempt.",
                    "The timer begins when you click Start Exam and continues until the duration or admin end time is reached.",
                    "Answers are auto-saved, but you should still submit before the timer ends.",
                    "Use Clear Choice if you want to remove an answer and select another option.",
                    "Final score is calculated immediately after submission based on the answer key."
                  ].map((item, index) => (
                    <div key={item} className="flex gap-3 rounded-xl border border-slate-100 bg-white p-4 sm:rounded-2xl shadow-sm">
                      {index === 0 ? <AlertTriangle className="mt-0.5 shrink-0 text-red-500" size={19} /> : <CheckCircle2 className="mt-0.5 shrink-0 text-[#1e9bf0]" size={19} />}
                      <p className="text-sm leading-6 text-slate-600">{item}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <aside className="min-w-0 rounded-xl bg-[#f8fbff] p-4 sm:rounded-2xl sm:p-5 lg:sticky lg:top-6 lg:self-start">
              <h3 className="text-lg font-semibold text-slate-950">Exam Summary</h3>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-white p-3"><span className="flex items-center gap-2 text-slate-500"><Clock3 size={16} /> Duration</span><strong>{totalDuration} min</strong></div>
                {extraTimeMinutes > 0 && <div className="flex items-center justify-between gap-3 rounded-xl bg-white p-3"><span className="flex items-center gap-2 text-slate-500"><Clock3 size={16} /> Extra Time</span><strong className="text-amber-600">+{extraTimeMinutes} min</strong></div>}
                <div className="flex items-center justify-between gap-3 rounded-xl bg-white p-3"><span className="flex items-center gap-2 text-slate-500"><Scale size={16} /> Weight</span><strong>{exam.totalMarks} marks</strong></div>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-white p-3"><span className="flex items-center gap-2 text-slate-500"><ShieldCheck size={16} /> Pass</span><strong>{exam.passPercentage}%</strong></div>
                <div className="rounded-xl bg-white p-3"><span className="flex items-center gap-2 text-slate-500"><CalendarDays size={16} /> Starts</span><strong className="mt-1 block break-words">{startDate.toLocaleString()}</strong></div>
                <div className="rounded-xl bg-white p-3"><span className="flex items-center gap-2 text-slate-500"><FileText size={16} /> Ends</span><strong className="mt-1 block break-words">{endDate.toLocaleString()}</strong></div>
              </div>
              {error && <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
              <button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1e9bf0] px-5 py-4 text-base font-semibold text-white transition hover:bg-[#0f88d2] disabled:cursor-not-allowed disabled:bg-slate-300" onClick={startExam} disabled={loading || !isExamOpen}>
                <PlayCircle size={20} /> {loading ? "Starting..." : isExamOpen ? "Start Exam" : exam.isPaused ? "Exam paused" : isBeforeStart ? "Waiting for start time" : "Exam ended"}
              </button>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}


