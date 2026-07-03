import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import morgan from "morgan";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import applicationRoutes from "./routes/application.routes.js";
import { serveApplicationUpload } from "./controllers/application.controller.js";
import authRoutes from "./routes/auth.routes.js";
import courseRoutes from "./routes/course.routes.js";
import examRoutes from "./routes/exam.routes.js";
import questionRoutes from "./routes/question.routes.js";
import resultRoutes from "./routes/result.routes.js";
import userRoutes from "./routes/user.routes.js";
import { errorHandler, notFound } from "./middlewares/error.js";

export const app = express();
app.set("trust proxy", 1);
const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const allowedOrigins = new Set([
  ...env.clientUrls,
  "https://examfrontend-f35t.onrender.com",
  "http://localhost:5173",
  "http://localhost:5174"
]);
const localDevOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|172\.16\.\d+\.\d+):(5173|5174|5175)$/;
const renderFrontendOrigin = /^https:\/\/[a-z0-9-]+\.onrender\.com$/;
const vercelFrontendOrigin = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;

function isAllowedOrigin(origin) {
  return allowedOrigins.has(origin) || localDevOrigin.test(origin) || renderFrontendOrigin.test(origin) || vercelFrontendOrigin.test(origin);
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true
}));
app.use(express.json({ limit: "2mb" }));
app.use(mongoSanitize());
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false }));
app.get("/uploads/applications/:filename", serveApplicationUpload);
app.use("/uploads", express.static(join(__dirname, "uploads")));
app.use("/uploads", express.static(join(__dirname, "..", "uploads")));

function healthResponse(_req, res) {
  res.json({ status: "ok", service: "online-exam-server" });
}

app.get("/", healthResponse);
app.get("/health", healthResponse);
app.get("/api/health", healthResponse);

async function ensureDatabase(_req, _res, next) {
  try {
    await connectDB();
    next();
  } catch (error) {
    error.statusCode = 500;
    error.message = "Database connection failed. Check MONGO_URI and MongoDB Atlas network access in Vercel.";
    error.code = "DATABASE_CONNECTION_FAILED";
    next(error);
  }
}

app.use(["/api", "/uploads/applications"], ensureDatabase);
app.use("/api/applications", applicationRoutes);
app.use("/api/application", applicationRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/users", userRoutes);

app.use(notFound);
app.use(errorHandler);

