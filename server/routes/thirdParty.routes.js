import express from "express";
import {
  getApplicationStats,
  getCourseBreakdown,
  getExamTakerStats,
  getRegistrationStats,
  getThirdPartySummary
} from "../controllers/thirdParty.controller.js";
import { authenticateThirdParty } from "../middlewares/thirdPartyAuth.js";

const router = express.Router();

// Apply authentication middleware to all 3rd party endpoints
router.use(authenticateThirdParty);

/**
 * @route   GET /api/third-party/summary
 * @desc    Get consolidated 3rd party dashboard metrics (Exam Takers, Active Takers, Registrations & Applications weekly/monthly/yearly)
 * @access  Protected (API Key or Admin Bearer token)
 */
router.get("/summary", getThirdPartySummary);

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
