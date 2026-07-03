import logoUrl from "../logo/download.png";

export default function Brand({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="logo-tile flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-blue-100 bg-white p-1 shadow-soft dark:border-white/70 dark:bg-white">
        <img className="h-full w-full object-contain" src={logoUrl} alt="Trade Ethiopia logo" />
      </div>
      {!compact && (
        <div>
          <p className="text-base font-bold text-ink dark:text-slate-100">Trade Ethiopia SBI</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">TESBINN FINAL EXAMINATION</p>
        </div>
      )}
    </div>
  );
}







