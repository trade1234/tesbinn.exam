import { useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { downloadFile } from "../services/api.js";

const exportGroups = [
  { title: "Application data", description: "Export every submitted application. Uploaded photos, ID images, and payment screenshots are excluded from Excel.", excelPath: "/applications/export/excel", excelName: "all-applications.xlsx", pdfPath: "/applications/export/pdf", pdfName: "all-applications.pdf" },
  { title: "Student registration data", description: "Export all registered students and their enrollment details.", excelPath: "/users/students/export/excel", excelName: "student-registrations.xlsx", pdfPath: "/users/students/export/pdf", pdfName: "student-registrations.pdf" }
];

export default function DataExports() {
  const [downloading, setDownloading] = useState("");
  const [error, setError] = useState("");

  async function exportData(path, filename) {
    setDownloading(filename);
    setError("");
    try { await downloadFile(path, filename); }
    catch (exportError) { setError(exportError.message); }
    finally { setDownloading(""); }
  }

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-100">Data exports</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Download application and student registration records in Excel or PDF format.</p>
      </div>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
      <div className="grid gap-5 lg:grid-cols-2">
        {exportGroups.map((group) => (
          <section key={group.title} className="card p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0f88d2] dark:bg-[#17324d] dark:text-sky-300"><Download size={22} /></span>
              <div>
                <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">{group.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{group.description}</p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button className="btn-primary" type="button" disabled={Boolean(downloading)} onClick={() => exportData(group.excelPath, group.excelName)}><FileSpreadsheet size={17} /> {downloading === group.excelName ? "Exporting..." : "Export Excel"}</button>
              <button className="btn-secondary" type="button" disabled={Boolean(downloading)} onClick={() => exportData(group.pdfPath, group.pdfName)}><FileText size={17} /> {downloading === group.pdfName ? "Exporting..." : "Export PDF"}</button>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
