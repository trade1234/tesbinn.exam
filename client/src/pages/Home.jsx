import { ArrowRight, ClipboardCheck, FileText, GraduationCap, MessageSquareText, ShieldCheck, Star } from "lucide-react";
import logoUrl from "../logo/download.png";

const serviceLinks = [
  {
    title: "Online Exam Portal",
    description: "Sign in to take scheduled exams, answer questions, and view your result after submission.",
    href: "#/login",
    icon: GraduationCap,
    tone: "blue",
    action: "Open exam"
  },
  {
    title: "Evaluation Form",
    description: "Submit your training or service evaluation using the official online evaluation form.",
    href: "https://tessbin-evaluation-tdkp.vercel.app/",
    icon: ClipboardCheck,
    tone: "emerald",
    action: "Open evaluation"
  },
  {
    title: "Google Review",
    description: "Share your public review and feedback for Trade Ethiopia School of Business and Innovation.",
    href: "https://g.page/r/CWgOATTV5eTTEBM/review",
    icon: Star,
    tone: "amber",
    action: "Write review"
  },
  {
    title: "Application Form",
    description: "Fill out the online application form and upload the required documents.",
    href: "#/apply",
    icon: FileText,
    tone: "purple",
    action: "Apply now"
  }
];

const toneClasses = {
  blue: "bg-blue-50 text-[#0f88d2] ring-blue-100 group-hover:bg-[#0f88d2] group-hover:text-white",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100 group-hover:bg-emerald-600 group-hover:text-white",
  amber: "bg-amber-50 text-amber-700 ring-amber-100 group-hover:bg-amber-500 group-hover:text-white",
  purple: "bg-purple-50 text-purple-700 ring-purple-100 group-hover:bg-purple-600 group-hover:text-white"
};

function isExternalLink(href) {
  return /^https?:\/\//.test(href);
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#edf4fb] text-slate-950">
      <nav className="border-b border-blue-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <div className="logo-tile flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white p-2 shadow-[0_12px_28px_rgba(15,84,122,0.14)] sm:h-16 sm:w-16">
              <img className="h-full w-full object-contain" src={logoUrl} alt="Trade Ethiopia logo" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight tracking-wide text-slate-950 sm:text-base">Trade Ethiopia SBI</p>
              <p className="truncate text-xs font-semibold text-[#0f88d2]">TESBINN Online Services</p>
            </div>
          </div>
          <a className="hidden shrink-0 items-center gap-2 rounded-lg bg-[#0f7ead] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#096f9b] sm:inline-flex" href="#/login">
            Exam login <ArrowRight size={16} />
          </a>
        </div>
      </nav>

      <section className="mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl gap-6 px-4 py-6 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center lg:px-10">
        <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-[0_24px_70px_rgba(30,41,59,0.12)] sm:p-8 lg:p-10">
          <div className="mb-7 flex items-center gap-4">
            <div className="logo-tile flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,84,122,0.16)] sm:h-24 sm:w-24">
              <img className="h-full w-full object-contain" src={logoUrl} alt="Trade Ethiopia logo" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#0f88d2]">Online service gateway</p>
              <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">Choose Your Service</h1>
            </div>
          </div>

          <p className="max-w-2xl text-base font-medium leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Welcome to Trade Ethiopia School of Business and Innovation. Select the service you need: exam portal, evaluation form, Google review, or application form.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#edf6ff] p-4">
              <p className="text-2xl font-black text-[#0f88d2]">4</p>
              <p className="text-xs font-bold uppercase text-slate-500">Online links</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <ShieldCheck className="mb-2 text-emerald-600" size={22} />
              <p className="text-sm font-bold text-emerald-800">Official access</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4">
              <MessageSquareText className="mb-2 text-amber-600" size={22} />
              <p className="text-sm font-bold text-amber-800">Feedback ready</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {serviceLinks.map(({ title, description, href, icon: Icon, tone, action }) => {
            const external = isExternalLink(href);

            return (
            <a
              key={title}
              className="group flex min-h-[220px] flex-col justify-between rounded-2xl border border-blue-100 bg-white p-5 shadow-[0_16px_45px_rgba(30,41,59,0.08)] transition hover:-translate-y-1 hover:border-[#1e9bf0] hover:shadow-[0_26px_70px_rgba(30,155,240,0.16)] focus:outline-none focus:ring-4 focus:ring-blue-100"
              href={href}
              target={external ? "_blank" : undefined}
              rel={external ? "noreferrer" : undefined}
            >
              <div>
                <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ring-4 transition ${toneClasses[tone]}`}>
                  <Icon size={26} />
                </div>
                <h2 className="text-xl font-black tracking-tight text-slate-950">{title}</h2>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{description}</p>
              </div>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#0f88d2] transition group-hover:translate-x-1">
                {action} <ArrowRight size={17} />
              </span>
            </a>
            );
          })}
        </div>
      </section>
    </main>
  );
}