import { Router } from "express";
import multer from "multer";
import { authorize, protect } from "../middlewares/auth.js";
import { createApplication, deleteApplication, getApplicationByNumber, listApplications, serveApplicationUpload } from "../controllers/application.controller.js";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxRawImageSize = 20 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxRawImageSize },
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      return callback(new Error("Uploaded files must be JPG, PNG, or WEBP"));
    }
    callback(null, true);
  }
});

function handleApplicationUpload(req, res, next) {
  upload.fields([{ name: "passportPhoto", maxCount: 1 }, { name: "fayadaDigitalId", maxCount: 1 }, { name: "paymentScreenshot", maxCount: 1 }])(req, res, (error) => {
    if (!error) return next();

    error.statusCode = 400;
    if (error.code === "LIMIT_FILE_SIZE") {
      error.message = "The selected image is too large to upload. Refresh the page and try again so the browser can compress it before submitting.";
    }
    return next(error);
  });
}

const router = Router();

router.get("/", protect, authorize("ADMIN"), listApplications);
router.post("/", handleApplicationUpload, createApplication);
router.get("/uploads/:filename", serveApplicationUpload);
router.delete("/:id", protect, authorize("ADMIN"), deleteApplication);
router.get("/:applicationNumber", getApplicationByNumber);

export default router;