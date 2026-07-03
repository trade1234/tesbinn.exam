import { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, GraduationCap, Trophy } from "lucide-react";
import { api } from "../services/api.js";
import logoUrl from "../logo/download.png";

const covers = [
  "bg-[linear-gradient(135deg,#ff7a18,#e11d48,#f59e0b)]",
  "bg-[linear-gradient(135deg,#bae6fd,#f8fafc_55%,#dbeafe)]",
  "bg-[linear-gradient(135deg,#0f766e,#22c55e,#065f46)]",
  "bg-[linear-gradient(135deg,#38bdf8,#2563eb,#7c3aed)]"
];

function StudentMetric({ label, value, icon: Icon, color }) {
  return (
    <div className="min-w-0 rounded-xl bg-white p-4 sm:p-6 shadow-[0_18px_45px_rgba(30,41,59,0.07)] dark:bg-[#111a2b] dark:shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
      <div className="flex min-w-0 items-center justify-between gap-3 sm:gap-4">
        <div>
          <p className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight sm:text-4xl">{value ?? 0}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
          <Icon size={23} />
        </div>
      </div>
    </div>
  );
}

function CourseCard({ course, index }) {
  const progress = [76, 32, 46, 64][index % 4];
  const barColors = ["bg-[#5b8def]", "bg-[#ee845e]", "bg-[#56dd70]", "bg-[#1e9bf0]"];

  return (
    <div>
      <div className="overflow-hidden rounded-xl bg-white shadow-[0_18px_45px_rgba(30,41,59,0.08)] dark:bg-[#111a2b] dark:shadow-[0_18px_45px_rgba(0,0,0,0.24)]">
        <div className={`h-36 ${covers[index % covers.length]}`} />
        <div className="p-5 sm:p-7">
          <p className="text-sm font-semibold text-[#0f88d2]">{course.courseCode}</p>
          <h3 className="mt-2 break-words text-lg font-semibold sm:text-xl text-slate-950 dark:text-slate-100">{course.courseName}</h3>
          <p className="mt-5 min-h-16 text-sm leading-7 text-slate-500 dark:text-slate-400">{course.description || "Course materials and available exams are organized in this portal."}</p>
          <div className="mt-6 flex -space-x-3">
            {["#f97316", "#64748b", "#0ea5e9", "#ec4899"].map((color, avatarIndex) => (
              <span key={color} className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white dark:border-[#111a2b] text-xs font-semibold text-white" style={{ backgroundColor: color }}>{avatarIndex + 1}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-5 rounded-xl bg-white p-5 sm:p-7 shadow-[0_18px_45px_rgba(30,41,59,0.07)] dark:bg-[#111a2b] dark:shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
        <div className="flex items-center gap-5">
          <div className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
            <div className={`h-1.5 rounded-full ${barColors[index % barColors.length]}`} style={{ width: `${progress}%` }} />
          </div>
          <span className="font-semibold text-slate-500 dark:text-slate-400">{progress}%</span>
        </div>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/users/dashboard/student").then((res) => setData(res.data)); }, []);
  const courses = data?.courses || [];
  const upcoming = data?.upcomingExams || [];
  const recent = data?.recentResults || [];

  return (
    <div className="min-w-0 space-y-6 sm:space-y-10">
      <div className="rounded-xl bg-white p-3 shadow-[0_10px_28px_rgba(30,41,59,0.06)] dark:bg-[#111a2b] sm:flex sm:items-center sm:justify-between sm:gap-4 sm:p-0 sm:shadow-none sm:dark:bg-transparent">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="logo-tile flex h-12 w-12 shrink-0 sm:h-14 sm:w-14 items-center justify-center overflow-hidden rounded-full border border-slate-100 bg-white p-1.5 shadow-sm dark:border-white/70 dark:bg-white">
            <img className="h-full w-full object-contain" src={logoUrl} alt="Trade Ethiopia logo" />
          </div>
          <div>
            <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl text-slate-950 dark:text-slate-100">Exams</h1>
            <p className="mt-1 line-clamp-2 break-words text-sm leading-5 text-slate-500 sm:mt-2 sm:text-base dark:text-slate-400">{data?.profile?.name || "Student"} Ã‚Â· {data?.profile?.trainingTaken || "Not assigned"}</p>
          </div>
        </div>
        <select className="mt-3 w-full rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-800 dark:bg-[#0f172a] dark:text-slate-100 sm:mt-0 sm:w-44 sm:border-0 sm:bg-white sm:px-5 sm:py-4 sm:text-base sm:shadow-[0_18px_45px_rgba(30,41,59,0.07)] sm:dark:bg-[#111a2b]">
          <option>All exams</option>
          <option>Upcoming exams</option>
        </select>
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-3">
        <StudentMetric label="Active Courses" value={courses.length} icon={GraduationCap} color="bg-[#edf6ff] text-[#0f88d2]" />
        <StudentMetric label="Upcoming Exams" value={upcoming.length} icon={CalendarClock} color="bg-[#fff7ed] text-[#f97316]" />
        <StudentMetric label="Recent Results" value={recent.length} icon={Trophy} color="bg-[#fdf2f8] text-[#ec4899]" />
      </div>

      <div className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-3 xl:gap-9">
        {courses.slice(0, 6).map((course, index) => <CourseCard key={course._id} course={course} index={index} />)}
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)] xl:gap-8">
        <section className="min-w-0 rounded-xl bg-white p-4 sm:p-7 shadow-[0_18px_45px_rgba(30,41,59,0.07)] dark:bg-[#111a2b] dark:shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
          <h2 className="text-lg font-semibold sm:text-xl text-slate-950 dark:text-slate-100">Profile</h2>
          <div className="mt-6 min-w-0 rounded-xl bg-[#edf6ff] p-4 sm:p-5 dark:bg-[#17324d]">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#ff9b71] to-[#ec5cff] text-lg font-semibold text-white">
                {data?.profile?.name?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "ST"}
              </div>
              <div>
                <p className="break-words text-lg font-semibold sm:text-xl text-slate-950 dark:text-slate-100">{data?.profile?.name}</p>
                <p className="break-all text-sm text-slate-500 dark:text-slate-400">{data?.profile?.email}</p>
              </div>
            </div>
            <div className="mt-5 grid min-w-0 gap-2 text-sm">
              <p className="break-words font-semibold text-[#0f88d2]">Student ID: {data?.profile?.enrollmentNumber || "No student ID"}</p>
              <p className="break-words font-semibold text-slate-700 dark:text-slate-200">Training taken: {data?.profile?.trainingTaken || "Not assigned"}</p>
              <p className="break-all text-slate-500 dark:text-slate-400">Email: {data?.profile?.email}</p>
            </div>
          </div>
        </section>

        <section className="min-w-0 rounded-xl bg-white p-4 sm:p-7 shadow-[0_18px_45px_rgba(30,41,59,0.07)] dark:bg-[#111a2b] dark:shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold sm:text-xl text-slate-950 dark:text-slate-100">Upcoming Exams</h2>
            <CheckCircle2 className="text-[#1e9bf0]" />
          </div>
          <div className="mt-6 space-y-4">
            {upcoming.length ? upcoming.filter(Boolean).map((exam) => (
              <div key={exam._id} className="flex flex-col justify-between gap-3 rounded-xl border border-slate-100 p-4 dark:border-slate-800 dark:bg-[#0f172a] sm:flex-row sm:items-center">
                <div>
                  <p className="font-semibold text-slate-950 dark:text-slate-100">{exam.title}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{exam.courseId?.courseName}</p>
                </div>
                <p className="rounded-lg bg-[#edf6ff] px-3 py-2 text-sm font-semibold text-[#0f88d2]">{new Date(exam.startDate).toLocaleDateString()}</p>
              </div>
            )) : <p className="rounded-xl bg-slate-50 p-5 text-slate-500 dark:bg-slate-800 dark:text-slate-400">No upcoming exams.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}











