import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, BookOpen, ClipboardList, FileBarChart, GraduationCap, Radio, RefreshCw, Users } from "lucide-react";
import { api } from "../services/api.js";
import logoUrl from "../logo/download.png";

const covers = [
  "bg-[linear-gradient(135deg,#ff7a18,#e11d48,#f59e0b)]",
  "bg-[linear-gradient(135deg,#c7e9ff,#f8fafc_55%,#dbeafe)]",
  "bg-[linear-gradient(135deg,#0f766e,#22c55e,#065f46)]"
];

function SummaryCard({ label, value, icon: Icon, color, to }) {
  return (
    <Link to={to} className="block min-w-0 rounded-xl bg-white p-4 text-slate-950 sm:p-6 shadow-[0_18px_45px_rgba(30,41,59,0.07)] transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(30,41,59,0.12)] focus:outline-none focus:ring-2 focus:ring-[#1e9bf0] dark:bg-[#111a2b] dark:text-slate-100 dark:shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
      <div className="flex min-w-0 items-center justify-between gap-3 sm:gap-4">
        <div>
          <p className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight sm:text-4xl">{value ?? 0}</p>
          <p className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-[#0f88d2]">Open <ArrowRight size={13} /></p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
          <Icon size={23} />
        </div>
      </div>
    </Link>
  );
}

function CoursePanel({ title, description, index, progress, to }) {
  return (
    <Link to={to} className="block min-w-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e9bf0]">
      <div className="overflow-hidden rounded-xl bg-white shadow-[0_18px_45px_rgba(30,41,59,0.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(30,41,59,0.12)] dark:bg-[#111a2b] dark:shadow-[0_18px_45px_rgba(0,0,0,0.24)]">
        <div className={`h-36 ${covers[index % covers.length]}`} />
        <div className="p-5 sm:p-7">
          <h3 className="break-words text-lg font-semibold text-slate-950 sm:text-xl dark:text-slate-100">{title}</h3>
          <p className="mt-5 min-h-16 text-sm leading-7 text-slate-500 dark:text-slate-400">{description}</p>
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#edf6ff] px-3 py-2 text-sm font-bold text-[#0f88d2] dark:bg-[#17324d] dark:text-[#7dd3fc]">Open Section <ArrowRight size={15} /></span>
            <div className="flex -space-x-3">
              {["#f97316", "#64748b", "#0ea5e9", "#ec4899"].map((color, avatarIndex) => (
                <span key={color} className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white dark:border-[#111a2b]" style={{ backgroundColor: color }}>{avatarIndex + 1}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-5 rounded-xl bg-white p-5 sm:p-7 shadow-[0_18px_45px_rgba(30,41,59,0.07)] dark:bg-[#111a2b] dark:shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
        <div className="flex items-center gap-5">
          <div className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-1.5 rounded-full bg-[#1e9bf0]" style={{ width: `${progress}%` }} />
          </div>
          <span className="font-semibold text-slate-500 dark:text-slate-400">{progress}%</span>
        </div>
      </div>
    </Link>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function loadAnalytics() {
    setLoading(true);
    setError("");
    api.get("/results/analytics")
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load admin dashboard data."))
      .finally(() => setLoading(false));
  }

  useEffect(loadAnalytics, []);

  const totals = data?.totals || {};
  const monthlyExams = data?.monthlyExams?.length ? data.monthlyExams : [{ month: "No data", attempts: 0 }];
  const studentPerformance = data?.studentPerformance?.some((item) => item.value > 0) ? data.studentPerformance : [
    { name: "Passed", value: 0 },
    { name: "Failed", value: 1 }
  ];
  const panels = [
    { title: "Course Management", description: "Create, update, and organize academic courses before exams are assigned.", progress: 76, to: "/admin/courses" },
    { title: "Exam Control", description: "Schedule examinations, duration, availability windows, pass marks, and question sets.", progress: 52, to: "/admin/exams" },
    { title: "Student Results", description: "Review attempts, performance, pass rates, and export reports for academic teams.", progress: data?.passRate || 0, to: "/admin/results" }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl text-slate-950 dark:text-slate-100">Admin Dashboard</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base dark:text-slate-400">Loading dashboard data...</p>
        </div>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-32 animate-pulse rounded-xl bg-white shadow-[0_18px_45px_rgba(30,41,59,0.07)] dark:bg-[#111a2b]" />)}
        </div>
        <div className="h-80 animate-pulse rounded-xl bg-white shadow-[0_18px_45px_rgba(30,41,59,0.07)] dark:bg-[#111a2b]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-white p-8 shadow-[0_18px_45px_rgba(30,41,59,0.07)] dark:border-red-900/40 dark:bg-[#111a2b]">
        <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-100">Admin Dashboard</h1>
        <p className="mt-3 text-sm text-red-600 dark:text-red-300">{error}</p>
        <button className="btn-primary mt-5" type="button" onClick={loadAnalytics}><RefreshCw size={16} /> Retry</button>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6 rounded-xl bg-[#f8fbff] p-3 text-slate-950 dark:bg-[#0f172a] dark:text-slate-100 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
          <div className="logo-tile flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-100 bg-white p-1.5 shadow-sm dark:border-white/70 dark:bg-white">
            <img className="h-full w-full object-contain" src={logoUrl} alt="Trade Ethiopia logo" />
          </div>
          <div>
            <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl text-slate-950 dark:text-slate-100">Admin Dashboard</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base dark:text-slate-400">Overview of students, courses, exams, and performance.</p>
          </div>
        </div>
        <Link to="/admin/monitor" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 sm:w-auto sm:px-5 sm:py-4 text-base font-bold text-[#0f88d2] shadow-[0_18px_45px_rgba(30,41,59,0.07)] transition hover:bg-[#edf6ff] dark:bg-[#111a2b] dark:text-[#7dd3fc] dark:hover:bg-[#17324d]">
          <Radio size={18} /> Live Monitor
        </Link>
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Students" value={totals.students} icon={Users} color="bg-[#edf6ff] text-[#0f88d2]" to="/admin/students" />
        <SummaryCard label="Courses" value={totals.courses} icon={BookOpen} color="bg-[#fff7ed] text-[#f97316]" to="/admin/courses" />
        <SummaryCard label="Exams" value={totals.exams} icon={ClipboardList} color="bg-[#f5f3ff] text-[#8b5cf6]" to="/admin/exams" />
        <SummaryCard label="Attempts" value={totals.attempts} icon={GraduationCap} color="bg-[#fdf2f8] text-[#ec4899]" to="/admin/results" />
      </div>

      <div className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-3 xl:gap-9">
        {panels.map((panel, index) => <CoursePanel key={panel.title} index={index} {...panel} />)}
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.75fr)] xl:gap-8">
        <Link to="/admin/results" className="block min-w-0 rounded-xl bg-white p-4 sm:p-7 shadow-[0_18px_45px_rgba(30,41,59,0.07)] transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(30,41,59,0.12)] focus:outline-none focus:ring-2 focus:ring-[#1e9bf0] dark:bg-[#111a2b] dark:shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
          <h2 className="flex items-center justify-between gap-3 text-lg sm:text-xl font-semibold text-slate-950 dark:text-slate-100">Monthly Exams <FileBarChart size={20} className="text-[#0f88d2]" /></h2>
          <div className="mt-6 h-64 min-w-0 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyExams}>
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="attempts" fill="#1e9bf0" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Link>
        <Link to="/admin/results" className="block min-w-0 rounded-xl bg-white p-4 sm:p-7 shadow-[0_18px_45px_rgba(30,41,59,0.07)] transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(30,41,59,0.12)] focus:outline-none focus:ring-2 focus:ring-[#1e9bf0] dark:bg-[#111a2b] dark:shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
          <h2 className="flex items-center justify-between gap-3 text-lg sm:text-xl font-semibold text-slate-950 dark:text-slate-100">Pass Rate <FileBarChart size={20} className="text-[#0f88d2]" /></h2>
          <p className="mt-3 text-4xl sm:text-5xl font-semibold text-[#1e9bf0]">{data?.passRate || 0}%</p>
          <div className="mt-5 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={studentPerformance} dataKey="value" nameKey="name" outerRadius={82} label>
                  <Cell fill="#22c55e" />
                  <Cell fill="#f97316" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Link>
      </div>
    </div>
  );
}








