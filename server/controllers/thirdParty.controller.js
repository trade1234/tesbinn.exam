import { Application } from "../models/Application.js";
import { Course } from "../models/Course.js";
import { Exam } from "../models/Exam.js";
import { ExamAttempt } from "../models/ExamAttempt.js";
import { User } from "../models/User.js";

/**
 * Calculates start date threshold based on requested timeframe period.
 */
function getDateThreshold(period, customStartDate) {
  if (customStartDate) {
    const parsed = new Date(customStartDate);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  const now = new Date();
  switch (period?.toLowerCase()) {
    case "weekly":
    case "week":
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "monthly":
    case "month":
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "yearly":
    case "year":
    case "365d":
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case "all":
    default:
      return null;
  }
}

/**
 * Normalizes course type/program names across different models.
 */
function formatProgramName(name) {
  if (!name || typeof name !== "string") return "Unassigned / General";
  return name.trim();
}

/**
 * GET /api/third-party/summary
 * Consolidated statistics endpoint returning overall summary, active online exam takers,
 * exam takers by course type (weekly, monthly, yearly), course registrations, and applications.
 */
export async function getThirdPartySummary(req, res) {
  try {
    const now = new Date();
    const weeklyDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthlyDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const yearlyDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    // 1. Fetch active online exam takers (status IN_PROGRESS)
    const activeOnlineTakersCount = await ExamAttempt.countDocuments({ status: "IN_PROGRESS" });

    // Active online students (active in last 15 minutes)
    const activeOnlineStudentsCount = await User.countDocuments({
      role: "STUDENT",
      lastActive: { $gte: new Date(now.getTime() - 15 * 60 * 1000) }
    });

    // 2. Aggregate Exam Takers by Course & Period
    const examAttempts = await ExamAttempt.find({})
      .populate({
        path: "examId",
        select: "title courseId",
        populate: { path: "courseId", select: "courseName courseCode" }
      })
      .populate("studentId", "name email trainingTaken")
      .lean();

    const examTakersStats = {
      totalAttempts: examAttempts.length,
      activeOnlineTakers: activeOnlineTakersCount,
      weekly: { total: 0, passed: 0, failed: 0, inProgress: 0, byCourse: {} },
      monthly: { total: 0, passed: 0, failed: 0, inProgress: 0, byCourse: {} },
      yearly: { total: 0, passed: 0, failed: 0, inProgress: 0, byCourse: {} },
      allTime: { total: 0, passed: 0, failed: 0, inProgress: 0, byCourse: {} }
    };

    examAttempts.forEach((attempt) => {
      const attemptDate = new Date(attempt.startedAt || attempt.createdAt || Date.now());
      const courseName = formatProgramName(attempt.examId?.courseId?.courseName || attempt.studentId?.trainingTaken || "General Exam");

      const isWeekly = attemptDate >= weeklyDate;
      const isMonthly = attemptDate >= monthlyDate;
      const isYearly = attemptDate >= yearlyDate;

      const periods = ["allTime"];
      if (isWeekly) periods.push("weekly");
      if (isMonthly) periods.push("monthly");
      if (isYearly) periods.push("yearly");

      periods.forEach((pKey) => {
        const pObj = examTakersStats[pKey];
        pObj.total += 1;

        if (attempt.status === "PASS") pObj.passed += 1;
        else if (attempt.status === "FAIL") pObj.failed += 1;
        else if (attempt.status === "IN_PROGRESS") pObj.inProgress += 1;

        if (!pObj.byCourse[courseName]) {
          pObj.byCourse[courseName] = { total: 0, passed: 0, failed: 0, inProgress: 0 };
        }
        pObj.byCourse[courseName].total += 1;
        if (attempt.status === "PASS") pObj.byCourse[courseName].passed += 1;
        else if (attempt.status === "FAIL") pObj.byCourse[courseName].failed += 1;
        else if (attempt.status === "IN_PROGRESS") pObj.byCourse[courseName].inProgress += 1;
      });
    });

    // 3. Aggregate Student Registrations (User accounts)
    const studentUsers = await User.find({ role: "STUDENT" }).select("trainingTaken createdAt").lean();
    const registrationStats = {
      totalRegisteredStudents: studentUsers.length,
      activeOnlineStudents: activeOnlineStudentsCount,
      weekly: { total: 0, byCourse: {} },
      monthly: { total: 0, byCourse: {} },
      yearly: { total: 0, byCourse: {} },
      allTime: { total: 0, byCourse: {} }
    };

    studentUsers.forEach((user) => {
      const regDate = new Date(user.createdAt || Date.now());
      const courseName = formatProgramName(user.trainingTaken || "General Student");

      const isWeekly = regDate >= weeklyDate;
      const isMonthly = regDate >= monthlyDate;
      const isYearly = regDate >= yearlyDate;

      const periods = ["allTime"];
      if (isWeekly) periods.push("weekly");
      if (isMonthly) periods.push("monthly");
      if (isYearly) periods.push("yearly");

      periods.forEach((pKey) => {
        const pObj = registrationStats[pKey];
        pObj.total += 1;

        if (!pObj.byCourse[courseName]) pObj.byCourse[courseName] = 0;
        pObj.byCourse[courseName] += 1;
      });
    });

    // 4. Aggregate Student Applications
    const applications = await Application.find({})
      .select("trainingInformation submittedAt status createdAt")
      .lean();

    const applicationStats = {
      totalApplications: applications.length,
      weekly: { total: 0, byProgram: {}, byMode: {}, byStatus: { PENDING: 0, APPROVED: 0, REJECTED: 0 } },
      monthly: { total: 0, byProgram: {}, byMode: {}, byStatus: { PENDING: 0, APPROVED: 0, REJECTED: 0 } },
      yearly: { total: 0, byProgram: {}, byMode: {}, byStatus: { PENDING: 0, APPROVED: 0, REJECTED: 0 } },
      allTime: { total: 0, byProgram: {}, byMode: {}, byStatus: { PENDING: 0, APPROVED: 0, REJECTED: 0 } }
    };

    applications.forEach((app) => {
      const appDate = new Date(app.submittedAt || app.createdAt || Date.now());
      const program = formatProgramName(app.trainingInformation?.trainingProgram || "General Program");
      const mode = app.trainingInformation?.trainingMode || "Other";
      const appStatus = app.status || "PENDING";

      const isWeekly = appDate >= weeklyDate;
      const isMonthly = appDate >= monthlyDate;
      const isYearly = appDate >= yearlyDate;

      const periods = ["allTime"];
      if (isWeekly) periods.push("weekly");
      if (isMonthly) periods.push("monthly");
      if (isYearly) periods.push("yearly");

      periods.forEach((pKey) => {
        const pObj = applicationStats[pKey];
        pObj.total += 1;

        // Program breakdown
        if (!pObj.byProgram[program]) pObj.byProgram[program] = 0;
        pObj.byProgram[program] += 1;

        // Mode breakdown (Distance/Online, Regular, etc.)
        if (!pObj.byMode[mode]) pObj.byMode[mode] = 0;
        pObj.byMode[mode] += 1;

        // Status breakdown
        if (pObj.byStatus[appStatus] !== undefined) {
          pObj.byStatus[appStatus] += 1;
        } else {
          pObj.byStatus[appStatus] = 1;
        }
      });
    });

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      system: "TESBINN Examination & Application Portal",
      overview: {
        totalExamAttempts: examTakersStats.totalAttempts,
        activeOnlineExamTakers: activeOnlineTakersCount,
        totalRegisteredStudents: registrationStats.totalRegisteredStudents,
        activeOnlineStudents: activeOnlineStudentsCount,
        totalSubmittedApplications: applicationStats.totalApplications
      },
      examTakers: examTakersStats,
      registrations: registrationStats,
      applications: applicationStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate third-party summary metrics",
      error: error.message
    });
  }
}

