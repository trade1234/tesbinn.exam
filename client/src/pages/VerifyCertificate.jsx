import { useEffect, useState } from "react";
import { Award, CheckCircle2, LoaderCircle, ShieldCheck, ShieldOff, XCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api } from "../services/api.js";

function formatPercentage(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "--";
  return `${Number.isInteger(num) ? num : Number(num.toFixed(2))}%`;
}

function formatResultNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "--";
  return Number.isInteger(num) ? String(num) : Number(num.toFixed(2)).toString();
}

export default function VerifyCertificate(){
  const {certificateId}=useParams();
  const [state,setState]=useState({loading:true,verified:false,certificate:null,message:""});
  useEffect(()=>{api.get(`/certificates/verify/${encodeURIComponent(certificateId)}`).then(({data})=>setState({loading:false,...data,message:data.message||""})).catch((error)=>setState({loading:false,verified:false,certificate:null,message:error.response?.data?.message||"Certificate could not be verified"}))},[certificateId]);
  if(state.loading)return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><div className="flex items-center gap-3 text-slate-600"><LoaderCircle className="animate-spin"/> Verifying certificate…</div></main>;
  if(state.deactivated)return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-xl" role="status" aria-live="polite"><ShieldOff className="mx-auto text-red-500" size={64}/><p className="mt-4 text-sm font-extrabold uppercase tracking-[.25em] text-red-600">QR scan result</p><h1 className="mt-2 text-3xl font-black text-red-700">NOT VERIFIED</h1><p className="mt-3 font-semibold text-slate-700">This certificate has been deactivated{state.certificate?.companyName?` by ${state.certificate.companyName}`:""}.</p><p className="mt-2 text-slate-500">{state.message}</p>{state.certificate&&<div className="mt-6 grid gap-3 text-left">{[["Certificate ID",state.certificate.certificateId],["Certificate holder",state.certificate.studentName],["Program",state.certificate.courseName]].map(([label,value])=><div key={label} className="rounded-xl border border-slate-200 p-3"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 font-semibold text-slate-900">{value}</p></div>)}</div>}<Link className="btn-primary mt-6 inline-flex" to="/">Return home</Link></section></main>;
  if(!state.verified)return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-xl"><XCircle className="mx-auto text-red-500" size={64}/><h1 className="mt-5 text-3xl font-bold text-slate-950">Not verified</h1><p className="mt-3 text-slate-500">{state.message}</p><Link className="btn-primary mt-6 inline-flex" to="/">Return home</Link></section></main>;
  const c=state.certificate;
  const resultDisplay = (Number.isFinite(Number(c.score)) && Number.isFinite(Number(c.totalMarks)) && Number(c.totalMarks) > 0)
    ? `${c.status} · ${formatResultNumber(c.score)}/${formatResultNumber(c.totalMarks)} (${formatPercentage(c.percentage)})`
    : `${c.status} · ${formatPercentage(c.percentage)}`;

  return <main className="min-h-screen bg-gradient-to-br from-[#061e48] via-[#064c91] to-[#0b85ce] p-5 sm:p-10"><section className="mx-auto max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl" role="status" aria-live="polite"><div className="bg-emerald-50 px-6 py-9 text-center sm:px-10"><div className="relative mx-auto w-fit"><ShieldCheck className="text-emerald-600" size={82}/><CheckCircle2 className="absolute -bottom-1 -right-2 rounded-full bg-white text-emerald-500" size={32}/></div><p className="mt-4 text-sm font-extrabold uppercase tracking-[.25em] text-emerald-700">QR scan successful</p><h1 className="mt-2 text-4xl font-black tracking-wide text-emerald-700 sm:text-5xl">VERIFIED</h1><p className="mt-3 font-semibold text-slate-700">This certificate is authentic.</p><p className="mt-1 text-sm text-slate-600">Issued by {c.companyName}</p></div><div className="grid gap-5 p-6 sm:grid-cols-2 sm:p-10">{[["Certificate holder",c.studentName],["Certificate ID",c.certificateId],["Program",c.courseName],["Assessment",c.examName],["Result",resultDisplay],["Issue date",new Date(c.issueDate).toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"})]].map(([label,value])=><div key={label} className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 font-semibold text-slate-900">{value}</p></div>)}</div><div className="flex items-center justify-center gap-2 border-t border-slate-100 px-6 py-5 text-sm font-semibold text-blue-700"><Award size={18}/> Digitally signed by {c.signatoryName}</div></section></main>;
}