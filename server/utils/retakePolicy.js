export function canGrantRetake(attempt) {
  return Boolean(attempt && attempt.status === "DISQUALIFIED");
}
