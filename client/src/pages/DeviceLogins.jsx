import { useCallback, useEffect, useState } from "react";
import { LogOut, RefreshCw, ShieldAlert } from "lucide-react";
import DataTable from "../components/DataTable.jsx";
import Modal from "../components/Modal.jsx";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

function device(ua = "") {
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Unknown browser";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Unknown device";
  return `${browser} · ${os}`;
}
const date = (value) => value ? new Date(value).toLocaleString() : "—";
const active = (row) => !row.revokedAt && new Date(row.expiresAt) > new Date();

export default function DeviceLogins() {
  const { logout } = useAuth();
  const [data, setData] = useState({ items: [], pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get("/auth/sessions", { params: { page, status } }); setData(data); }
    catch (error) { setMessage(error.response?.data?.message || "Could not load device logins."); }
    finally { setLoading(false); }
  }, [page, status]);
  useEffect(() => { load(); }, [load]);
  async function signOut() {
    setBusy(true);
    try {
      const { data } = await api.delete(`/auth/sessions/${target._id}`);
      setTarget(null);
      if (data.isCurrent) { await logout(); return; }
      setMessage("Device signed out. Its next request will require a new login.");
      await load();
    } catch (error) { setMessage(error.response?.data?.message || "Could not sign out this device."); }
    finally { setBusy(false); }
  }
  const columns = [
    { key: "user", label: "User", render: (row) => <div><p className="font-semibold">{row.userId?.name || "Deleted user"}</p><p className="text-xs text-slate-500">{row.userId?.email}</p><p className="text-xs">{(row.userId?.role || "").replace(/_/g, " ")}</p></div> },
    { key: "device", label: "Reported Device / Browser", render: (row) => <div><p title={row.userAgent}>{device(row.userAgent)}</p><p className="text-xs text-slate-500">Unverified browser information</p>{row.isCurrent && <p className="text-xs font-bold text-blue-600">This session</p>}<p className="text-xs text-slate-500">IP: {row.ipAddress || "Unknown"}</p></div> },
    { key: "createdAt", label: "Signed in", render: (row) => date(row.createdAt) },
    { key: "lastActive", label: "Last activity", render: (row) => date(row.lastActive) },
    { key: "status", label: "Status", render: (row) => row.revokedAt ? "Signed out" : new Date(row.expiresAt) <= new Date() ? "Expired" : row.userId?.isActive === false ? "Account disabled" : "Active" },
    { key: "action", label: "Action", render: (row) => active(row) && <button className="btn-secondary" disabled={busy} onClick={() => setTarget(row)}><LogOut size={15} /> Sign out</button> }
  ];
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold">Device Logins</h2><p className="text-sm text-slate-500">Review login sessions and sign out devices for any user.</p></div><button className="btn-secondary" disabled={loading} onClick={load}><RefreshCw size={16} /> Refresh</button></div>
    <p className="text-sm text-slate-500">Browser information can be spoofed. It is never used to grant access or identify a trusted device. Active means the session is valid; it does not mean the user is currently online. Login history is retained for 30 days after expiry.</p>
    <select className="input max-w-xs" aria-label="Session status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="active">Active sessions</option><option value="all">All login history</option></select>
    {message && <p role="status" className="rounded-lg bg-blue-50 p-3 text-blue-800">{message}</p>}
    {loading ? <p>Loading device logins…</p> : <DataTable columns={columns} rows={data.items} empty="No device logins found." />}
    <div className="flex items-center justify-between gap-3"><p>{data.total} sessions · page {page} of {data.pages}</p><div className="flex gap-2"><button className="btn-secondary" disabled={loading || page <= 1} onClick={() => setPage(page - 1)}>Previous</button><button className="btn-secondary" disabled={loading || page >= data.pages} onClick={() => setPage(page + 1)}>Next</button></div></div>
    {target && <Modal title="Sign out device" onClose={() => !busy && setTarget(null)}><div className="space-y-4"><ShieldAlert className="text-amber-600" /><p>Sign out {target.userId?.name || "this user"} on {device(target.userAgent)}?{target.isCurrent ? " This will sign you out of your current session." : " They will need to sign in again."}</p><div className="flex gap-3"><button className="btn-secondary" disabled={busy} onClick={() => setTarget(null)}>Cancel</button><button className="btn-primary" disabled={busy} onClick={signOut}>{busy ? "Signing out…" : "Sign out device"}</button></div></div></Modal>}
  </div>;
}
