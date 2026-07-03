import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";

export default function Profile() {
  const { user } = useAuth();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "" });
  const [message, setMessage] = useState("");

  async function submit(e) {
    e.preventDefault();
    await api.patch("/users/change-password", form);
    setForm({ currentPassword: "", newPassword: "" });
    setMessage("Password changed successfully.");
  }

  const details = [
    ["Full Name", user?.name],
    ["Email", user?.email],
    ["Student ID", user?.enrollmentNumber || "Not assigned"],
    ["Training Taken", user?.trainingTaken || "Not assigned"]
  ];

  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.1fr)] lg:gap-6">
      <section className="card min-w-0 p-4 sm:p-6">
        <h2 className="text-xl font-bold text-slate-950 dark:text-slate-100">Personal Details</h2>
        <dl className="mt-6 space-y-4 text-sm">
          {details.map(([label, value]) => (
            <div key={label} className="rounded-lg bg-slate-50 p-4 dark:bg-[#0f172a]">
              <dt className="font-semibold text-slate-500 dark:text-slate-400">{label}</dt>
              <dd className="mt-1 break-words font-semibold text-slate-950 dark:text-slate-100">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card min-w-0 p-4 sm:p-6">
        <h2 className="text-xl font-bold text-slate-950 dark:text-slate-100">Change Password</h2>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <input className="input" type="password" placeholder="Current password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} required />
          <input className="input" type="password" placeholder="New password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} required />
          {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{message}</p>}
          <button className="btn-primary w-full sm:w-auto">Update Password</button>
        </form>
      </section>
    </div>
  );
}

