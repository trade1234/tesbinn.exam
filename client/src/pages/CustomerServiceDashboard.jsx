import { useEffect, useState } from "react";
import { CalendarClock, ClipboardList, Headset, PlayCircle, Plus, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import DataTable from "../components/DataTable.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : "Not set";
}

function examPhase(exam, now) {
  const start = exam.startDate ? new Date(exam.startDate) : null;
  const end = exam.endDate ? new Date(exam.endDate) : null;
  if (exam.isPaused) return "paused";
  if (start && end && now >= start && now <= end) return "live";
  if (start && now < start) return "upcoming";
  return "ended";
}

const PHASE_STYLES = {
  live: "bg-emerald-100 text-emerald-700",
  upcoming: "bg-amber-100 text-amber-700",
  paused: "bg-orange-100 text-orange-700",
  ended: "bg-slate-100 text-slate-600"
};

function Stat({ label, value, icon: Icon, to, tone }) {
  return (
    <Link to={to} className="card flex items-center gap-4 p-5 transition hover:-translate-y-0.5">
      <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${tone}`}><Icon size={22} /></span>
      <div><p className="text-sm font-semibold text-slate-500">{label}</p><p className="text-3xl font-bold text-slate-950 dark:text-slate-100">{value}</p></div>
    </Link>
  );
}

export default function CustomerServiceDashboard() {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [retakes, setRetakes] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/exams"), api.get("/results/disqualified")])
      .then(([examRes, retakeRes]) => {
        setExams(Array.isArray(examRes.data) ? examRes.data : []);
        setRetakes(Array.isArray(retakeRes.data) ? retakeRes.data.filter(Boolean) : []);
      })
      .catch((requestError) => setError(requestError.response?.data?.message || "Could not load dashboard."));
  }, []);

  const now = new Date();
  const withPhase = exams.map((exam) => ({ ...exam, phase: examPhase(exam, now) }));
  const live = withPhase.filter((exam) => exam.phase === "live");
  const upcoming = withPhase.filter((exam) => exam.phase === "upcoming").sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-950 dark:text-slate-100"><Headset className="text-blue-700" /> Customer Service</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Welcome{user?.name ? `, ${user.name}` : ""}. Create and schedule exams, and approve retakes for disqualified students.</p>
        </div>
        <div className="flex gap-2">
          <Link className="btn-secondary" to="/support/retakes"><RotateCcw size={16} /> Retakes</Link>
          <Link className="btn-primary" to="/support/exams"><Plus size={16} /> Create / schedule exam</Link>
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total exams" value={exams.length} icon={ClipboardList} to="/support/exams" tone="bg-[#f5f3ff] text-[#8b5cf6]" />
        <Stat label="Live now" value={live.length} icon={PlayCircle} to="/support/exams" tone="bg-emerald-50 text-emerald-600" />
        <Stat label="Upcoming" value={upcoming.length} icon={CalendarClock} to="/support/exams" tone="bg-amber-50 text-amber-600" />
        <Stat label="Pending retakes" value={retakes.length} icon={RotateCcw} to="/support/retakes" tone="bg-red-50 text-red-600" />
      </div>

      <section className="space-y-3">
        <h3 className="text-lg font-bold">Upcoming and live exams</h3>
        <DataTable
          rows={[...live, ...upcoming]}
          empty="No live or upcoming exams. Schedule one from Exams."
          columns={[
            { key: "title", label: "Exam" },
            { key: "course", label: "Course", render: (row) => row.courseId?.courseName || "--" },
            { key: "phase", label: "Status", render: (row) => <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${PHASE_STYLES[row.phase]}`}>{row.phase}</span> },
            { key: "startDate", label: "Starts", render: (row) => formatDateTime(row.startDate) },
            { key: "endDate", label: "Ends", render: (row) => formatDateTime(row.endDate) }
          ]}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between"><h3 className="text-lg font-bold">Students waiting for a retake</h3><Link className="text-sm font-semibold text-blue-700 hover:underline" to="/support/retakes">Review all</Link></div>
        <DataTable
          rows={retakes.slice(0, 5)}
          empty="No disqualified students are waiting for a retake."
          columns={[
            { key: "student", label: "Student", render: (row) => row.studentId?.name || "Unknown" },
            { key: "exam", label: "Exam", render: (row) => row.examId?.title || "Unknown" },
            { key: "date", label: "Disqualified at", render: (row) => formatDateTime(row.submittedAt) }
          ]}
        />
      </section>
    </div>
  );
}