/**
 * GET /api/third-party/exam-takers
 * Query parameters: period (weekly | monthly | yearly | all), startDate, endDate, courseId
 */
export async function getExamTakerStats(req, res) {
  try {
    const { period = "all", startDate, endDate, courseId } = req.query;
    const dateThreshold = getDateThreshold(period, startDate);

    const queryFilter = {};
    if (dateThreshold) {
      queryFilter.startedAt = { $gte: dateThreshold };
    }
    if (endDate) {
      const parsedEnd = new Date(endDate);
      if (!isNaN(parsedEnd.getTime())) {
        queryFilter.startedAt = queryFilter.startedAt ? { ...queryFilter.startedAt, $lte: parsedEnd } : { $lte: parsedEnd };
      }
    }

    let attempts = await ExamAttempt.find(queryFilter)
      .populate({
        path: "examId",
        select: "title courseId",
        populate: { path: "courseId", select: "courseName courseCode" }
      })
      .populate("studentId", "name email trainingTaken enrollmentNumber")
      .lean();

    if (courseId) {
      attempts = attempts.filter((att) => String(att.examId?.courseId?._id) === String(courseId) || att.examId?.courseId?.courseCode === courseId);
    }

    const activeOnlineCount = attempts.filter((att) => att.status === "IN_PROGRESS").length;
    const passedCount = attempts.filter((att) => att.status === "PASS").length;
    const failedCount = attempts.filter((att) => att.status === "FAIL").length;
    const disqualifiedCount = attempts.filter((att) => att.status === "DISQUALIFIED").length;

    const completedCount = passedCount + failedCount;
    const passRatePercentage = completedCount > 0 ? Number(((passedCount / completedCount) * 100).toFixed(2)) : 0;

    const byCourseMap = {};
    attempts.forEach((att) => {
      const courseName = formatProgramName(att.examId?.courseId?.courseName || att.studentId?.trainingTaken || "General Exam");
      if (!byCourseMap[courseName]) {
        byCourseMap[courseName] = {
          courseName,
          courseCode: att.examId?.courseId?.courseCode || "N/A",
          totalExamTakers: 0,
          activeOnline: 0,
          passed: 0,
          failed: 0,
          disqualified: 0,
          passRatePercentage: 0
        };
      }

      const item = byCourseMap[courseName];
      item.totalExamTakers += 1;
      if (att.status === "IN_PROGRESS") item.activeOnline += 1;
      if (att.status === "PASS") item.passed += 1;
      if (att.status === "FAIL") item.failed += 1;
      if (att.status === "DISQUALIFIED") item.disqualified += 1;
    });

    Object.values(byCourseMap).forEach((item) => {
      const comp = item.passed + item.failed;
      item.passRatePercentage = comp > 0 ? Number(((item.passed / comp) * 100).toFixed(2)) : 0;
    });

    res.json({
      success: true,
      periodRequested: period,
      filterApplied: { startDate: dateThreshold || "All Time", endDate: endDate || "Latest" },
      summary: {
        totalExamTakers: attempts.length,
        activeOnlineExamTakers: activeOnlineCount,
        passed: passedCount,
        failed: failedCount,
        disqualified: disqualifiedCount,
        passRatePercentage
      },
      coursesBreakdown: Object.values(byCourseMap),
      recentAttempts: attempts.slice(0, 50).map((att) => ({
        id: att._id,
        studentName: att.studentId?.name || "Student",
        studentEmail: att.studentId?.email,
        enrollmentNumber: att.studentId?.enrollmentNumber || "N/A",
        examTitle: att.examId?.title || "Exam",
        courseName: formatProgramName(att.examId?.courseId?.courseName || att.studentId?.trainingTaken),
        status: att.status,
        score: att.score,
        percentage: att.percentage,
        startedAt: att.startedAt,
        submittedAt: att.submittedAt
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch exam taker statistics",
      error: error.message
    });
  }
}

/**
 * GET /api/third-party/registrations
 * Query parameters: period (weekly | monthly | yearly | all), startDate, endDate
 */
export async function getRegistrationStats(req, res) {
  try {
    const { period = "all", startDate, endDate } = req.query;
    const dateThreshold = getDateThreshold(period, startDate);

    const queryFilter = { role: "STUDENT" };
    if (dateThreshold) {
      queryFilter.createdAt = { $gte: dateThreshold };
    }
    if (endDate) {
      const parsedEnd = new Date(endDate);
      if (!isNaN(parsedEnd.getTime())) {
        queryFilter.createdAt = queryFilter.createdAt ? { ...queryFilter.createdAt, $lte: parsedEnd } : { $lte: parsedEnd };
      }
    }

    const students = await User.find(queryFilter).select("name email enrollmentNumber trainingTaken batchYear isActive lastActive createdAt").lean();

    const byCourseMap = {};
    students.forEach((std) => {
      const courseName = formatProgramName(std.trainingTaken || "General Student");
      if (!byCourseMap[courseName]) {
        byCourseMap[courseName] = {
          courseName,
          registeredStudentsCount: 0,
          activeAccounts: 0
        };
      }
      byCourseMap[courseName].registeredStudentsCount += 1;
      if (std.isActive) byCourseMap[courseName].activeAccounts += 1;
    });

    res.json({
      success: true,
      periodRequested: period,
      filterApplied: { startDate: dateThreshold || "All Time", endDate: endDate || "Latest" },
      totalRegisteredStudents: students.length,
      coursesBreakdown: Object.values(byCourseMap),
      studentsList: students.slice(0, 100).map((std) => ({
        id: std._id,
        name: std.name,
        email: std.email,
        enrollmentNumber: std.enrollmentNumber || "N/A",
        courseRegistered: formatProgramName(std.trainingTaken),
        batchYear: std.batchYear,
        isActive: std.isActive,
        lastActive: std.lastActive,
        registeredAt: std.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch student registration statistics",
      error: error.message
    });
  }
}

/**
 * GET /api/third-party/applications
 * Query parameters: period (weekly | monthly | yearly | all), startDate, endDate, program, status
 */
export async function getApplicationStats(req, res) {
  try {
    const { period = "all", startDate, endDate, program, status } = req.query;
    const dateThreshold = getDateThreshold(period, startDate);

    const queryFilter = {};
    if (dateThreshold) {
      queryFilter.submittedAt = { $gte: dateThreshold };
    }
    if (endDate) {
      const parsedEnd = new Date(endDate);
      if (!isNaN(parsedEnd.getTime())) {
        queryFilter.submittedAt = queryFilter.submittedAt ? { ...queryFilter.submittedAt, $lte: parsedEnd } : { $lte: parsedEnd };
      }
    }
    if (status) {
      queryFilter.status = status.toUpperCase();
    }

    let applications = await Application.find(queryFilter)
      .select("applicationNumber personalInformation trainingInformation status submittedAt createdAt")
      .lean();

    if (program) {
      applications = applications.filter((app) =>
        app.trainingInformation?.trainingProgram?.toLowerCase().includes(program.toLowerCase())
      );
    }

    const byProgramMap = {};
    const byModeMap = {};
    const byStatusMap = { PENDING: 0, APPROVED: 0, REJECTED: 0 };

    applications.forEach((app) => {
      const prog = formatProgramName(app.trainingInformation?.trainingProgram || "General Program");
      const mode = app.trainingInformation?.trainingMode || "Other";
      const appStatus = app.status || "PENDING";

      // Program stats
      if (!byProgramMap[prog]) {
        byProgramMap[prog] = { programName: prog, totalApplications: 0, pending: 0, approved: 0, rejected: 0 };
      }
      byProgramMap[prog].totalApplications += 1;
      if (appStatus === "APPROVED") byProgramMap[prog].approved += 1;
      else if (appStatus === "REJECTED") byProgramMap[prog].rejected += 1;
      else byProgramMap[prog].pending += 1;

      // Mode stats
      if (!byModeMap[mode]) byModeMap[mode] = 0;
      byModeMap[mode] += 1;

      // Status stats
      if (byStatusMap[appStatus] !== undefined) {
        byStatusMap[appStatus] += 1;
      } else {
        byStatusMap[appStatus] = 1;
      }
    });

    res.json({
      success: true,
      periodRequested: period,
      filterApplied: { startDate: dateThreshold || "All Time", endDate: endDate || "Latest" },
      totalApplications: applications.length,
      statusSummary: byStatusMap,
      trainingModesBreakdown: byModeMap,
      programsBreakdown: Object.values(byProgramMap),
      applicationsList: applications.slice(0, 100).map((app) => ({
        id: app._id,
        applicationNumber: app.applicationNumber,
        applicantName: `${app.personalInformation?.firstName || ""} ${app.personalInformation?.lastName || ""}`.trim(),
        email: app.personalInformation?.email,
        phoneNumber: app.personalInformation?.phoneNumber,
        program: app.trainingInformation?.trainingProgram,
        trainingMode: app.trainingInformation?.trainingMode,
        institutionType: app.trainingInformation?.institutionType,
        status: app.status,
        submittedAt: app.submittedAt || app.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch application statistics",
      error: error.message
    });
  }
}

/**
 * GET /api/third-party/courses-breakdown
 * Returns registered course list with enrolled students count, exams count, and exam takers count.
 */
export async function getCourseBreakdown(req, res) {
  try {
    const courses = await Course.find({}).lean();
    const exams = await Exam.find({}).select("_id title courseId").lean();

    const courseStatsList = await Promise.all(
      courses.map(async (course) => {
        const courseExams = exams.filter((ex) => String(ex.courseId) === String(course._id));
        const examIds = courseExams.map((ex) => ex._id);

        const examTakersCount = await ExamAttempt.countDocuments({ examId: { $in: examIds } });
        const activeTakersCount = await ExamAttempt.countDocuments({ examId: { $in: examIds }, status: "IN_PROGRESS" });
        const registeredStudentsCount = await User.countDocuments({
          role: "STUDENT",
          trainingTaken: { $regex: new RegExp(course.courseName, "i") }
        });

        return {
          courseId: course._id,
          courseName: course.courseName,
          courseCode: course.courseCode,
          description: course.description,
          totalExams: courseExams.length,
          registeredStudentsCount,
          totalExamTakers: examTakersCount,
          activeOnlineExamTakers: activeTakersCount
        };
      })
    );

    res.json({
      success: true,
      totalCourses: courses.length,
      courses: courseStatsList
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch course breakdown",
      error: error.message
    });
  }
}
