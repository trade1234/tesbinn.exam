import { useEffect, useState } from "react";
import { AlertTriangle, Search, UserPlus, Copy, Check, KeyRound, Pencil, Trash2 } from "lucide-react";
import DataTable from "../components/DataTable.jsx";
import Modal from "../components/Modal.jsx";
import { api } from "../services/api.js";

export default function Students() {
  const [rows, setRows] = useState([]);
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [modal, setModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ name: "", batchYear: new Date().getFullYear(), trainingTaken: "", generatePassword: false });

  const fallbackTrainingOptions = [
    "Coffee Cupping",
    "Barista",
    "International Import/Export"
  ];
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");

  function load() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (courseFilter) params.set("courseId", courseFilter);
    api.get(`/users/students?${params.toString()}`).then((res) => setRows(res.data));
  }

  function loadCourses() {
    api.get("/courses").then((res) => setCourses(Array.isArray(res.data) ? res.data : []));
  }

  useEffect(load, [search, courseFilter]);
  useEffect(loadCourses, []);

  async function toggle(row) {
    await api.patch(`/users/students/${row._id}/active`, { isActive: !row.isActive });
    load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/users/students/${deleteTarget._id}`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete student");
    } finally {
      setDeleting(false);
    }
  }

  function resetForm() {
    setForm({ name: "", batchYear: new Date().getFullYear(), trainingTaken: "", generatePassword: false });
  }

  function openModal() {
    setEditingStudent(null);
    resetForm();
    setCreated(null);
    setError("");
    setCopied("");
    setModal(true);
  }

  function closeModal() {
    setModal(false);
    setEditingStudent(null);
    setCreated(null);
    setError("");
    setCopied("");
    if (created) load();
  }

  function openEdit(row) {
    setEditingStudent(row);
    setForm({
      name: row.name || "",
      batchYear: row.batchYear || new Date().getFullYear(),
      trainingTaken: row.trainingTaken || "",
      isActive: Boolean(row.isActive),
      generatePassword: false
    });
    setCreated(null);
    setError("");
    setCopied("");
    setModal(true);
  }

  async function save(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (editingStudent) {
        await api.put(`/users/students/${editingStudent._id}`, {
          name: form.name,
          batchYear: Number(form.batchYear),
          trainingTaken: form.trainingTaken,
          isActive: Boolean(form.isActive),
          generatePassword: Boolean(form.generatePassword)
        });
        setModal(false);
        setEditingStudent(null);
        load();
        return;
      }

      const res = await api.post("/users/students", {
        name: form.name,
        batchYear: Number(form.batchYear),
        trainingTaken: form.trainingTaken
      });
      setCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.message || (editingStudent ? "Failed to update student" : "Failed to create student"));
    } finally {
      setLoading(false);
    }
  }

  function copyText(value, key) {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  }

  const trainingOptions = courses.length ? courses.map((course) => course.courseName).filter(Boolean) : fallbackTrainingOptions;
  const currentYear = new Date().getFullYear();
  const batchYears = [];
  for (let y = currentYear; y >= 2015; y--) {
    batchYears.push(y);
  }

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex min-w-0 flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <h2 className="break-words text-2xl font-bold">Student Management</h2>
          <p className="break-words text-sm text-slate-500">Search, activate, deactivate, and add student accounts.</p>
        </div>
        <button className="btn-primary w-full sm:w-auto" onClick={openModal}>
          <UserPlus size={16} /> Add Student
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-[minmax(240px,420px)_minmax(220px,320px)]">
        <label className="relative block w-full">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input className="input pl-9" placeholder="Search students" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <select className="input" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
          <option value="">All courses</option>
          {courses.map((course) => <option key={course._id} value={course._id}>{course.courseCode ? `${course.courseCode} - ${course.courseName}` : course.courseName}</option>)}
        </select>
      </div>
      <DataTable columns={[
        { key: "name", label: "Full Name" },
        { key: "enrollmentNumber", label: "Student ID", render: (row) => (
          <span className="font-mono text-xs font-semibold tracking-wide text-blue-700 dark:text-sky-400">
            {row.enrollmentNumber || "--"}
          </span>
        )},
        { key: "generatedPassword", label: "Password", render: (row) => row.generatedPassword ? (
          <div className="flex min-w-0 items-center gap-2">
            <span className="break-all font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{row.generatedPassword}</span>
            <button
              className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              onClick={() => copyText(row.generatedPassword, `password-${row._id}`)}
              title="Copy password"
            >
              {copied === `password-${row._id}` ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        ) : "Not available" },
        { key: "batchYear", label: "Batch Year", render: (row) => row.batchYear || "--" },
        { key: "trainingTaken", label: "Training Taken", render: (row) => row.trainingTaken || "Not assigned" },
        { key: "isActive", label: "Status", render: (row) => (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.isActive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${row.isActive ? "bg-emerald-500" : "bg-red-500"}`}></span>
            {row.isActive ? "Active" : "Inactive"}
          </span>
        )},
        { key: "actions", label: "Actions", render: (row) => (
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => openEdit(row)}><Pencil size={14} /> Edit</button>
            <button className="btn-secondary" onClick={() => toggle(row)}>{row.isActive ? "Deactivate" : "Activate"}</button>
            <button
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 hover:text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/60"
              onClick={() => setDeleteTarget(row)}
              title="Delete student"
              type="button"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        ) }
      ]} rows={rows} />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-[#111a2b]">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300">
                <AlertTriangle size={26} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-950 dark:text-slate-100">Delete student?</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  This will permanently delete <span className="font-semibold text-slate-950 dark:text-slate-100">{deleteTarget.name}</span>, their account, exam attempts, and saved answers.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button className="btn-secondary" type="button" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
              >
                <Trash2 size={16} /> {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <Modal title={created ? "Student Created" : editingStudent ? "Edit Student" : "Add New Student"} onClose={closeModal}>
          {!created ? (
            <form className="space-y-4" onSubmit={save}>
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Full Name including Grandfather Name <span className="text-red-500">*</span></label>
                <input
                  className="input"
                  placeholder="Enter full name including grandfather name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Batch Year <span className="text-red-500">*</span></label>
                <select
                  className="input"
                  value={form.batchYear}
                  onChange={(e) => setForm({ ...form, batchYear: Number(e.target.value) })}
                  required
                >
                  {batchYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Training Program <span className="text-red-500">*</span></label>
                <select
                  className="input"
                  value={form.trainingTaken}
                  onChange={(e) => setForm({ ...form, trainingTaken: e.target.value })}
                  required
                >
                  <option value="" disabled>Select a training program</option>
                  {trainingOptions.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              {!editingStudent && (
                <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-slate-700 dark:bg-slate-800 dark:text-sky-300">
                  <KeyRound className="mt-0.5 shrink-0" size={16} />
                  <span>A secure unique password will be generated automatically after the student is created.</span>
                </div>
              )}
              {editingStudent && (
                <div className="space-y-3">
                  <label className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-[#0f172a] dark:text-slate-200">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#0f88d2]"
                      checked={Boolean(form.generatePassword)}
                      onChange={(e) => setForm({ ...form, generatePassword: e.target.checked })}
                    />
                    Generate new secure password
                  </label>
                  <label className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-[#0f172a] dark:text-slate-200">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#0f88d2]"
                      checked={Boolean(form.isActive)}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    />
                    Account active
                  </label>
                </div>
              )}
              <div className="grid gap-3 pt-2 sm:flex sm:items-center">
                <button className="btn-primary" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                      {editingStudent ? "Saving..." : "Creating..."}
                    </span>
                  ) : (
                    <>{editingStudent ? <Pencil size={16} /> : <UserPlus size={16} />} {editingStudent ? "Save Student" : "Create Student"}</>
                  )}
                </button>
                <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
              </div>
            </form>
          ) : (
            <div className="min-w-0 space-y-5">
              <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 dark:border-emerald-800 dark:from-emerald-900/20 dark:to-teal-900/20">
                <div className="mb-3 flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <Check size={20} />
                  <span className="text-sm font-semibold">Student registered successfully!</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Full Name</span>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{created.name}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Student ID</span>
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="break-all font-mono text-base font-bold tracking-wider sm:text-lg text-blue-700 dark:text-sky-400">{created.enrollmentNumber}</p>
                      <button
                        className="rounded-md border border-blue-200 bg-white p-1.5 text-blue-600 transition hover:bg-blue-50 dark:border-slate-700 dark:bg-[#111a2b] dark:text-sky-400 dark:hover:bg-slate-800"
                        onClick={() => copyText(created.enrollmentNumber, "created-id")}
                        title="Copy Student ID"
                      >
                        {copied === "created-id" ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Generated Password</span>
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="break-all font-mono text-base font-bold tracking-wider sm:text-lg text-blue-700 dark:text-sky-400">{created.generatedPassword}</p>
                      <button
                        className="rounded-md border border-blue-200 bg-white p-1.5 text-blue-600 transition hover:bg-blue-50 dark:border-slate-700 dark:bg-[#111a2b] dark:text-sky-400 dark:hover:bg-slate-800"
                        onClick={() => copyText(created.generatedPassword, "created-password")}
                        title="Copy password"
                      >
                        {copied === "created-password" ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Batch Year</span>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{created.batchYear}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Training Program</span>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{created.trainingTaken}</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                The student can log in using their <strong>Student ID</strong> ({created.enrollmentNumber}) and the generated password shown above.
              </p>
              <div className="grid gap-3 sm:flex">
                <button className="btn-primary" onClick={() => { setCreated(null); resetForm(); setCopied(""); }}>
                  <UserPlus size={16} /> Add Another
                </button>
                <button className="btn-secondary" onClick={closeModal}>Close</button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
