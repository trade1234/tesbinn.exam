export default function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="card min-w-0 p-4 sm:p-5">
      <div className="flex min-w-0 items-center justify-between gap-3 sm:gap-4">
        <div>
          <p className="truncate text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-ink sm:text-3xl">{value ?? 0}</p>
        </div>
        {Icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Icon size={24} />
          </div>
        )}
      </div>
    </div>
  );
}


