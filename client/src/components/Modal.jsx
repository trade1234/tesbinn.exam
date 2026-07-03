import { X } from "lucide-react";

export default function Modal({ title, children, onClose, widthClass = "max-w-2xl" }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/30 p-2 sm:items-center sm:p-4">
      <div className={`card max-h-[92dvh] w-full ${widthClass} overflow-auto p-4 sm:max-h-[90vh] sm:p-5`}>
        <div className="mb-5 flex min-w-0 items-center justify-between gap-3">
          <h2 className="min-w-0 break-words text-lg font-bold text-ink dark:text-slate-100">{title}</h2>
          <button className="btn-secondary px-2" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}


