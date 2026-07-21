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
import certificateRoutes from "./routes/certificate.routes.js";
import { errorHandler, notFound } from "./middlewares/error.js";

export const app = express();
app.set("trust proxy", 1);
const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const allowedOrigins = new Set([
  ...env.allowedOrigins,
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

async function healthResponse(_req, res) {
  try {
    await connectDB();
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>TESBINN API Status</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #edf4fb; color: #0f172a; text-align: center; padding: 60px 20px; margin: 0; }
            .card { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 24px; box-shadow: 0 20px 50px rgba(15, 84, 122, 0.1); border: 1px solid #e1e8f0; }
            h1 { color: #0f88d2; margin-top: 0; font-size: 28px; font-weight: 800; }
            .status { display: inline-block; padding: 8px 16px; border-radius: 12px; font-weight: bold; margin-bottom: 20px; }
            .success { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
            .details { text-align: left; background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; font-size: 14px; }
            .details p { margin: 10px 0; }
            .label { font-weight: bold; color: #475569; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>TESBINN API Status</h1>
            <div class="status success">✓ System & Database Connected</div>
            <div class="details">
              <p><span class="label">Service Name:</span> Online Examination Server</p>
              <p><span class="label">Operational Status:</span> Operational</p>
              <p><span class="label">Database Connectivity:</span> Connected Successfully</p>
              <p><span class="label">Environment Host:</span> ${process.env.VERCEL ? 'Vercel Serverless' : 'Local Host'}</p>
            </div>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>TESBINN API - Error</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fef2f2; color: #991b1b; text-align: center; padding: 60px 20px; margin: 0; }
            .card { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 24px; box-shadow: 0 20px 50px rgba(153, 27, 27, 0.1); border: 1px solid #fecaca; }
            h1 { color: #dc2626; margin-top: 0; font-size: 28px; font-weight: 800; }
            .status { display: inline-block; padding: 8px 16px; border-radius: 12px; font-weight: bold; margin-bottom: 20px; background: #fee2e2; border: 1px solid #fca5a5; }
            .details { text-align: left; background: #fff5f5; padding: 20px; border-radius: 16px; border: 1px solid #fee2e2; font-size: 14px; color: #7f1d1d; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Database Connection Failed</h1>
            <div class="status">❌ Disconnected</div>
            <div class="details">
              <p><strong>Error Message:</strong> ${error.message}</p>
              <p>Please check your <code>MONGO_URI</code> environment variable in your Vercel settings, and confirm that your MongoDB Atlas cluster allows connection requests from Vercel serverless IPs (IP access list includes <code>0.0.0.0/0</code>).</p>
            </div>
          </div>
        </body>
      </html>
    `);
  }
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
app.use("/api/certificates", certificateRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
