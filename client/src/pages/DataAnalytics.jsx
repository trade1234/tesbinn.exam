import { useEffect, useMemo, useState } from "react";
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

const monthOptions = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function localDateValue(now = new Date()) {
  const eastAfrica = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  return `${eastAfrica.getUTCFullYear()}-${String(eastAfrica.getUTCMonth() + 1).padStart(2, "0")}-${String(eastAfrica.getUTCDate()).padStart(2, "0")}`;
}

function periodRange(period, anchor, now = new Date()) {
  if (period === "all") return null;
  const eastAfricaOffsetMs = 3 * 60 * 60 * 1000;
  const localNow = new Date(now.getTime() + eastAfricaOffsetMs);
  const match = String(anchor).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  let year = match ? Number(match[1]) : localNow.getUTCFullYear();
  let month = match ? Number(match[2]) - 1 : localNow.getUTCMonth();
  let day = match ? Number(match[3]) : localNow.getUTCDate();

  if (period === "weekly") day -= (new Date(Date.UTC(year, month, day)).getUTCDay() + 6) % 7;
  if (period === "monthly") day = 1;
  if (period === "yearly") { month = 0; day = 1; }
  const start = new Date(Date.UTC(year, month, day) - eastAfricaOffsetMs);
  let end;
  if (period === "daily") end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  if (period === "weekly") end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (period === "monthly") end = new Date(Date.UTC(year, month + 1, 1) - eastAfricaOffsetMs);
  if (period === "yearly") end = new Date(Date.UTC(year + 1, 0, 1) - eastAfricaOffsetMs);
  return { start, end };
}

function recordsForPeriod(records, dateKey, period, anchor) {
  const range = periodRange(period, anchor);
  if (!range) return records;
  return records.filter((record) => {
    const timestamp = new Date(record?.[dateKey]).getTime();
    return Number.isFinite(timestamp) && timestamp >= range.start.getTime() && timestamp < range.end.getTime();
  });
}

function periodLabel(period, anchor) {
  const range = periodRange(period, anchor);
  if (period === "daily") return anchor === localDateValue() ? "Today" : range.start.toLocaleDateString("en-US", { timeZone: "Africa/Nairobi", year: "numeric", month: "long", day: "numeric" });
  if (period === "weekly") return `Week of ${range.start.toLocaleDateString("en-US", { timeZone: "Africa/Nairobi", year: "numeric", month: "short", day: "numeric" })}`;
  if (period === "monthly") return range.start.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "Africa/Nairobi" });
  if (period === "yearly") return range.start.toLocaleString("en-US", { year: "numeric", timeZone: "Africa/Nairobi" });
  return "All time";
}

function enforcePeriod(responseData, period, anchor) {
  const allExamRecords = responseData?.examRecords || [];
  const allRegistrationRecords = responseData?.registrationRecords || [];
  const examRecords = recordsForPeriod(allExamRecords, "date", period, anchor);
  const registrationRecords = recordsForPeriod(allRegistrationRecords, "submittedAt", period, anchor);

  const examMap = new Map((responseData?.examByCourse || []).map((row) => [row.courseName, {
    ...row, studentKeys: new Set(), students: 0, attempts: 0, passed: 0, failed: 0, inProgress: 0, disqualified: 0, passRate: 0
  }]));
  examRecords.forEach((record) => {
    if (!examMap.has(record.courseName)) examMap.set(record.courseName, { courseName: record.courseName, courseCode: record.courseCode || "", studentKeys: new Set(), students: 0, attempts: 0, passed: 0, failed: 0, inProgress: 0, disqualified: 0, passRate: 0 });
    const row = examMap.get(record.courseName);
    row.studentKeys.add(record.enrollmentNumber || record.studentName);
    row.attempts += 1;
    if (record.status === "PASS") row.passed += 1;
    if (record.status === "FAIL") row.failed += 1;
    if (record.status === "IN_PROGRESS") row.inProgress += 1;
    if (record.status === "DISQUALIFIED") row.disqualified += 1;
  });
  const examByCourse = [...examMap.values()].map(({ studentKeys, ...row }) => ({
    ...row,
    students: studentKeys.size,
    passRate: row.passed + row.failed ? Math.round((row.passed / (row.passed + row.failed)) * 100) : 0
  }));

  const registrationMap = new Map((responseData?.registrationsByCourse || []).map((row) => [row.courseName, { ...row, registered: 0, approved: 0, pending: 0, rejected: 0 }]));
  registrationRecords.forEach((record) => {
    if (!registrationMap.has(record.courseName)) registrationMap.set(record.courseName, { courseName: record.courseName, courseCode: "", registered: 0, approved: 0, pending: 0, rejected: 0 });
    const row = registrationMap.get(record.courseName);
    row.registered += 1;
    if (record.status === "APPROVED") row.approved += 1;
    else if (record.status === "REJECTED") row.rejected += 1;
    else row.pending += 1;
  });

  return {
    ...responseData,
    totals: {
      registeredStudents: registrationRecords.length,
      applications: registrationRecords.length,
      examTakers: new Set(examRecords.map((record) => record.enrollmentNumber || record.studentName)).size,
      attempts: examRecords.length,
      passed: examRecords.filter((record) => record.status === "PASS").length,
      failed: examRecords.filter((record) => record.status === "FAIL").length
    },
    examByCourse,
    registrationsByCourse: [...registrationMap.values()],
    examRecords,
    registrationRecords
  };
}

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
  { key: "registered", label: "Applications" },
  { key: "approved", label: "Approved", render: (row) => <span className="font-bold text-emerald-600 dark:text-emerald-400">{row.approved}</span> },
  { key: "pending", label: "Pending", render: (row) => <span className="font-bold text-amber-600 dark:text-amber-400">{row.pending}</span> },
  { key: "rejected", label: "Rejected", render: (row) => <span className="font-bold text-red-600 dark:text-red-400">{row.rejected}</span> }
];

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "—";
}

