import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, Lock, Monitor, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { apiBaseURL } from "../services/api.js";
import logoUrl from "../logo/download.png";

export default function Login() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const [resetMessage, setResetMessage] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(() => {
    return new URLSearchParams(window.location.search).get("expired") === "true";
  });
  const { register, handleSubmit } = useForm({
    defaultValues: { identifier: "", password: "" }
  });

  if (user) return <Navigate to={user.role === "ADMIN" ? "/admin" : "/student"} replace />;

  async function onSubmit(values) {
    setError("");
    setSessionExpired(false);
    try {
      const loggedIn = await login({ identifier: values.identifier, password: values.password });
      navigate(loggedIn.role === "ADMIN" ? "/admin" : "/student");
    } catch (err) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.request) {
        setError(`Cannot reach the backend API. Check Render frontend VITE_API_URL. Current API URL: ${apiBaseURL || "not configured"}`);
      } else {
        setError(err.message || "Login failed");
      }
    }
  }


  return (
    <main className="min-h-screen bg-[#d9eef8] px-3 py-4 text-slate-950 sm:px-8 sm:py-8 lg:flex lg:items-center lg:justify-center">
      <section className="relative mx-auto grid w-full max-w-7xl overflow-hidden bg-white shadow-[0_28px_80px_rgba(15,84,122,0.25)] lg:grid-cols-[1.04fr_0.96fr]">
        <button type="button" className="absolute left-4 top-4 sm:left-7 sm:top-7 z-10 text-slate-900" aria-label="Back to home" onClick={() => navigate("/")}>
          <ArrowLeft size={34} strokeWidth={2.8} />
        </button>

        <div className="relative hidden overflow-hidden bg-[#f4fbff] lg:flex lg:items-center lg:justify-center">
          <div className="absolute -top-28 left-72 h-72 w-72 rounded-full bg-[#e1f1f9]" />
          <div className="absolute bottom-[-150px] left-[-70px] h-96 w-96 rounded-full bg-[#e4f4fb]" />
          <div className="absolute bottom-20 right-20 h-32 w-32 rounded-full bg-[#e1f1f9]" />
          <div className="relative z-10 flex max-w-md flex-col items-center px-10 text-center">
            <div className="flex h-72 w-72 items-center justify-center overflow-hidden rounded-full border border-white bg-white p-6 shadow-[0_28px_70px_rgba(15,84,122,0.18)]">
              <img className="h-full w-full object-contain" src={logoUrl} alt="TESSIB logo" />
            </div>
            <h2 className="mt-8 text-3xl font-semibold leading-tight text-slate-950">Trade Ethiopia School of Business and Innovation</h2>
            <p className="mt-4 text-base font-medium leading-7 text-slate-600">Online Examination Portal</p>
          </div>
        </div>

        <div className="relative flex items-center justify-center bg-white px-4 py-10 sm:px-10 sm:py-12">

          <div className="w-full max-w-[520px] rounded-2xl bg-white px-2 py-8 sm:px-10">
            <div className="mb-9 text-center">
              <div className="mx-auto mb-5 flex h-24 w-24 sm:h-32 sm:w-32 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white p-2 shadow-[0_16px_35px_rgba(15,84,122,0.16)]">
                <img className="h-full w-full object-contain" src={logoUrl} alt="Trade Ethiopia logo" />
              </div>
              <h1 className="text-2xl font-semibold leading-tight tracking-wide text-black sm:text-3xl">Trade Ethiopia School of Business and Innovation</h1>
              <p className="mt-3 text-lg font-semibold uppercase sm:mt-4 sm:text-xl text-[#2c9ad0]">Online Examination Portal</p>
            </div>

            <form className="space-y-6 sm:space-y-7" onSubmit={handleSubmit(onSubmit)}>
              <label className="block">
                <span className="sr-only">Student ID</span>
                <div className="flex items-center border-b border-slate-500 focus-within:border-[#2c9ad0]">
                  <UserRound size={18} className="mr-3 text-slate-500" />
                  <input className="w-full bg-transparent py-3 text-base outline-none placeholder:text-slate-400" placeholder="Student ID" {...register("identifier", { required: true })} />
                </div>
              </label>

              <label className="block">
                <span className="sr-only">Password</span>
                <div className="flex items-center border-b border-slate-500 focus-within:border-[#2c9ad0]">
                  <Lock size={18} className="mr-3 text-slate-500" />
                  <input className="w-full bg-transparent py-3 text-base outline-none placeholder:text-slate-400" type={showPassword ? "text" : "password"} placeholder="Password" {...register("password", { required: true })} />
                  <button type="button" className="text-slate-500" onClick={() => setShowPassword((value) => !value)} aria-label="Toggle password visibility">
                    <Eye size={24} />
                  </button>
                </div>
              </label>


              {sessionExpired && !error && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-start gap-2.5">
                  <Monitor size={18} className="mt-0.5 shrink-0" />
                  <p><strong>Session Terminated:</strong> You have been logged out because this account was logged in on another browser or device.</p>
                </div>
              )}

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              {resetMessage && <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{resetMessage}</p>}

              <button className="mx-auto flex w-full max-w-sm items-center justify-center rounded-md bg-[#2b9bd0] px-6 py-3 text-lg sm:py-4 sm:text-2xl font-semibold text-white shadow-sm transition hover:bg-[#208abd] disabled:bg-sky-200" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}













