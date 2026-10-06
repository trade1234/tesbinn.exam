// Admins manage every exam; customer service may edit only exams they created.
export function canManageExam(user, exam) {
  if (!user || !exam) return false;
  if (user.role === "ADMIN") return true;
  if (user.role !== "CUSTOMER_SERVICE" || !exam.createdBy) return false;
  const ownerId = exam.createdBy._id || exam.createdBy;
  return String(ownerId) === String(user._id);
}
