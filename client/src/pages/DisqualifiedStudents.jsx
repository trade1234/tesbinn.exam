import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldAlert } from "lucide-react";
import DataTable from "../components/DataTable.jsx";
import { api } from "../services/api.js";

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "Not recorded";
}

export default function DisqualifiedStudents() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/results/disqualification-history");
      setRows(Array.isArray(data) ? data.filter(Boolean) : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not load disqualified students.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: "student", label: "Student", render: (row) => <div><p className="font-semibold text-slate-950 dark:text-slate-100">{row.studentId?.name || "Unknown"}</p><p className="font-mono text-xs text-slate-500">{row.studentId?.enrollmentNumber || row.studentId?.email || ""}</p></div> },
    { key: "course", label: "Course", render: (row) => row.examId?.courseId?.courseName || "Unknown" },
    { key: "exam", label: "Exam", render: (row) => row.examId?.title || "Unknown" },
    { key: "count", label: "Times Disqualified", render: (row) => row.disqualificationCount || 1 },
    { key: "disqualifiedAt", label: "Last Disqualified", render: (row) => formatDate(row.lastDisqualifiedAt || (row.status === "DISQUALIFIED" ? row.submittedAt : null)) },
    { key: "retake", label: "Retake History", render: (row) => row.retakeGrantedAt ? <div><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">Retake approved</span><p className="mt-1 text-xs text-slate-500">{formatDate(row.retakeGrantedAt)}</p></div> : <span className="text-xs font-semibold text-slate-500">Not approved</span> },
    { key: "currentStatus", label: "Current Status", render: (row) => <span className={`rounded-full px-3 py-1 text-xs font-bold ${row.status === "DISQUALIFIED" ? "bg-red-100 text-red-700" : row.status === "PASS" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>{row.status}</span> }
  ];

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-950 dark:text-slate-100"><ShieldAlert className="text-red-600" /> Disqualified Students</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Permanent read-only history. Students remain listed after a retake or final result.</p>
        </div>
        <button className="btn-secondary" type="button" onClick={load} disabled={loading}><RefreshCw size={16} /> Refresh</button>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">This page is audit-only. Records cannot be edited, deleted, or approved for retake here.</div>
      {error && <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
      {loading ? <div className="card p-8 text-center text-slate-500">Loading disqualification history...</div> : <DataTable columns={columns} rows={rows} empty="No students have been disqualified." />}
    </div>
  );
}
