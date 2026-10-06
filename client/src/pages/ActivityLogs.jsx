import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, History, RefreshCw, Search, X } from "lucide-react";
import DataTable from "../components/DataTable.jsx";
import { api } from "../services/api.js";
import { TableSkeleton } from "../components/Skeleton.jsx";

const ROLE_OPTIONS = [
  ["", "All users"],
  ["CUSTOMER_SERVICE", "Customer Service"],
  ["ADMIN", "Admin"],
  ["STUDENT", "Students"]
];

const ROLE_BADGES = {
  ADMIN: "bg-blue-100 text-blue-700",
  CUSTOMER_SERVICE: "bg-purple-100 text-purple-700",
  STUDENT: "bg-slate-100 text-slate-700"
};

const ROLE_NAMES = { ADMIN: "Admin", CUSTOMER_SERVICE: "Customer Service", STUDENT: "Student" };

const emptyFilters = { role: "", action: "", search: "", from: "", to: "" };

function actionTone(action) {
  if (/DELETE|DISQUALIFIED|DEACTIVAT/.test(action)) return "bg-red-100 text-red-700";
  if (/CREATE|REGISTER|GRANT/.test(action)) return "bg-emerald-100 text-emerald-700";
  if (/UPDATE|SET_|PAUSE|RESUME|ACCESS|PASSWORD/.test(action)) return "bg-amber-100 text-amber-700";
  if (/LOGIN/.test(action)) return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-700";
}

function device(ua) {
  if (!ua) return "Unknown";
  if (ua.includes("Mobile")) return "Mobile";
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Chrome/")) return "Chrome";
  if (ua.includes("Safari/")) return "Safari";
  return "Browser";
}

export default function ActivityLogs() {
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pages: 1, actions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = Object.fromEntries(Object.entries({ ...applied, page, limit: 50 }).filter(([, value]) => value !== ""));
      const { data: result } = await api.get("/users/activity-logs/search", { params });
      setData(result);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not load activity logs.");
    } finally {
      setLoading(false);
    }
  }, [applied, page]);

  useEffect(() => { load(); }, [load]);

  function apply(next) {
    setApplied(next);
    setPage(1);
  }

  const columns = [
    { key: "time", label: "Time", render: (row) => <div className="whitespace-nowrap text-xs"><p className="font-semibold">{new Date(row.createdAt).toLocaleTimeString()}</p><p className="text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</p></div> },
    {
      key: "user",
      label: "User",
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-950 dark:text-slate-100">{row.userId?.name || "Deleted user"}</p>
          <p className="font-mono text-xs text-slate-500">{row.userId?.email || row.userId?.enrollmentNumber || ""}</p>
          {row.role && <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${ROLE_BADGES[row.role] || ROLE_BADGES.STUDENT}`}>{ROLE_NAMES[row.role] || row.role}</span>}
        </div>
      )
    },
    { key: "action", label: "Action", render: (row) => <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${actionTone(row.action)}`}>{row.action.replace(/_/g, " ")}</span> },
    { key: "details", label: "Details", render: (row) => <span className="break-words text-sm">{row.details || "--"}</span> },
    { key: "source", label: "IP / Device", render: (row) => <div className="text-xs text-slate-500"><p className="font-mono">{row.ipAddress || "--"}</p><p title={row.userAgent}>{device(row.userAgent)}</p></div> }
  ];

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-950 dark:text-slate-100"><History className="text-blue-700" /> Activity Logs</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Every login and every change made by admins and customer service, plus key student events.</p>
        </div>
        <button className="btn-secondary" type="button" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {ROLE_OPTIONS.map(([value, label]) => (
          <button key={value || "all"} type="button" onClick={() => { setFilters({ ...filters, role: value }); apply({ ...applied, role: value }); }} className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${applied.role === value ? "bg-blue-600 text-white" : "bg-white text-slate-600 shadow-sm hover:bg-slate-50 dark:bg-[#111a2b] dark:text-slate-300"}`}>{label}</button>
        ))}
      </div>

      <form className="card grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[2fr_1.3fr_1fr_1fr_auto_auto]" onSubmit={(e) => { e.preventDefault(); apply(filters); }}>
        <label className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={17} /><input className="input pl-9" placeholder="User name, email, or details" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></label>
        <select className="input" value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })}>
          <option value="">All actions</option>
          {data.actions.map((action) => <option key={action} value={action}>{action.replace(/_/g, " ")}</option>)}
        </select>
        <input className="input" type="date" aria-label="From date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        <input className="input" type="date" aria-label="To date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        <button className="btn-primary" disabled={loading}>Apply</button>
        <button type="button" className="btn-secondary" onClick={() => { setFilters(emptyFilters); apply(emptyFilters); }}><X size={16} /> Clear</button>
      </form>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      {loading && !data.items.length ? <TableSkeleton columns={5} /> : <DataTable columns={columns} rows={data.items} empty="No activity matches these filters." />}

      <div className="flex items-center justify-between text-sm text-slate-500">
        <p>{data.total} entries · page {page} of {data.pages}</p>
        <div className="flex gap-2">
          <button className="btn-secondary" type="button" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /> Prev</button>
          <button className="btn-secondary" type="button" disabled={page >= data.pages || loading} onClick={() => setPage(page + 1)}>Next <ChevronRight size={16} /></button>
        </div>
      </div>
    </div>
  );
}
