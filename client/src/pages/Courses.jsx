import { useEffect, useState } from "react";
import { AlertTriangle, Pencil, Plus, Search, Trash2 } from "lucide-react";
import DataTable from "../components/DataTable.jsx";
import Modal from "../components/Modal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";
import { useDebouncedValue } from "../hooks/useDebouncedValue.js";

export default function Courses() {
  const { isAdmin, isCustomerService, user } = useAuth();
  const canCreate = isAdmin || isCustomerService;
  // Admins edit every course; customer service only the courses they created.
  const canEdit = (course) => isAdmin || (isCustomerService && !!user?._id && String(course?.createdBy?._id || course?.createdBy || "") === String(user._id));
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const [listLoading, setListLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const emptyForm = { courseName: "", courseCode: "", description: "" };
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  function load() { setListLoading(true); api.get(`/courses?search=${encodeURIComponent(debouncedSearch)}`).then((res) => setRows(res.data)).finally(() => setListLoading(false)); }
  useEffect(load, [debouncedSearch]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setModal(true);
  }

  function openEdit(course) {
    setEditing(course);
    setForm({ courseName: course.courseName || "", courseCode: course.courseCode || "", description: course.description || "" });
    setFormError("");
    setModal(true);
  }

  function closeModal() {
    if (saving) return;
    setModal(false);
    setEditing(null);
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      if (editing) await api.put(`/courses/${editing._id}`, form);
      else await api.post("/courses", form);
      setModal(false);
      setEditing(null);
      setForm(emptyForm);
      load();
    } catch (error) {
      setFormError(error.response?.data?.message || "Could not save the course. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/courses/${deleteTarget._id}`);
      setDeleteTarget(null);
      load();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex min-w-0 flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <h2 className="break-words text-2xl font-bold">Courses</h2>
          <p className="break-words text-sm text-slate-500">Course catalog and available exams.</p>
        </div>
        {canCreate && <button className="btn-primary w-full sm:w-auto" onClick={openCreate}><Plus size={16} /> Create Course</button>}
      </div>
      <label className="relative block w-full max-w-md">
        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
        <input className="input pl-9" placeholder="Search courses" value={search} onChange={(e) => setSearch(e.target.value)} />
      </label>
      <DataTable loading={listLoading} columns={[
        { key: "courseCode", label: "Code" },
        { key: "courseName", label: "Course" },
        { key: "description", label: "Description" },
        { key: "examCount", label: "Exams" },
        ...(canCreate ? [{ key: "createdBy", label: "Created By", render: (row) => (
          canEdit(row) && !isAdmin
            ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-sky-950/40 dark:text-sky-300">You</span>
            : <span className="text-sm text-slate-600 dark:text-slate-300">{row.createdBy?.name || "Admin"}</span>
        ) }] : []),
        ...(canCreate ? [{ key: "actions", label: "Actions", render: (row) => (
          <div className="flex flex-wrap gap-2">
            {canEdit(row) ? (
              <button
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:bg-sky-950/30 dark:text-sky-300 dark:hover:bg-sky-950/60"
                onClick={() => openEdit(row)}
                title="Edit course"
              >
                <Pencil size={14} /> Edit
              </button>
            ) : <span className="text-xs text-slate-400 dark:text-slate-500">View only</span>}
            {isAdmin && (
              <button
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 hover:text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/60"
                onClick={() => setDeleteTarget(row)}
                title="Delete course"
              >
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
        ) }] : [])
      ]} rows={rows} />

      {/* Create / Edit Course Modal */}
      {modal && (
        <Modal title={editing ? "Edit Course" : "Create Course"} onClose={closeModal}>
          <form className="space-y-3" onSubmit={save}>
            <input className="input" placeholder="Course name" value={form.courseName} onChange={(e) => setForm({ ...form, courseName: e.target.value })} required />
            <input className="input" placeholder="Course code" value={form.courseCode} onChange={(e) => setForm({ ...form, courseCode: e.target.value })} required />
            <textarea className="input min-h-28" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">{formError}</p>}
            <button className="btn-primary" disabled={saving}>{saving ? "Saving..." : editing ? "Save Changes" : "Save Course"}</button>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-[#111a2b]">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300">
                <AlertTriangle size={26} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-950 dark:text-slate-100">Delete course?</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  This will permanently delete{" "}
                  <span className="font-semibold text-slate-950 dark:text-slate-100">
                    {deleteTarget.courseName}
                  </span>{" "}
                  and all of its exams.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="btn-secondary"
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>
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
    </div>
  );
}



