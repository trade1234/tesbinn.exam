import express from "express";
import {
  getApplicationStats,
  getCourseBreakdown,
  getDataAnalytics,
  getExamTakerStats,
  getRegistrationStats,
  getThirdPartySummary
} from "../controllers/thirdParty.controller.js";
import { authenticateThirdParty } from "../middlewares/thirdPartyAuth.js";

const router = express.Router();

/**
 * Public, read-only aggregate analytics. No API key or environment variable required.
 * Personal result/application records are intentionally omitted.
 */
router.get("/data-analytics", (req, res) => {
  req.analyticsPublic = true;
  return getDataAnalytics(req, res);
});

// Apply authentication middleware to all 3rd party endpoints
router.use(authenticateThirdParty);

/**
 * @route   GET /api/third-party/summary
 * @desc    Get consolidated 3rd party dashboard metrics (Exam Takers, Active Takers, Registrations & Applications weekly/monthly/yearly)
 * @access  Protected (API Key or Admin Bearer token)
 */
router.get("/summary", getThirdPartySummary);

/**
 * @route   GET /api/v1/external/data-analytics/details
 * @desc    Optional protected analytics including individual table records
 * @access  Protected (API Key or Admin Bearer token)
 */
router.get("/data-analytics/details", getDataAnalytics);

/**
 * @route   GET /api/third-party/exam-takers
 * @desc    Get exam takers statistics grouped by course/course type (weekly, monthly, yearly)
 * @access  Protected (API Key or Admin Bearer token)
 */
router.get("/exam-takers", getExamTakerStats);

/**
 * @route   GET /api/third-party/registrations
 * @desc    Get student course registration statistics (weekly, monthly, yearly)
 * @access  Protected (API Key or Admin Bearer token)
 */
router.get("/registrations", getRegistrationStats);

/**
 * @route   GET /api/third-party/applications
 * @desc    Get student applications statistics by program, mode, and status (weekly, monthly, yearly)
 * @access  Protected (API Key or Admin Bearer token)
 */
router.get("/applications", getApplicationStats);

/**
 * @route   GET /api/third-party/courses-breakdown
 * @desc    Get granular courses breakdown with student enrolment & exam takers counts
 * @access  Protected (API Key or Admin Bearer token)
 */
router.get("/courses-breakdown", getCourseBreakdown);

export default router;
