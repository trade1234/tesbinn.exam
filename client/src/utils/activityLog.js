export function activityAction(row) {
  if (row.action === "STAFF_ACTION" && /^PATCH \/api\/exams\/[^\s]+\/schedule\b/.test(row.details || "")) return "SCHEDULE_EXAM";
  return row.action || "STAFF_ACTION";
}

export function actionLabel(action = "STAFF_ACTION") {
  return action.toLowerCase().replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase());
}

export function activityDetails(row) {
  let details = row.details || "—";
  // Present historical automatic entries without changing stored audit records.
  if (/^(POST|PUT|PATCH|DELETE) \/api\//.test(details)) {
    details = details.replace(/^(POST|PUT|PATCH|DELETE) \/api\/[^\s(]+\s*/, `${actionLabel(activityAction(row))} `)
      .replace(/\bid [a-f\d]{24},?\s*/gi, "")
      .replace(/\bstartDate:/g, "Starts:").replace(/\bendDate:/g, "Ends:")
      .replace(/\bextraTimeMinutes:/g, "Extra time (minutes):");
  }
  const format = (value) => {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleString(undefined, { timeZone: "Africa/Nairobi", dateStyle: "medium", timeStyle: "short" }) + " EAT" : value;
  };
  details = details.replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})\b/g, format);
  return details.replace(/\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) [A-Z][a-z]{2} \d{2} \d{4} \d{2}:\d{2}:\d{2} GMT[+-]\d{4}(?: \([^)]*\))?/g, format);
}
