export function scheduledExamEnd(exam) {
  if (!exam?.endDate) return null;
  const end = new Date(exam.endDate);
  return Number.isNaN(end.getTime()) ? null : end;
}

export function scheduledRemainingSeconds(exam, referenceTime = Date.now()) {
  const end = scheduledExamEnd(exam);
  if (!end) return 0;
  const reference = referenceTime instanceof Date ? referenceTime.getTime() : Number(referenceTime);
  return Math.max(Math.floor((end.getTime() - reference) / 1000), 0);
}
