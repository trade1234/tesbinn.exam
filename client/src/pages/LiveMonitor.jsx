import { useEffect, useState } from "react";
import { Radio, RefreshCw, Clock, Users, ShieldAlert, Layers } from "lucide-react";
import DataTable from "../components/DataTable.jsx";
import { api } from "../services/api.js";

export default function LiveMonitor() {
  const [onlineStudents, setOnlineStudents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState("online"); // "online" or "logs"
  const [autoRefresh, setAutoRefresh] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([
      api.get("/users/online"),
      api.get("/users/activity-logs")
    ]).then(([onlineRes, logsRes]) => {
      setOnlineStudents(onlineRes.data);
      setLogs(logsRes.data);
    }).catch(err => {
      console.error("Failed to load monitor data", err);
    }).finally(() => {
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  function getActionBadge(action) {
    switch (action) {
      case "LOGIN":
        return <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">LOGIN</span>;
      case "REGISTER":
        return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">REGISTER</span>;
      case "START_EXAM":
        return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">START EXAM</span>;
      case "SUBMIT_EXAM":
        return <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">SUBMIT EXAM</span>;
      case "PASSWORD_CHANGE":
        return <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">PASSWORD CHANGE</span>;
      default:
        return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-400">{action}</span>;
    }
  }

  // Parse simple device info from user agent string
  function parseUserAgent(ua) {
    if (!ua) return "Unknown";
    if (ua.includes("Firefox/")) return "Firefox (PC)";
    if (ua.includes("Chrome/") && ua.includes("Windows")) return "Chrome (Windows)";
    if (ua.includes("Chrome/") && ua.includes("Mac")) return "Chrome (Mac)";
    if (ua.includes("Safari/") && !ua.includes("Chrome")) return "Safari";
    if (ua.includes("Mobile")) return "Mobile Device";
    return ua.split(" ")[0] || "PC Browser";
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex min-w-0 flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl tracking-tight text-slate-950 dark:text-slate-100">
            <Radio className="text-emerald-500 animate-pulse" size={28} /> Live Security Monitor
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Real-time tracking of active student sessions, concurrent logins, and security activity logs.
          </p>
        </div>
        <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center">
          <label className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm shadow-sm dark:bg-[#111a2b] border border-blue-50/50 dark:border-slate-800">
            <input
              type="checkbox"
              className="accent-emerald-500 h-4 w-4"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span className="font-medium text-slate-600 dark:text-slate-300">Auto-refresh (10s)</span>
          </label>
          <button className={`btn-secondary ${loading ? "opacity-50" : ""}`} onClick={load} disabled={loading}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="card flex min-w-0 items-center justify-between gap-3 p-4 sm:p-6 border-l-4 border-emerald-500">
          <div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Online Students</p>
            <p className="mt-2 text-3xl font-extrabold sm:text-4xl text-slate-900 dark:text-white flex items-baseline gap-2">
              {onlineStudents.length}
              <span className="relative flex h-3 w-3 inline-block self-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Users size={24} />
          </div>
        </div>

        <div className="card flex min-w-0 items-center justify-between gap-3 p-4 sm:p-6 border-l-4 border-blue-500">
          <div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Recent Activity Count</p>
            <p className="mt-2 text-3xl font-extrabold sm:text-4xl text-slate-900 dark:text-white">{logs.length}</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Layers size={24} />
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        <button
          className={`shrink-0 px-4 py-3 sm:px-5 text-sm font-semibold border-b-2 transition ${activeSubTab === "online" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          onClick={() => setActiveSubTab("online")}
        >
          Online Students ({onlineStudents.length})
        </button>
        <button
          className={`shrink-0 px-4 py-3 sm:px-5 text-sm font-semibold border-b-2 transition ${activeSubTab === "logs" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          onClick={() => setActiveSubTab("logs")}
        >
          Activity & Security Logs ({logs.length})
        </button>
      </div>

      {activeSubTab === "online" ? (
        <DataTable
          columns={[
            {
              key: "name",
              label: "Student Info",
              render: (row) => (
                <div className="flex items-center gap-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{row.name}</p>
                    <p className="font-mono text-xs text-slate-500">{row.enrollmentNumber || row.email}</p>
                  </div>
                </div>
              )
            },
            { key: "trainingTaken", label: "Assigned Training", render: (row) => row.trainingTaken || "N/A" },
            { key: "batchYear", label: "Batch Year", render: (row) => row.batchYear || "N/A" },
            {
              key: "lastActive",
              label: "Last Request",
              render: (row) => (
                <span className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  <Clock size={13} />
                  {row.lastActive ? new Date(row.lastActive).toLocaleTimeString() : "N/A"}
                </span>
              )
            }
          ]}
          rows={onlineStudents}
          empty="No students are currently active online."
        />
      ) : (
        <DataTable
          columns={[
            {
              key: "timestamp",
              label: "Time",
              render: (row) => (
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {new Date(row.createdAt).toLocaleTimeString()}
                </span>
              )
            },
            {
              key: "student",
              label: "Student",
              render: (row) => (
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{row.userId?.name || "System"}</p>
                  <p className="font-mono text-xs text-slate-500">{row.userId?.enrollmentNumber || row.userId?.email || "N/A"}</p>
                </div>
              )
            },
            {
              key: "action",
              label: "Action Type",
              render: (row) => getActionBadge(row.action)
            },
            { key: "details", label: "Activity Details", render: (row) => <span className="font-medium text-slate-700 dark:text-slate-300">{row.details}</span> },
            { key: "ipAddress", label: "IP Address", render: (row) => <span className="font-mono text-xs text-slate-500">{row.ipAddress || "Unknown"}</span> },
            { key: "userAgent", label: "Device/Browser", render: (row) => <span className="text-xs text-slate-500 dark:text-slate-400" title={row.userAgent}>{parseUserAgent(row.userAgent)}</span> }
          ]}
          rows={logs}
          empty="No activity logs registered yet."
        />
      )}
    </div>
  );
}


