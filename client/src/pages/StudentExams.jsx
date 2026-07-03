import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, Clock3, ExternalLink, ShieldCheck } from "lucide-react";
import { api } from "../services/api.js";

const courseImages = [
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&q=80"
];

const progressColors = ["bg-[#5b8def]", "bg-[#ee845e]", "bg-[#56dd70]", "bg-[#1e9bf0]"];

function getAvailability(exam, now) {
  const start = exam.startDate ? new Date(exam.startDate) : null;
  const end = exam.endDate ? new Date(exam.endDate) : null;

  if (exam.isPaused) {
    return { isOpen: false, label: "Paused by admin", badge: "Paused", badgeClass: "bg-orange-50 text-orange-700" };
  }
  if (start && now < start) {
    return { isOpen: false, label: `Starts ${start.toLocaleString()}`, badge: "Scheduled", badgeClass: "bg-amber-50 text-amber-700" };
  }
  if (end && now > end) {
    return { isOpen: false, label: "Exam ended", badge: "Ended", badgeClass: "bg-slate-100 text-slate-600" };
  }
  return { isOpen: true, label: "Open Exam", badge: "Live", badgeClass: "bg-emerald-50 text-emerald-700" };
}

function ExamCard({ exam, index, now, onOpen }) {
  const progress = [76, 32, 46, 64][index % 4];
  const image = courseImages[index % courseImages.length];
  const start = exam.startDate ? new Date(exam.startDate) : null;
  const end = exam.endDate ? new Date(exam.endDate) : null;
  const extraTimeMinutes = exam.extraTimeMinutes || 0;
  const totalDuration = (exam.durationMinutes || 0) + extraTimeMinutes;
  const availability = getAvailability(exam, now);

  return (
    <div>
      <article className="overflow-hidden rounded-xl bg-white shadow-[0_18px_45px_rgba(30,41,59,0.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(30,41,59,0.12)] dark:bg-[#111a2b] dark:shadow-[0_18px_45px_rgba(0,0,0,0.24)]">
        <div className="relative h-40 overflow-hidden">
          <img className="h-full w-full object-cover" src={image} alt={`${exam.courseId?.courseName || "Course"} cover`} loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
          <div className="absolute left-5 top-5 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#0f88d2] shadow-sm dark:bg-[#111a2b]/95 dark:text-[#7dd3fc]">
            {exam.courseId?.courseCode || "COURSE"}
          </div>
          <div className={`absolute right-5 top-5 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${availability.badgeClass}`}>
            {availability.badge}
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-7">
          <h3 className="break-words text-lg font-semibold sm:text-xl text-slate-950 dark:text-slate-100">{exam.title}</h3>
          <p className="mt-2 text-sm font-medium text-[#0f88d2] dark:text-[#7dd3fc]">{exam.courseId?.courseName}</p>
          <p className="mt-5 min-h-16 text-sm leading-7 text-slate-500 dark:text-slate-400">
            {exam.description || "Review the instructions, check your time, and start the examination when it is live."}
          </p>

          <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg bg-[#edf6ff] p-3 text-slate-700 dark:bg-[#17324d] dark:text-slate-200">
              <div className="mb-1 flex items-center gap-2 font-semibold"><Clock3 size={16} /> Duration</div>
              <p>{totalDuration} minutes</p>
              {extraTimeMinutes > 0 && <p className="mt-1 text-xs font-semibold text-amber-600 dark:text-amber-400">+{extraTimeMinutes} min extra</p>}
            </div>
            <div className="rounded-lg bg-[#fff7ed] p-3 text-slate-700 dark:bg-[#3a2617] dark:text-slate-200">
              <div className="mb-1 flex items-center gap-2 font-semibold"><ShieldCheck size={16} /> Pass mark</div>
              <p>{exam.passPercentage}%</p>
            </div>
          </div>

          <div className="mt-5 space-y-2 break-words text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2"><CalendarDays size={16} /> Starts: {start ? start.toLocaleString() : "Available now"}</div>
            <div className="flex items-center gap-2"><Clock3 size={16} /> Ends: {end ? end.toLocaleString() : "Not set"}</div>
          </div>

          <button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1e9bf0] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0f88d2] disabled:cursor-not-allowed disabled:bg-slate-300" onClick={() => onOpen(exam._id, availability.isOpen)} disabled={!availability.isOpen}>
            <ExternalLink size={18} /> {availability.label}
          </button>
        </div>
      </article>

      <div className="mt-4 rounded-xl bg-white p-4 shadow-[0_18px_45px_rgba(30,41,59,0.07)] dark:bg-[#111a2b] dark:shadow-[0_18px_45px_rgba(0,0,0,0.22)] sm:p-6 lg:p-7">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
            <div className={`h-1.5 rounded-full ${progressColors[index % progressColors.length]}`} style={{ width: `${progress}%` }} />
          </div>
          <span className="font-semibold text-slate-500 dark:text-slate-400">{progress}%</span>
        </div>
      </div>
    </div>
  );
}

export default function StudentExams() {
  const [exams, setExams] = useState([]);
  const [now, setNow] = useState(new Date());
  const [filter, setFilter] = useState("all");

  useEffect(() => { api.get("/exams").then((res) => setExams(Array.isArray(res.data) ? res.data.filter(Boolean) : [])); }, []);
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
      api.get("/exams").then((res) => setExams(Array.isArray(res.data) ? res.data.filter(Boolean) : []));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const visibleExams = useMemo(() => {
    if (filter === "active") return exams.filter((exam) => getAvailability(exam, now).isOpen);
    if (filter === "upcoming") return exams.filter((exam) => {
      const start = exam.startDate ? new Date(exam.startDate) : null;
      return start && now < start;
    });
    if (filter === "completed") return exams.filter((exam) => {
      const end = exam.endDate ? new Date(exam.endDate) : null;
      return end && now > end;
    });
    return exams;
  }, [exams, filter, now]);

  function openExam(examId, isOpen) {
    if (!isOpen) return;
    window.open(`/#/student/exams/${examId}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="min-w-0 space-y-6 sm:space-y-10">
      <div className="flex min-w-0 flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl text-slate-950 dark:text-slate-100">Exams</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">Open an exam only after the admin start time has arrived and before the end time.</p>
        </div>
        <select className="w-full rounded-lg border-0 bg-white px-5 py-4 text-base shadow-[0_18px_45px_rgba(30,41,59,0.07)] outline-none dark:bg-[#111a2b] dark:text-slate-100 sm:w-44" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">All exams</option>
          <option value="active">Available now</option>
        </select>
      </div>

      <div className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-3 xl:gap-9">
        {visibleExams.filter(Boolean).map((exam, index) => <ExamCard key={exam._id} exam={exam} index={index} now={now} onOpen={openExam} />)}
      </div>

      {!visibleExams.length && (
        <div className="rounded-xl bg-white p-8 text-center text-slate-500 shadow-[0_18px_45px_rgba(30,41,59,0.07)] dark:bg-[#111a2b] dark:text-slate-400">
          {filter === "active" ? "No active exams are live right now." : filter === "upcoming" ? "No upcoming exams are scheduled." : filter === "completed" ? "No completed exams yet." : "No exams are available yet."}
        </div>
      )}
    </div>
  );
}