function statusBadge(status) {
  const colors = {
    PASS: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    FAIL: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
    IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    DISQUALIFIED: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
    APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    REJECTED: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
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
  { key: "applicantName", label: "Applicant", render: (row) => <div><p className="font-semibold">{row.applicantName || "Unknown applicant"}</p><p className="text-xs text-slate-400">{row.applicationNumber || "No application number"}</p></div> },
  { key: "phoneNumber", label: "Phone" },
  { key: "courseName", label: "Training Program" },
  { key: "status", label: "Application Status", render: (row) => statusBadge(row.status) },
  { key: "submittedAt", label: "Submitted Date", render: (row) => formatDate(row.submittedAt) }
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
  const today = localDateValue();
  const currentYear = Number(today.slice(0, 4));
  const [period, setPeriod] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(Number(today.slice(5, 7)));
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const yearOptions = Array.from({ length: currentYear - 1999 }, (_, index) => currentYear - index);
  const anchor = period === "daily" || period === "weekly"
    ? selectedDate
    : period === "monthly"
      ? `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`
      : period === "yearly" ? `${selectedYear}-01-01` : "";

  function load(selectedPeriod = period, selectedAnchor = anchor) {
    setLoading(true);
    setError("");
    api.get("/results/analytics/courses", {
      params: { period: selectedPeriod, anchor: selectedAnchor, _ts: Date.now() }
    })
      .then((response) => setData(response.data))
      .catch((requestError) => setError(requestError.response?.data?.message || "Could not load data analytics."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(period, anchor); }, [period, anchor]);

  const filteredData = useMemo(() => enforcePeriod(data, period, anchor), [data, period, anchor]);
  const selectedPeriodLabel = periodLabel(period, anchor);

  if (loading) return <div className="card p-8 text-sm text-slate-500">Loading data analytics...</div>;
  if (error) return <div className="card p-8"><p className="text-sm font-semibold text-red-600">{error}</p><button className="btn-primary mt-5" onClick={() => load(period, anchor)} type="button"><RefreshCw size={16} /> Retry</button></div>;

  const totals = filteredData?.totals || {};
  const examByCourse = filteredData?.examByCourse || [];
  const registrationsByCourse = filteredData?.registrationsByCourse || [];
  const examRecords = filteredData?.examRecords || [];
  const registrationRecords = filteredData?.registrationRecords || [];

  return (
    <div className="min-w-0 space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-100">Data Analytics</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Exam participation, course performance, and student registration insights.</p>
        </div>
        <button className="btn-secondary" type="button" onClick={() => load(period, anchor)}><RefreshCw size={16} /> Refresh</button>
      </div>

      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Analytics period</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Showing {selectedPeriodLabel} exam activity and registrations.</p>
        </div>
        <div className="grid gap-2 sm:grid-flow-col sm:auto-cols-max" aria-label="Analytics period filters">
          <label className="grid gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
            Period
            <select className="input min-w-36" value={period} onChange={(event) => setPeriod(event.target.value)}>
              {periods.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
          </label>
          {(period === "daily" || period === "weekly") && (
            <label className="grid gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
              {period === "daily" ? "Date" : "Week containing"}
              <input className="input" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
            </label>
          )}
          {period === "monthly" && (
            <label className="grid gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
              Month
              <select className="input min-w-36" value={selectedMonth} onChange={(event) => setSelectedMonth(Number(event.target.value))}>
                {monthOptions.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
              </select>
            </label>
          )}
          {(period === "monthly" || period === "yearly") && (
            <label className="grid gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
              Year
              <select className="input min-w-28" value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>
                {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Applications" value={totals.applications ?? totals.registeredStudents} icon={Users} color="bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300" />
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
          <DataTable columns={examRecordColumns} rows={examRecords} empty={`No student exam data found for ${selectedPeriodLabel}.`} />
        </div>
      </section>

      <section className="space-y-4">
        <div><h2 className="text-xl font-bold text-slate-950 dark:text-slate-100">Applications by training program</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Registration data comes directly from the Applications sidebar.</p></div>
        <ChartCard title="Application status by program" description="Pending, approved, and rejected applications grouped by training program." data={registrationsByCourse}>
          <Bar dataKey="approved" name="Approved" stackId="registrations" fill="#10b981" />
          <Bar dataKey="pending" name="Pending" stackId="registrations" fill="#f59e0b" />
          <Bar dataKey="rejected" name="Rejected" stackId="registrations" fill="#ef4444" radius={[6, 6, 0, 0]} />
        </ChartCard>
        <DataTable columns={registrationColumns} rows={registrationsByCourse} empty="No applications were found." />
        <div>
          <h3 className="mb-3 text-lg font-bold text-slate-950 dark:text-slate-100">Application registration data</h3>
          <DataTable columns={registrationRecordColumns} rows={registrationRecords} empty={`No applications found for ${selectedPeriodLabel}.`} />
        </div>
      </section>
    </div>
  );
}
