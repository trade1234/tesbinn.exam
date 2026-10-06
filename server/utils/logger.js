import { ActivityLog } from "../models/ActivityLog.js";

const STAFF_ROLES = new Set(["ADMIN", "CUSTOMER_SERVICE"]);
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Friendly names for staff requests that controllers don't log themselves.
const ROUTE_ACTIONS = {
  "POST /api/exams": "CREATE_EXAM",
  "PUT /api/exams/:id": "UPDATE_EXAM",
  "PATCH /api/exams/:id/schedule": "SCHEDULE_EXAM",
  "PATCH /api/exams/:id/pause": "PAUSE_EXAM",
  "PATCH /api/exams/:id/resume": "RESUME_EXAM",
  "DELETE /api/exams/:id": "DELETE_EXAM",
  "POST /api/questions": "CREATE_QUESTION",
  "POST /api/questions/bulk": "CREATE_QUESTIONS",
  "PUT /api/questions/:id": "UPDATE_QUESTION",
  "DELETE /api/questions/:id": "DELETE_QUESTION",
  "POST /api/courses": "CREATE_COURSE",
  "PUT /api/courses/:id": "UPDATE_COURSE",
  "DELETE /api/courses/:id": "DELETE_COURSE",
  "POST /api/users/students": "CREATE_STUDENT",
  "PUT /api/users/students/:id": "UPDATE_STUDENT",
  "DELETE /api/users/students/:id": "DELETE_STUDENT",
  "PATCH /api/users/students/:id/active": "SET_STUDENT_ACTIVE",
  "PUT /api/certificates/:id": "UPDATE_CERTIFICATE",
  "DELETE /api/certificates/:id": "DELETE_CERTIFICATE"
};

const SUMMARY_FIELDS = ["title", "courseName", "courseCode", "name", "questionText", "studentName", "startDate", "endDate", "extraTimeMinutes", "isActive", "isPaused"];

function requestContext(req) {
  return {
    ipAddress: req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "",
    userAgent: req.headers["user-agent"] || ""
  };
}

export async function logActivity(reqOrUserId, action, details = "") {
  try {
    let userId;
    let role;
    let context = { ipAddress: "", userAgent: "" };

    if (reqOrUserId && reqOrUserId.user) {
      // It is a Request object
      userId = reqOrUserId.user._id;
      role = reqOrUserId.user.role;
      context = requestContext(reqOrUserId);
      reqOrUserId.activityLogged = true;
    } else {
      // It is a direct User ID or object
      userId = reqOrUserId?._id || reqOrUserId;
      role = reqOrUserId?.role;
    }

    if (!userId) return;

    await ActivityLog.create({ userId, role, action, details, ...context });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

function describeRequest(req, routeKey) {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const parts = [];
  for (const field of SUMMARY_FIELDS) {
    if (body[field] === undefined || body[field] === "") continue;
    const labels = { title: "Exam", courseName: "Course", courseCode: "Course code", name: "Name", questionText: "Question", studentName: "Student", startDate: "Starts", endDate: "Ends", extraTimeMinutes: "Extra time (minutes)", isActive: "Active", isPaused: "Paused" };
    const value = field.endsWith("Date") ? new Date(body[field]).toISOString() : String(body[field]);
    parts.push(`${labels[field]}: ${value.length > 160 ? `${value.slice(0, 157)}...` : value}`);
  }
  if (Array.isArray(body.questions)) parts.push(`${body.questions.length} questions`);
  const action = (ROUTE_ACTIONS[routeKey] || "STAFF_ACTION").toLowerCase().replace(/_/g, " ");
  return `${action.charAt(0).toUpperCase()}${action.slice(1)}${parts.length ? ` — ${parts.join("; ")}` : ""}`;
}

// Records every successful change made by an admin or customer service user,
// unless the controller already wrote its own, more specific log entry.
export function auditStaffActions(req, res) {
  if (!STAFF_ROLES.has(req.user?.role) || !MUTATING_METHODS.has(req.method)) return;
  res.on("finish", () => {
    if (req.activityLogged || res.statusCode >= 400) return;
    const path = `${req.baseUrl}${req.route?.path || req.path}`.replace(/\/+$/, "") || "/";
    const routeKey = `${req.method} ${path}`;
    logActivity(req, ROUTE_ACTIONS[routeKey] || "STAFF_ACTION", req.activityDetails || describeRequest(req, routeKey));
  });
}
