import { useCallback, useEffect, useState } from "react";
import { KeyRound, Plus, RefreshCw, Trash2, UserCog } from "lucide-react";
import DataTable from "../components/DataTable.jsx";
import Modal from "../components/Modal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";

export const ROLE_LABELS = { ADMIN: "Admin", CUSTOMER_SERVICE: "Customer Service" };

const ROLE_DESCRIPTIONS = {
  ADMIN: "Full access to every admin page, including account management.",
  CUSTOMER_SERVICE: "Can create, view, and edit students; create and edit their own exams; and schedule all exams."
};

const emptyForm = { name: "", email: "", password: "", role: "CUSTOMER_SERVICE" };

function errorMessage(error, fallback) {
  const data = error.response?.data;
  const fieldErrors = data?.details?.fieldErrors?.body || data?.details?.fieldErrors;
  const first = fieldErrors && Object.values(fieldErrors).flat().find(Boolean);
  return first || data?.message || fallback;
}

export default function AccountManagement() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState(null);
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/users/accounts", { params: roleFilter ? { role: roleFilter } : {} });
      setAccounts(data);
    } catch (error) {
      setMessage({ tone: "error", text: errorMessage(error, "Could not load accounts.") });
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => { load(); }, [load]);

  async function run(id, request, success) {
    setBusy(id);
    setMessage(null);
    try {
      await request();
      setMessage({ tone: "success", text: success });
      await load();
      return true;
    } catch (error) {
      setMessage({ tone: "error", text: errorMessage(error, "The request failed.") });
      return false;
    } finally {
      setBusy("");
    }
  }

  async function createAccount(event) {
    event.preventDefault();
    const ok = await run("create", () => api.post("/users/accounts", form), `${ROLE_LABELS[form.role]} account created for ${form.email}.`);
    if (ok) setForm(null);
  }

  async function resetPassword(event) {
    event.preventDefault();
    const ok = await run(passwordTarget._id, () => api.patch(`/users/accounts/${passwordTarget._id}`, { password: newPassword }), `Password reset for ${passwordTarget.email}.`);
    if (ok) { setPasswordTarget(null); setNewPassword(""); }
  }

  async function removeAccount() {
    const ok = await run(deleteTarget._id, () => api.delete(`/users/accounts/${deleteTarget._id}`), `Deleted account ${deleteTarget.email}.`);
    if (ok) setDeleteTarget(null);
  }

  const columns = [
    { key: "name", label: "Name", render: (row) => <div><p className="font-semibold text-slate-950 dark:text-slate-100">{row.name}{String(row._id) === String(user?._id) && <span className="ml-2 text-xs font-bold text-blue-600">(you)</span>}</p><p className="text-xs text-slate-500">{row.email}</p></div> },
    {
      key: "role",
      label: "Role",
      render: (row) => (
        <select className="input min-w-[11rem]" value={row.role} disabled={busy === row._id || String(row._id) === String(user?._id)} onChange={(e) => run(row._id, () => api.patch(`/users/accounts/${row._id}`, { role: e.target.value }), `${row.email} is now ${ROLE_LABELS[e.target.value]}.`)}>
          {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <button type="button" disabled={busy === row._id || String(row._id) === String(user?._id)} className={`rounded-full px-3 py-1 text-xs font-bold transition disabled:opacity-60 ${row.isActive ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-red-100 text-red-700 hover:bg-red-200"}`} onClick={() => run(row._id, () => api.patch(`/users/accounts/${row._id}`, { isActive: !row.isActive }), `${row.email} ${row.isActive ? "deactivated" : "activated"}.`)}>
          {row.isActive ? "Active" : "Inactive"}
        </button>
      )
    },
    { key: "lastActive", label: "Created", render: (row) => new Date(row.createdAt).toLocaleDateString() },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" title="Reset password" aria-label={`Reset password for ${row.email}`} onClick={() => { setPasswordTarget(row); setNewPassword(""); }}><KeyRound size={15} /></button>
          {String(row._id) !== String(user?._id) && <button type="button" className="btn-secondary text-red-600" title="Delete account" aria-label={`Delete ${row.email}`} onClick={() => setDeleteTarget(row)}><Trash2 size={15} /></button>}
        </div>
      )
    }
  ];

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-950 dark:text-slate-100"><UserCog className="text-blue-700" /> Account Management</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create admin and customer service accounts, change roles, and deactivate access.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" type="button" onClick={load} disabled={loading}><RefreshCw size={16} /> Refresh</button>
          <button className="btn-primary" type="button" onClick={() => setForm(emptyForm)}><Plus size={16} /> New account</button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {Object.entries(ROLE_LABELS).map(([role, label]) => (
          <div key={role} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="font-bold text-slate-900 dark:text-slate-100">{label} <span className="ml-1 text-slate-500">({accounts.filter((a) => a.role === role).length})</span></p>
            <p className="mt-1 text-slate-600 dark:text-slate-300">{ROLE_DESCRIPTIONS[role]}</p>
          </div>
        ))}
      </div>

      {message && <div className={`rounded-xl p-4 text-sm font-semibold ${message.tone === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{message.text}</div>}

      <div className="card p-4 sm:max-w-xs">
        <select className="input" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All staff roles</option>
          {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      {loading ? <div className="card p-8 text-center text-slate-500">Loading accounts...</div> : <DataTable columns={columns} rows={accounts} empty="No staff accounts found." />}

      {form && (
        <Modal title="Create staff account" onClose={() => setForm(null)}>
          <form className="space-y-3" onSubmit={createAccount}>
            <label className="block text-sm font-semibold">Full name<input className="input mt-1" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label className="block text-sm font-semibold">Email (used to log in)<input className="input mt-1" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label className="block text-sm font-semibold">Password<input className="input mt-1" type="text" required minLength={5} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><span className="mt-1 block text-xs font-normal text-slate-500">At least 5 characters, with letters and numbers.</span></label>
            <label className="block text-sm font-semibold">Role
              <select className="input mt-1" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <span className="mt-1 block text-xs font-normal text-slate-500">{ROLE_DESCRIPTIONS[form.role]}</span>
            </label>
            <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setForm(null)}>Cancel</button><button className="btn-primary" disabled={busy === "create"}>{busy === "create" ? "Creating..." : "Create account"}</button></div>
          </form>
        </Modal>
      )}

      {passwordTarget && (
        <Modal title={`Reset password for ${passwordTarget.name}`} onClose={() => setPasswordTarget(null)}>
          <form className="space-y-3" onSubmit={resetPassword}>
            <label className="block text-sm font-semibold">New password<input className="input mt-1" type="text" required minLength={5} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /><span className="mt-1 block text-xs font-normal text-slate-500">At least 5 characters, with letters and numbers.</span></label>
            <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setPasswordTarget(null)}>Cancel</button><button className="btn-primary" disabled={busy === passwordTarget._id}>Reset password</button></div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Delete account" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-slate-600 dark:text-slate-300">Permanently delete <strong>{deleteTarget.name}</strong> ({deleteTarget.email})? They will no longer be able to log in. To keep the record, deactivate the account instead.</p>
          <div className="mt-5 flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button><button type="button" className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-red-300" disabled={busy === deleteTarget._id} onClick={removeAccount}><Trash2 size={16} /> Delete</button></div>
        </Modal>
      )}
    </div>
  );
}
