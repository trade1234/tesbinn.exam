export default function DataTable({ columns, rows, empty = "No records found" }) {
  const safeRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
  return (
    <div className="card min-w-0 overflow-hidden">
      <div className="md:hidden">
        {safeRows.length ? (
          <div className="divide-y divide-blue-50 dark:divide-slate-800">
            {safeRows.map((row, index) => (
              <article key={row?._id || index} className="min-w-0 space-y-3 bg-white p-3 dark:bg-[#111a2b] min-[420px]:p-4">
                {columns.map((column) => (
                  <div key={column.key} className="grid min-w-0 gap-1">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{column.label}</p>
                    <div className="min-w-0 break-words text-sm text-slate-800 dark:text-slate-100">
                      {column.render ? column.render(row) : row?.[column.key]}
                    </div>
                  </div>
                ))}
              </article>
            ))}
          </div>
        ) : (
          <div className="bg-white px-4 py-8 text-center text-sm text-slate-500 dark:bg-[#111a2b] dark:text-slate-400">{empty}</div>
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-left text-sm text-slate-700 dark:text-slate-200">
          <thead className="bg-blue-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-[#17324d] dark:text-slate-300">
            <tr>{columns.map((column) => <th key={column.key} className="px-3 py-3 lg:px-4">{column.label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-blue-50 dark:divide-slate-800">
            {safeRows.length ? safeRows.map((row, index) => (
              <tr key={row?._id || index} className="bg-white transition hover:bg-slate-50 dark:bg-[#111a2b] dark:hover:bg-[#17223a]">
                {columns.map((column) => <td key={column.key} className="px-3 py-3 align-top lg:px-4">{column.render ? column.render(row) : row?.[column.key]}</td>)}
              </tr>
            )) : (
              <tr className="bg-white dark:bg-[#111a2b]"><td className="px-4 py-8 text-center text-slate-500 dark:text-slate-400" colSpan={columns.length}>{empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

