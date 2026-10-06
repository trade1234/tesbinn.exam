import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ExternalLink, Eye, EyeOff, QrCode, RefreshCw, Search, ShieldCheck, ShieldOff } from "lucide-react";
import DataTable from "../components/DataTable.jsx";
import Modal from "../components/Modal.jsx";
import { api } from "../services/api.js";
import { TableSkeleton } from "../components/Skeleton.jsx";

function Toggle({ on, onChange, disabled, onLabel, offLabel, OnIcon, OffIcon }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onChange}
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition disabled:opacity-50 ${on ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-red-100 text-red-700 hover:bg-red-200"}`}
    >
      {on ? <OnIcon size={14} /> : <OffIcon size={14} />}
      {on ? onLabel : offLabel}
    </button>
  );
}

const reasonPresets = ["Issued in error", "Course requirements not met", "Under review", "Replaced by a new certificate"];

function DeactivateDialog({ request, busy, onCancel, onConfirm }) {
  const [reason, setReason] = useState("");
  return (
    <Modal title="Deactivate QR verification" onClose={busy ? () => {} : onCancel} widthClass="max-w-lg">
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); onConfirm(reason.trim()); }}>
        <div className="flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300"><AlertTriangle size={20} /></span>
          <div className="min-w-0 text-sm">
            <p className="font-bold text-slate-950 dark:text-slate-100">{request.title}</p>
            <p className="mt-1 text-slate-600 dark:text-slate-300">{request.detail}</p>
            <p className="mt-2 text-slate-600 dark:text-slate-300">QR scans will show <span className="font-semibold text-red-700 dark:text-red-300">"Not verified"</span>. You can reactivate at any time.</p>
          </div>
        </div>
        <label className="block">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Reason <span className="font-normal text-slate-500">(optional, shown on the verification page)</span></span>
          <textarea className="input mt-2 min-h-24 resize-y" maxLength={300} autoFocus placeholder="e.g. Certificate issued in error" value={reason} onChange={(e) => setReason(e.target.value)} />
          <span className="mt-1 block text-right text-xs text-slate-400">{reason.length}/300</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {reasonPresets.map((preset) => (
            <button key={preset} type="button" className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${reason === preset ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300" : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"}`} onClick={() => setReason(preset)}>{preset}</button>
          ))}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end dark:border-slate-800">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="submit" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300" disabled={busy}>
            <ShieldOff size={16} /> {busy ? "Deactivating..." : "Deactivate"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function CertificateAccess() {
  const [courses, setCourses] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [courseRes, certRes] = await Promise.all([api.get("/certificates/access/courses"), api.get("/certificates")]);
      setCourses(courseRes.data);
      setCertificates(certRes.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not load certificate access settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const [deactivation, setDeactivation] = useState(null);

  async function updateCourse(course, changes) {
    if (changes.certificatesActive === false) {
      setDeactivation({
        title: `All certificates for "${course.courseName}"`,
        detail: `This affects ${course.certificateCount} certificate${course.certificateCount === 1 ? "" : "s"} in ${course.courseCode}.`,
        run: (reason) => sendCourseUpdate(course, { ...changes, reason })
      });
      return;
    }
    await sendCourseUpdate(course, changes);
  }

  async function sendCourseUpdate(course, body) {
    setBusy(course._id);
    try {
      await api.patch(`/certificates/access/courses/${course._id}`, body);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not update course certificates.");
    } finally {
      setBusy("");
    }
  }

  async function updateCertificate(certificate, changes) {
    if (changes.isActive === false) {
      setDeactivation({
        title: `Certificate ${certificate.certificateId}`,
        detail: `${certificate.studentName} · ${certificate.courseName}`,
        run: (reason) => sendCertificateUpdate(certificate, { ...changes, reason })
      });
      return;
    }
    await sendCertificateUpdate(certificate, changes);
  }

  async function confirmDeactivation(reason) {
    const { run } = deactivation;
    setDeactivation((current) => current && { ...current, busy: true });
    await run(reason);
    setDeactivation(null);
  }

  async function sendCertificateUpdate(certificate, body) {
    setBusy(certificate._id);
    try {
      await api.patch(`/certificates/${certificate._id}/access`, body);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not update certificate.");
    } finally {
      setBusy("");
    }
  }

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return certificates.filter((c) => {
      if (selectedCourse && String(c.courseId) !== selectedCourse) return false;
      if (filter === "HIDDEN" && c.effectiveVisible) return false;
      if (filter === "INACTIVE" && c.effectiveActive) return false;
      if (!term) return true;
      return [c.studentName, c.enrollmentNumber, c.certificateId].some((value) => String(value || "").toLowerCase().includes(term));
    });
  }, [certificates, selectedCourse, filter, search]);

  const columns = [
    { key: "student", label: "Student", render: (c) => <div><p className="font-semibold text-slate-950 dark:text-slate-100">{c.studentName}</p><p className="font-mono text-xs text-slate-500">{c.enrollmentNumber || "--"}</p></div> },
    { key: "course", label: "Course", render: (c) => <div><p>{c.courseName}</p><p className="text-xs text-slate-500">{c.examName}</p></div> },
    { key: "certificateId", label: "Certificate ID", render: (c) => <a className="inline-flex items-center gap-1 font-mono text-xs text-blue-700 hover:underline" href={`/verify/${encodeURIComponent(c.certificateId)}`} target="_blank" rel="noreferrer">{c.certificateId}<ExternalLink size={12} /></a> },
    {
      key: "visible",
      label: "Student visibility",
      render: (c) => (
        <div className="space-y-1">
          <Toggle on={c.isVisible !== false} disabled={busy === c._id} onChange={() => updateCertificate(c, { isVisible: c.isVisible === false })} onLabel="Visible" offLabel="Hidden" OnIcon={Eye} OffIcon={EyeOff} />
          {!c.courseVisible && <p className="text-xs font-semibold text-amber-600">Hidden by course</p>}
        </div>
      )
    },
    {
      key: "active",
      label: "QR verification",
      render: (c) => (
        <div className="space-y-1">
          <Toggle on={c.isActive !== false} disabled={busy === c._id} onChange={() => updateCertificate(c, { isActive: c.isActive === false })} onLabel="Active" offLabel="Deactivated" OnIcon={ShieldCheck} OffIcon={ShieldOff} />
          {!c.courseActive && <p className="text-xs font-semibold text-amber-600">Deactivated by course</p>}
          {c.isActive === false && c.deactivationReason && <p className="max-w-[14rem] text-xs text-slate-500">{c.deactivationReason}</p>}
        </div>
      )
    }
  ];

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-950 dark:text-slate-100"><QrCode className="text-blue-700" /> Certificate Access</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Hide certificates from students, or deactivate them so QR verification is denied. Course settings apply to every certificate in that course.</p>
        </div>
        <button className="btn-secondary" type="button" onClick={load} disabled={loading}><RefreshCw size={16} /> Refresh</button>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">By course</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <article key={course._id} className={`card p-4 transition ${selectedCourse === course._id ? "ring-2 ring-blue-500" : ""}`}>
              <button type="button" className="w-full text-left" onClick={() => setSelectedCourse(selectedCourse === course._id ? "" : course._id)}>
                <p className="font-bold text-slate-950 dark:text-slate-100">{course.courseName}</p>
                <p className="font-mono text-xs text-slate-500">{course.courseCode}</p>
                <p className="mt-2 text-xs text-slate-500">{course.certificateCount} certificates · {course.hiddenCount} hidden · {course.inactiveCount} deactivated</p>
              </button>
              <div className="mt-3 flex flex-wrap gap-2">
                <Toggle on={course.certificatesVisible} disabled={busy === course._id} onChange={() => updateCourse(course, { certificatesVisible: !course.certificatesVisible })} onLabel="Visible to students" offLabel="Hidden from students" OnIcon={Eye} OffIcon={EyeOff} />
                <Toggle on={course.certificatesActive} disabled={busy === course._id} onChange={() => updateCourse(course, { certificatesActive: !course.certificatesActive })} onLabel="QR active" offLabel="QR deactivated" OnIcon={ShieldCheck} OffIcon={ShieldOff} />
              </div>
              {!course.certificatesActive && course.certificateDeactivationReason && <p className="mt-2 text-xs text-slate-500">Reason: {course.certificateDeactivationReason}</p>}
            </article>
          ))}
        </div>
        {!loading && !courses.length && <div className="card p-8 text-center text-slate-500">No courses found.</div>}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Individual certificates</h3>
        <div className="card grid gap-3 p-4 md:grid-cols-[2fr_1.5fr_1fr]">
          <label className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={17} /><input className="input pl-9" placeholder="Student name, ID, or certificate ID" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
          <select className="input" value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
            <option value="">All courses</option>
            {courses.map((course) => <option key={course._id} value={course._id}>{course.courseName}</option>)}
          </select>
          <select className="input" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="ALL">All statuses</option>
            <option value="HIDDEN">Hidden from students</option>
            <option value="INACTIVE">QR deactivated</option>
          </select>
        </div>
        {loading ? <TableSkeleton columns={6} /> : <DataTable columns={columns} rows={rows} empty="No certificates match these filters." />}
      </section>

      {deactivation && <DeactivateDialog request={deactivation} busy={Boolean(deactivation.busy)} onCancel={() => setDeactivation(null)} onConfirm={confirmDeactivation} />}
    </div>
  );
}
