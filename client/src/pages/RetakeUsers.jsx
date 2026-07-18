import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RotateCcw, ShieldCheck } from "lucide-react";
import DataTable from "../components/DataTable.jsx";
import Modal from "../components/Modal.jsx";
import { api } from "../services/api.js";

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "Not recorded";
}

export default function RetakeUsers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grantingId, setGrantingId] = useState("");
  const [message, setMessage] = useState("");
  const [confirmTarget, setConfirmTarget] = useState(null);

  const loadDisqualified = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/results/disqualified");
      setRows(Array.isArray(data) ? data.filter(Boolean) : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDisqualified(); }, [loadDisqualified]);

  async function grantRetake() {
    const row = confirmTarget;
    if (!row?._id) return;
    const studentName = row.studentId?.name || "this student";
    setGrantingId(row._id);
    setMessage("");
    try {
      await api.post(`/exams/attempts/${row._id}/retake`);
      setRows((current) => current.filter((item) => item._id !== row._id));
      setMessage(`Retake permission granted to ${studentName}. They will receive only the remaining scheduled exam time.`);
      setConfirmTarget(null);
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not grant retake permission.");
    } finally {
      setGrantingId("");
    }
  }

  const columns = [
    { key: "student", label: "Disqualified Student", render: (row) => <div><p className="font-semibold text-slate-950 dark:text-slate-100">{row.studentId?.name || "Unknown"}</p><p className="font-mono text-xs text-slate-500">{row.studentId?.enrollmentNumber || row.studentId?.email}</p></div> },
    { key: "course", label: "Course", render: (row) => row.examId?.courseId?.courseName || "Unknown" },
    { key: "exam", label: "Exam", render: (row) => row.examId?.title || "Unknown" },
    { key: "violations", label: "Violations", render: (row) => <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">{row.violationCount || 3}/3</span> },
    { key: "date", label: "Disqualified At", render: (row) => formatDate(row.submittedAt) },
    { key: "action", label: "Admin Permission", render: (row) => <button className="btn-primary" type="button" disabled={grantingId === row._id} onClick={() => setConfirmTarget(row)}><RotateCcw size={16} /> {grantingId === row._id ? "Granting..." : "Allow Retake"}</button> }
  ];

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-950 dark:text-slate-100"><ShieldCheck className="text-[#0f88d2]" /> Retake Users</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Only disqualified students appear here. An administrator must explicitly allow every retake.</p>
        </div>
        <button className="btn-secondary" type="button" onClick={loadDisqualified} disabled={loading}><RotateCcw size={16} /> Refresh</button>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <AlertTriangle className="mt-0.5 shrink-0" size={20} />
        <p>Allowing a retake clears the old answers, score, and security violations. It does not reset the shared exam clock; the student receives only the remaining time.</p>
      </div>

      {message && <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">{message}</div>}
      {loading ? <div className="card p-8 text-center text-slate-500">Loading disqualified students...</div> : <DataTable columns={columns} rows={rows} empty="No disqualified students are waiting for retake permission." />}

      {confirmTarget && (
        <Modal title="Confirm Retake Permission" widthClass="max-w-lg" onClose={() => !grantingId && setConfirmTarget(null)}>
          <div className="space-y-5">
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <AlertTriangle className="mt-0.5 shrink-0" size={22} />
              <div>
                <p className="font-bold">Allow {confirmTarget.studentId?.name || "this student"} to retake?</p>
                <p className="mt-1 text-sm leading-6">Previous answers, score, and security violations will be cleared. The scheduled timer will continue and will not restart.</p>
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
              <p><span className="font-semibold">Exam:</span> {confirmTarget.examId?.title || "Unknown"}</p>
              <p className="mt-1"><span className="font-semibold">Course:</span> {confirmTarget.examId?.courseId?.courseName || "Unknown"}</p>
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button className="btn-secondary" type="button" disabled={Boolean(grantingId)} onClick={() => setConfirmTarget(null)}>Cancel</button>
              <button className="btn-primary" type="button" disabled={Boolean(grantingId)} onClick={grantRetake}><RotateCcw size={16} /> {grantingId ? "Granting..." : "Confirm Retake"}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
