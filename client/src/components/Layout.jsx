import { AlertCircle, Bell, BookOpen, ChevronDown, ClipboardList, Clock3, FileBarChart, FileCheck2, Home, LogOut, Moon, Radio, Search, Settings, Sun, UserRound, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";
import logoUrl from "../logo/download.png";

function isLiveExam(exam, now = new Date()) {
  const start = exam.startDate ? new Date(exam.startDate) : null;
  const end = exam.endDate ? new Date(exam.endDate) : null;
  return !exam.isPaused && start && end && now >= start && now <= end;
}

function isUpcomingExam(exam, now = new Date()) {
  const start = exam.startDate ? new Date(exam.startDate) : null;
  if (!start) return false;
  const minutesUntilStart = (start.getTime() - now.getTime()) / 60000;
  return minutesUntilStart > 0 && minutesUntilStart <= 30;
}

function formatTime(value) {
  return value ? new Date(value).toLocaleString() : "Not set";
}

export default function Layout({ role }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("portal_theme") === "dark");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);
  const liveExamIdsRef = useRef(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    localStorage.setItem("portal_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    if (!user) return undefined;

    let stopped = false;

    async function loadNotifications() {
      try {
        const now = new Date();
        const { data: exams } = await api.get("/exams");
        if (stopped) return;

        const liveExams = exams.filter((exam) => isLiveExam(exam, now));
        const upcomingExams = exams.filter((exam) => isUpcomingExam(exam, now));
        const pausedExams = exams.filter((exam) => exam.isPaused);
        const items = [];

        if (role === "STUDENT") {
          liveExams.forEach((exam) => {
            items.push({
              id: `student-live-${exam._id}`,
              title: "Exam is live",
              message: `${exam.title} is ready to start now.`,
              time: formatTime(exam.startDate),
              tone: "emerald"
            });
          });

          upcomingExams.forEach((exam) => {
            items.push({
              id: `student-upcoming-${exam._id}`,
              title: "Exam starts soon",
              message: `${exam.title} starts at ${formatTime(exam.startDate)}.`,
              time: formatTime(exam.startDate),
              tone: "amber"
            });
          });
        } else {
          items.push({
            id: "admin-live-count",
            title: `${liveExams.length} live exam${liveExams.length === 1 ? "" : "s"}`,
            message: liveExams.length ? liveExams.map((exam) => exam.title).join(", ") : "No exam is currently live.",
            time: now.toLocaleTimeString(),
            tone: liveExams.length ? "emerald" : "slate"
          });

          if (pausedExams.length) {
            items.push({
              id: "admin-paused-exams",
              title: `${pausedExams.length} paused exam${pausedExams.length === 1 ? "" : "s"}`,
              message: pausedExams.map((exam) => exam.title).join(", "),
              time: now.toLocaleTimeString(),
              tone: "orange"
            });
          }

          const { data: activeAttempts } = await api.get("/results/active");
          if (!stopped) {
            items.push({
              id: "admin-active-attempts",
              title: `${activeAttempts.length} active student session${activeAttempts.length === 1 ? "" : "s"}`,
              message: activeAttempts.length ? "Students are currently taking exams." : "No active student exam sessions.",
              time: now.toLocaleTimeString(),
              tone: activeAttempts.length ? "sky" : "slate"
            });
          }
        }

        const currentLiveIds = new Set(liveExams.map((exam) => exam._id));
        if (role === "STUDENT") {
          const newLiveExam = liveExams.find((exam) => !liveExamIdsRef.current.has(exam._id));
          if (initializedRef.current && newLiveExam) {
            setToast({ title: "Exam started", message: `${newLiveExam.title} is now available.` });
            window.setTimeout(() => setToast(null), 6000);
          }
        }

        liveExamIdsRef.current = currentLiveIds;
        initializedRef.current = true;
        setNotifications(items);
      } catch (error) {
        if (!stopped) {
          setNotifications([{ id: "notification-error", title: "Notifications unavailable", message: "Could not refresh notifications right now.", time: new Date().toLocaleTimeString(), tone: "red" }]);
        }
      }
    }

    loadNotifications();
    const interval = window.setInterval(loadNotifications, 15000);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [role, user]);

  const adminLinks = [
    { to: "/admin", label: "Dashboard", icon: Home },
    { to: "/admin/courses", label: "Courses", icon: BookOpen },
    { to: "/admin/exams", label: "Exams", icon: ClipboardList },
    { to: "/admin/students", label: "Students", icon: Users },
    { to: "/admin/applications", label: "Applications", icon: FileCheck2 },
    { to: "/admin/results", label: "Results", icon: FileBarChart },
    { to: "/admin/monitor", label: "Live Monitor", icon: Radio }
  ];
  const studentLinks = [
    { to: "/student", label: "Dashboard", icon: Home },
    { to: "/student/courses", label: "Exams", icon: BookOpen },
    { to: "/student/results", label: "Results", icon: FileBarChart },
    { to: "/student/profile", label: "Profile", icon: Settings }
  ];
  const links = role === "ADMIN" ? adminLinks : studentLinks;
  const groups = role === "ADMIN"
    ? [
      { label: "Courses", to: "/admin/courses" },
      { label: "Exams", to: "/admin/exams" },
      { label: "Students", to: "/admin/students" },
      { label: "Applications", to: "/admin/applications" },
      { label: "Live Security", to: "/admin/monitor" }
    ]
    : [
      { label: "Active", to: "/student/courses?group=active" },
      { label: "Upcoming", to: "/student/courses?group=upcoming" },
      { label: "Completed", to: "/student/courses?group=completed" }
    ];
  const initials = user?.name?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "U";
  const unreadCount = notifications.filter((item) => item.tone !== "slate").length;

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="min-h-screen bg-[#e9eef6] p-0 text-slate-950 transition-colors dark:bg-[#101827] dark:text-slate-100 lg:p-6 xl:p-8">
        {toast && (
          <div className="fixed right-5 top-5 z-50 max-w-sm rounded-xl border border-emerald-200 bg-white p-4 text-slate-950 shadow-[0_24px_70px_rgba(16,185,129,0.25)] dark:border-emerald-900 dark:bg-[#111a2b] dark:text-slate-100">
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                <Bell size={18} />
              </div>
              <div>
                <p className="font-bold">{toast.title}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{toast.message}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto min-h-screen max-w-[1500px] overflow-hidden bg-white shadow-[0_26px_70px_rgba(35,45,70,0.18)] transition-colors dark:bg-[#141f33] dark:shadow-[0_26px_70px_rgba(0,0,0,0.38)] lg:min-h-[calc(100vh-4rem)] lg:rounded-xl">
          <div className="grid min-h-screen lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="hidden border-r border-slate-100 bg-white transition-colors dark:border-slate-800 dark:bg-[#111a2b] lg:flex lg:flex-col">
              <div className="flex h-[92px] items-center gap-4 border-b border-slate-100 px-5 xl:px-8 transition-colors dark:border-slate-800">
                <div className="logo-tile flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-100 bg-white p-1.5 shadow-sm dark:border-white/70 dark:bg-white">
                  <img className="h-full w-full object-contain" src={logoUrl} alt="Trade Ethiopia logo" />
                </div>
                <div>
                  <p className="text-2xl font-semibold tracking-tight">{role === "ADMIN" ? "Admin" : "Exams"}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Trade Ethiopia SBI</p>
                </div>
              </div>

              <nav className="flex-1 px-0 py-9">
                <p className="mb-6 px-5 text-sm uppercase xl:px-9 text-slate-400 dark:text-slate-500">Menu</p>
                <div className="space-y-3 px-4 xl:px-6">
                  {links.map(({ to, label, icon: Icon }) => (
                    <NavLink key={to} end to={to} className={({ isActive }) => `group flex min-h-12 items-center gap-4 rounded-xl border px-4 py-3 text-sm font-semibold shadow-sm xl:text-base transition ${isActive ? "border-[#1e9bf0] bg-[#edf6ff] text-[#0f88d2] shadow-blue-100 dark:border-[#38bdf8] dark:bg-[#17324d] dark:text-[#7dd3fc] dark:shadow-none" : "border-slate-100 bg-white text-slate-700 hover:border-blue-100 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#111a2b] dark:text-slate-300 dark:hover:bg-slate-800/70"}`}>
                      {({ isActive }) => (
                        <>
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${isActive ? "bg-[#1e9bf0] text-white" : "bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-[#0f88d2] dark:bg-slate-800 dark:text-slate-400"}`}>
                            <Icon size={19} />
                          </span>
                          <span>{label}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>

                <p className="mb-6 mt-12 px-5 text-sm uppercase xl:px-9 text-slate-400 dark:text-slate-500">Groups</p>
                <div className="space-y-3 px-4 xl:px-6">
                  {groups.map((group, index) => (
                    <button key={group.label} className="flex min-h-11 w-full items-center gap-4 rounded-xl border border-slate-100 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-100 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#111a2b] dark:text-slate-300 dark:hover:bg-slate-800/70" type="button" onClick={() => navigate(group.to)}>
                      <span className={`h-4 w-4 rounded-full border-2 ${["border-[#f59e0b]", "border-[#8b5cf6]", "border-[#ec4899]", "border-[#10b981]"][index]}`} />
                      {group.label}
                    </button>
                  ))}
                </div>
              </nav>

              <div className="px-5 py-8 xl:px-9">
                <button className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-100 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-700" type="button" onClick={() => setDarkMode((value) => !value)}>
                  <span className="flex items-center gap-3">
                    {darkMode ? <Sun size={19} className="text-amber-300" /> : <Moon size={19} className="text-slate-400" />}
                    {darkMode ? "Light Mode" : "Dark Mode"}
                  </span>
                  <span className={`flex h-6 w-11 items-center rounded-full p-1 transition ${darkMode ? "bg-[#1e9bf0]" : "bg-slate-300"}`}>
                    <span className={`h-4 w-4 rounded-full bg-white transition ${darkMode ? "translate-x-5" : "translate-x-0"}`} />
                  </span>
                </button>
              </div>
            </aside>

            <main className="min-w-0 bg-[#fafafa] transition-colors dark:bg-[#0f172a]">
              <header className="sticky top-0 z-20 flex min-h-[58px] items-center justify-between gap-2 border-b border-slate-100 bg-white px-3 transition-colors dark:border-slate-800 dark:bg-[#111a2b] min-[420px]:min-h-[68px] min-[420px]:px-4 sm:min-h-[92px] sm:px-6 lg:px-8 xl:px-16">
                <div className="flex min-w-0 flex-1 items-center gap-2 sm:hidden">
                  <div className="logo-tile flex h-9 w-9 shrink-0 min-[420px]:h-11 min-[420px]:w-11 items-center justify-center overflow-hidden rounded-full border border-slate-100 bg-white p-1 shadow-sm dark:border-white/70 dark:bg-white">
                    <img className="h-full w-full object-contain" src={logoUrl} alt="Trade Ethiopia logo" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-bold min-[420px]:text-sm text-slate-950 dark:text-slate-100">Trade Ethiopia SBI</p>
                    <p className="hidden truncate text-xs text-slate-500 dark:text-slate-400 min-[420px]:block dark:text-slate-400">{role === "ADMIN" ? "Admin" : "Exams"}</p>
                  </div>
                </div>
                <div className="hidden min-w-0 flex-1 items-center gap-4 sm:flex">
                  <Search size={22} className="text-slate-500 dark:text-slate-400" />
                  <input className="w-full max-w-md bg-transparent text-base outline-none placeholder:text-slate-500 dark:text-slate-100 dark:placeholder:text-slate-500" placeholder="Search..." />
                </div>
                <div className="flex shrink-0 items-center gap-1.5 sm:gap-5">
                  <button className="hidden h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-600 transition hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 min-[420px]:inline-flex lg:hidden" type="button" onClick={() => setDarkMode((value) => !value)} aria-label="Toggle dark mode">
                    {darkMode ? <Sun size={19} /> : <Moon size={19} />}
                  </button>

                  <div className="relative">
                    <button className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-600 transition hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700" type="button" aria-label="Notifications" onClick={() => setNotificationsOpen((value) => !value)}>
                      <Bell size={18} />
                      {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unreadCount}</span>}
                    </button>

                    {notificationsOpen && (
                      <div className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-100 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-[#111a2b]">
                        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                          <p className="font-bold text-slate-950 dark:text-slate-100">Notifications</p>
                          <p className="text-xs font-semibold text-slate-400">{role === "ADMIN" ? "Admin" : "Student"}</p>
                        </div>
                        <div className="max-h-96 overflow-y-auto p-2">
                          {notifications.length ? notifications.map((item) => (
                            <div key={item.id} className="flex gap-3 rounded-lg p-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/70">
                              <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.tone === "emerald" ? "bg-emerald-500" : item.tone === "amber" ? "bg-amber-500" : item.tone === "orange" ? "bg-orange-500" : item.tone === "sky" ? "bg-sky-500" : item.tone === "red" ? "bg-red-500" : "bg-slate-300"}`} />
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
                                <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{item.message}</p>
                                <p className="mt-2 flex items-center gap-1 text-xs text-slate-400"><Clock3 size={12} /> {item.time}</p>
                              </div>
                            </div>
                          )) : (
                            <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                              <AlertCircle className="mx-auto mb-2 text-slate-300" size={28} />
                              No notifications yet.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button className="flex items-center gap-3 rounded-full pr-2 transition hover:bg-slate-50 dark:hover:bg-slate-800" type="button" onClick={() => setProfileOpen((value) => !value)} aria-label="Account menu">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#ff9b71] to-[#ec5cff] text-sm font-semibold text-white sm:h-12 sm:w-12 sm:text-lg">{initials}</div>
                      <ChevronDown size={16} className={`hidden text-slate-500 transition min-[420px]:block ${profileOpen ? "rotate-180" : ""}`} />
                    </button>

                    {profileOpen && (
                      <div className="absolute right-0 top-14 z-50 w-72 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-[#111a2b]">
                        <div className="border-b border-slate-100 px-4 py-4 dark:border-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#ff9b71] to-[#ec5cff] text-base font-bold text-white">{initials}</div>
                            <div className="min-w-0">
                              <p className="truncate font-bold text-slate-950 dark:text-slate-100">{user?.name || "User"}</p>
                              <p className="hidden truncate text-xs text-slate-500 dark:text-slate-400 min-[420px]:block dark:text-slate-400">{user?.email || user?.enrollmentNumber}</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-2">
                          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800" type="button" onClick={() => { setProfileOpen(false); navigate(role === "ADMIN" ? "/admin" : "/student/profile"); }}>
                            <UserRound size={17} /> {role === "ADMIN" ? "Admin Dashboard" : "My Profile"}
                          </button>
                          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800" type="button" onClick={() => setDarkMode((value) => !value)}>
                            {darkMode ? <Sun size={17} /> : <Moon size={17} />} {darkMode ? "Light Mode" : "Dark Mode"}
                          </button>
                          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30" type="button" onClick={() => { setProfileOpen(false); logout(); }}>
                            <LogOut size={17} /> Logout
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </header>

              <section className="min-w-0 px-3 pb-24 pt-4 min-[420px]:px-4 min-[420px]:pt-5 sm:px-6 lg:px-8 xl:px-16 lg:py-12 xl:py-16">
                <Outlet />
              </section>

              <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 py-2 shadow-[0_-12px_30px_rgba(15,23,42,0.14)] backdrop-blur dark:border-slate-800 dark:bg-[#111a2b]/95 lg:hidden">
                <div className="mx-auto flex max-w-2xl gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid" style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}>
                  {links.map(({ to, label, icon: Icon }) => (
                    <NavLink key={to} end to={to} className={({ isActive }) => `flex min-h-14 min-w-[72px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold transition sm:min-w-0 sm:text-[11px] ${isActive ? "bg-[#0f88d2] text-white dark:bg-[#1e9bf0]" : "text-slate-500 hover:bg-blue-50 hover:text-[#0f88d2] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-[#7dd3fc]"}` }>
                      <Icon size={19} />
                      <span className="max-w-full truncate">{label}</span>
                    </NavLink>
                  ))}
                </div>
              </nav>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}














