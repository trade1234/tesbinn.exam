import { useEffect, useState } from "react";
import { Activity, CheckCircle2, ClipboardList, RefreshCw, UserCheck, Users, XCircle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import DataTable from "../components/DataTable.jsx";
import { api } from "../services/api.js";

const periods = [
  { key: "all", label: "All time" },
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" }
];

function Metric({ label, value, icon: Icon, color }) {
  return (
    <div className="card flex items-center justify-between gap-4 p-5">
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-slate-100">{value ?? 0}</p>
      </div>
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color}`}><Icon size={22} /></span>
    </div>
  );
}

const examColumns = [
  { key: "courseName", label: "Course", render: (row) => <div><p className="font-semibold">{row.courseName}</p><p className="text-xs text-slate-400">{row.courseCode || "No code"}</p></div> },
  { key: "students", label: "Students Took Exam" },
  { key: "attempts", label: "Attempts" },
  { key: "passed", label: "Passed", render: (row) => <span className="font-bold text-emerald-600 dark:text-emerald-400">{row.passed}</span> },
  { key: "failed", label: "Failed", render: (row) => <span className="font-bold text-red-600 dark:text-red-400">{row.failed}</span> },
  { key: "inProgress", label: "In Progress" },
  { key: "passRate", label: "Pass Rate", render: (row) => `${row.passRate}%` }
];

const registrationColumns = [
  { key: "courseName", label: "Course", render: (row) => <div><p className="font-semibold">{row.courseName}</p><p className="text-xs text-slate-400">{row.courseCode || "No code"}</p></div> },
  { key: "registered", label: "Registered Students" },
  { key: "active", label: "Active", render: (row) => <span className="font-bold text-emerald-600 dark:text-emerald-400">{row.active}</span> },
  { key: "inactive", label: "Inactive", render: (row) => <span className="font-bold text-slate-500">{row.inactive}</span> }
];

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "—";
}

function statusBadge(status) {
  const colors = {
    PASS: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    FAIL: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
    IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    DISQUALIFIED: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300"
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${colors[status] || "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{String(status || "Unknown").replaceAll("_", " ")}</span>;
}

const examRecordColumns = [
  { key: "studentName", label: "Student", render: (row) => <div><p className="font-semibold">{row.studentName}</p><p className="text-xs text-slate-400">{row.enrollmentNumber || "No student ID"}</p></div> },
  { key: "courseName", label: "Course" },
  { key: "examTitle", label: "Exam" },
  { key: "score", label: "Score", render: (row) => `${row.score ?? 0} (${row.percentage ?? 0}%)` },
  { key: "status", label: "Result", render: (row) => statusBadge(row.status) },
  { key: "date", label: "Exam Date", render: (row) => formatDate(row.date) }
];

const registrationRecordColumns = [
  { key: "studentName", label: "Student", render: (row) => <div><p className="font-semibold">{row.studentName}</p><p className="text-xs text-slate-400">{row.enrollmentNumber || "No student ID"}</p></div> },
  { key: "courseName", label: "Registered Course" },
  { key: "status", label: "Account", render: (row) => <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.status === "Active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{row.status}</span> },
  { key: "registeredAt", label: "Registration Date", render: (row) => formatDate(row.registeredAt) }
];

function ChartCard({ title, description, data, children }) {
  return (
    <section className="card min-w-0 p-4 sm:p-6">
      <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">{title}</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      <div className="mt-6 h-80 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 35 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="courseName" angle={-20} textAnchor="end" interval={0} height={70} tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip cursor={{ fill: "rgba(148,163,184,0.12)" }} />
            <Legend verticalAlign="top" height={36} />
            {children}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default function DataAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("all");

  function load(selectedPeriod = period) {
    setLoading(true);
    setError("");
    api.get("/results/analytics/courses", { params: { period: selectedPeriod } })
      .then((response) => setData(response.data))
      .catch((requestError) => setError(requestError.response?.data?.message || "Could not load data analytics."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(period); }, [period]);

  if (loading) return <div className="card p-8 text-sm text-slate-500">Loading data analytics...</div>;
  if (error) return <div className="card p-8"><p className="text-sm font-semibold text-red-600">{error}</p><button className="btn-primary mt-5" onClick={() => load(period)} type="button"><RefreshCw size={16} /> Retry</button></div>;

  const totals = data?.totals || {};
  const examByCourse = data?.examByCourse || [];
  const registrationsByCourse = data?.registrationsByCourse || [];
  const examRecords = data?.examRecords || [];
  const registrationRecords = data?.registrationRecords || [];

  return (
    <div className="min-w-0 space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-100">Data Analytics</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Exam participation, course performance, and student registration insights.</p>
        </div>
        <button className="btn-secondary" type="button" onClick={() => load(period)}><RefreshCw size={16} /> Refresh</button>
      </div>

      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Analytics period</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Showing {data?.period?.label || "All time"} exam activity and registrations.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Analytics period">
          {periods.map((item) => (
            <button
              key={item.key}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${period === item.key ? "border-[#1e9bf0] bg-[#1e9bf0] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-[#0f88d2] dark:border-slate-700 dark:bg-[#111a2b] dark:text-slate-300"}`}
              type="button"
              aria-pressed={period === item.key}
              onClick={() => setPeriod(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Registered Students" value={totals.registeredStudents} icon={Users} color="bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300" />
        <Metric label="Students Took Exams" value={totals.examTakers} icon={UserCheck} color="bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300" />
        <Metric label="Exam Attempts" value={totals.attempts} icon={ClipboardList} color="bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300" />
        <Metric label="Passed" value={totals.passed} icon={CheckCircle2} color="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300" />
        <Metric label="Failed" value={totals.failed} icon={XCircle} color="bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300" />
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-3"><Activity className="text-[#0f88d2]" size={22} /><div><h2 className="text-xl font-bold text-slate-950 dark:text-slate-100">Online exam performance by course</h2><p className="text-sm text-slate-500 dark:text-slate-400">Unique students who took an exam and the outcome of all their attempts.</p></div></div>
        <ChartCard title="Pass and fail comparison" description="All completed exam attempts grouped by course." data={examByCourse}>
          <Bar dataKey="passed" name="Passed" stackId="results" fill="#10b981" radius={[0, 0, 0, 0]} />
          <Bar dataKey="failed" name="Failed" stackId="results" fill="#ef4444" radius={[6, 6, 0, 0]} />
        </ChartCard>
        <DataTable columns={examColumns} rows={examByCourse} empty="No exam attempts have been recorded yet." />
        <div>
          <h3 className="mb-3 text-lg font-bold text-slate-950 dark:text-slate-100">Student exam data</h3>
          <DataTable columns={examRecordColumns} rows={examRecords} empty={`No student exam data found for ${data?.period?.label || "this period"}.`} />
        </div>
      </section>

      <section className="space-y-4">
        <div><h2 className="text-xl font-bold text-slate-950 dark:text-slate-100">Student registrations by course</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Students assigned to each course, including active and inactive accounts.</p></div>
        <ChartCard title="Course registration comparison" description="Registered students grouped by their assigned training course." data={registrationsByCourse}>
          <Bar dataKey="active" name="Active" stackId="registrations" fill="#0ea5e9" />
          <Bar dataKey="inactive" name="Inactive" stackId="registrations" fill="#94a3b8" radius={[6, 6, 0, 0]} />
        </ChartCard>
        <DataTable columns={registrationColumns} rows={registrationsByCourse} empty="No registered students were found." />
        <div>
          <h3 className="mb-3 text-lg font-bold text-slate-950 dark:text-slate-100">Registered student data</h3>
          <DataTable columns={registrationRecordColumns} rows={registrationRecords} empty={`No student registrations found for ${data?.period?.label || "this period"}.`} />
        </div>
      </section>
    </div>
  );
}
