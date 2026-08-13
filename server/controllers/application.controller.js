import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { z } from "zod";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { Application } from "../models/Application.js";

const maxStoredImageSize = 2 * 1024 * 1024;

const ethiopianBanks = [
  "Commercial Bank of Ethiopia",
  "Dashen Bank",
  "Awash Bank",
  "Bank of Abyssinia",
  "Wegagen Bank",
  "Nib International Bank",
  "Cooperative Bank of Oromia",
  "Oromia Bank",
  "Zemen Bank",
  "Bunna Bank",
  "Abay Bank",
  "Berhan Bank",
  "Hibret Bank",
  "Enat Bank",
  "Amhara Bank",
  "Tsehay Bank",
  "Gadaa Bank",
  "Ahadu Bank",
  "ZamZam Bank",
  "Hijra Bank",
  "Siinqee Bank",
  "Tsedey Bank",
  "Telebirr"
];

const applicationSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  grandfatherName: z.string().trim().min(1, "Grandfather name is required"),
  gender: z.enum(["Male", "Female"]),
  age: z.coerce.number().int().min(15).max(100),
  subCity: z.string().trim().min(1, "Sub city is required"),
  woreda: z.string().trim().min(1, "Woreda is required"),
  address: z.string().trim().min(1, "Address is required"),
  phoneNumber: z.string().trim().min(7, "Phone number is required"),
  email: z.string().trim().email("Email is invalid").optional().or(z.literal("")),
  institutionType: z.enum(["Government", "Private", "Other"]),
  trainingStartMonth: z.string().regex(/^\d{4}-\d{2}$/, "Training start month is required"),
  trainingEndMonth: z.string().regex(/^\d{4}-\d{2}$/, "Training end month is required"),
  trainingMode: z.enum(["Regular", "Extension", "Distance", "Other"]),
  trainingProgram: z.enum(["Coffee Cupping", "Barista", "Digital Marketing", "International Import Export"]),
  trainingType: z.enum(["Formal", "Non-formal", "VIP", "Nights"]),
  paymentBank: z.enum(ethiopianBanks),
  agreementAccepted: z.coerce.boolean().refine((value) => value === true, "Confirmation is required"),
  digitalSignature: z.string().trim().optional()
}).superRefine((data, ctx) => {
  if (data.trainingEndMonth < data.trainingStartMonth) {
    ctx.addIssue({ code: "custom", path: ["trainingEndMonth"], message: "End month cannot be before start month" });
  }
});

async function generateApplicationNumber() {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const random = Math.floor(100000 + Math.random() * 900000);
    const applicationNumber = `COC-${year}-${random}`;
    const exists = await Application.exists({ applicationNumber });
    if (!exists) return applicationNumber;
  }
  return `COC-${year}-${Date.now()}`;
}

function assertCompressedUpload(file) {
  if (file.size <= maxStoredImageSize) return;

  const error = new Error("Image upload was not compressed. Refresh the page and submit again.");
  error.statusCode = 400;
  throw error;
}

function uploadPath(filename) {
  return `/api/applications/uploads/${encodeURIComponent(filename)}`;
}

function buildUploadDocument(file) {
  const extension = extname(file.originalname).toLowerCase() || ".jpg";
  const filename = `${Date.now()}-${randomUUID()}${extension}`;

  return {
    filename,
    originalName: file.originalname,
    path: uploadPath(filename),
    storage: "mongodb",
    mimetype: file.mimetype,
    size: file.size,
    data: file.buffer
  };
}

function uploadForResponse(upload) {
  if (!upload) return upload;
  return {
    ...upload,
    path: upload.filename ? uploadPath(upload.filename) : upload.path
  };
}

function applicationForResponse(application) {
  if (!application) return application;
  return {
    ...application,
    passportPhoto: uploadForResponse(application.passportPhoto),
    fayadaDigitalId: uploadForResponse(application.fayadaDigitalId),
    paymentScreenshot: uploadForResponse(application.paymentScreenshot)
  };
}

function storedBuffer(data) {
  if (!data) return null;
  if (Buffer.isBuffer(data)) return data;
  if (data.buffer) return Buffer.from(data.buffer);
  if (data.data) return Buffer.from(data.data);
  return Buffer.from(data);
}

function findStoredFile(application, filename) {
  const files = [application?.passportPhoto, application?.fayadaDigitalId, application?.paymentScreenshot].filter(Boolean);
  return files.find((file) => file.filename === filename);
}

export async function createApplication(req, res, next) {
  try {
    const passportPhoto = req.files?.passportPhoto?.[0];
    const fayadaDigitalId = req.files?.fayadaDigitalId?.[0];
    const paymentScreenshot = req.files?.paymentScreenshot?.[0];


    if (!fayadaDigitalId) {
      const error = new Error("FAYADA DIGITAL ID image is required");
      error.statusCode = 400;
      throw error;
    }

    if (!paymentScreenshot) {
      const error = new Error("Payment screenshot is required");
      error.statusCode = 400;
      throw error;
    }

    if (passportPhoto) assertCompressedUpload(passportPhoto);
    assertCompressedUpload(fayadaDigitalId);
    assertCompressedUpload(paymentScreenshot);

    const parsed = applicationSchema.parse(req.body);
    const applicationNumber = await generateApplicationNumber();

    const application = await Application.create({
      applicationNumber,
      personalInformation: {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        grandfatherName: parsed.grandfatherName,
        gender: parsed.gender,
        age: parsed.age,
        subCity: parsed.subCity,
        woreda: parsed.woreda,
        address: parsed.address,
        phoneNumber: parsed.phoneNumber,
        email: parsed.email || "",
      },
      trainingInformation: {
        institutionType: parsed.institutionType,
        trainingStartMonth: parsed.trainingStartMonth,
        trainingEndMonth: parsed.trainingEndMonth,
        trainingMode: parsed.trainingMode,
        trainingProgram: parsed.trainingProgram,
        trainingType: parsed.trainingType,
      },
      paymentInformation: {
        bankName: parsed.paymentBank
      },
      passportPhoto: passportPhoto ? buildUploadDocument(passportPhoto) : undefined,
      fayadaDigitalId: buildUploadDocument(fayadaDigitalId),
      paymentScreenshot: buildUploadDocument(paymentScreenshot),
      agreementAccepted: parsed.agreementAccepted,
      digitalSignature: parsed.digitalSignature || ""
    });

    res.status(201).json({
      message: "Application submitted successfully",
      applicationNumber: application.applicationNumber,
      submittedAt: application.submittedAt,
      uploads: {
        passportPhoto: application.passportPhoto?.filename ? uploadPath(application.passportPhoto.filename) : null,
        fayadaDigitalId: uploadPath(application.fayadaDigitalId.filename),
        paymentScreenshot: uploadPath(application.paymentScreenshot.filename),
        storage: "mongodb"
      }
    });
  } catch (error) {
    if (error.name === "ZodError") {
      const validationError = new Error("Application validation failed");
      validationError.statusCode = 400;
      validationError.details = error.errors;
      validationError.exposeDetails = true;
      return next(validationError);
    }
    next(error);
  }
}

export async function listApplications(req, res, next) {
  try {
    const search = req.query.search?.trim();
    const query = {};
    if (search) {
      const pattern = new RegExp(search, "i");
      query.$or = [
        { applicationNumber: pattern },
        { "personalInformation.firstName": pattern },
        { "personalInformation.lastName": pattern },
        { "personalInformation.grandfatherName": pattern },
        { "personalInformation.phoneNumber": pattern },
        { "personalInformation.email": pattern },
        { "trainingInformation.trainingProgram": pattern }
      ];
    }

    const applications = await Application.find(query).select("-passportPhoto.data -fayadaDigitalId.data -paymentScreenshot.data").sort({ submittedAt: -1, createdAt: -1 }).lean();
    res.json(applications.map(applicationForResponse));
  } catch (error) {
    next(error);
  }
}

export async function deleteApplication(req, res, next) {
  try {
    const application = await Application.findByIdAndDelete(req.params.id);
    if (!application) {
      const error = new Error("Application not found");
      error.statusCode = 404;
      throw error;
    }

    res.json({ message: "Application deleted successfully" });
  } catch (error) {
    next(error);
  }
}

async function applicationExportRows(filters = {}) {
  const query = {};
  if (filters.search?.trim()) { const pattern = new RegExp(filters.search.trim(), "i"); query.$or = [{ applicationNumber: pattern }, { "personalInformation.firstName": pattern }, { "personalInformation.lastName": pattern }, { "personalInformation.grandfatherName": pattern }, { "personalInformation.phoneNumber": pattern }]; }
  if (filters.program) query["trainingInformation.trainingProgram"] = filters.program;
  if (/^\d{4}-\d{2}$/.test(filters.month || "")) { const start = new Date(`${filters.month}-01T00:00:00.000Z`); query.submittedAt = { $gte: start, $lt: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)) }; }
  const items = await Application.find(query).select("-passportPhoto -fayadaDigitalId -paymentScreenshot").sort({ submittedAt: -1 }).lean();
  return items.map((item, index) => ({ number: index + 1, applicationNumber: item.applicationNumber, applicant: [item.personalInformation?.firstName, item.personalInformation?.lastName, item.personalInformation?.grandfatherName].filter(Boolean).join(" "), phone: item.personalInformation?.phoneNumber || "", email: item.personalInformation?.email || "", program: item.trainingInformation?.trainingProgram || "", trainingType: item.trainingInformation?.trainingType || "", status: item.status || "PENDING", submitted: item.submittedAt ? new Date(item.submittedAt).toLocaleString("en-GB") : "" }));
}

async function applicationExportRowsById(id) {
  const item = await Application.findById(id).select("-passportPhoto -fayadaDigitalId -paymentScreenshot").lean();
  if (!item) {
    const error = new Error("Application not found");
    error.statusCode = 404;
    throw error;
  }
  return [{ number: 1, applicationNumber: item.applicationNumber, applicant: [item.personalInformation?.firstName, item.personalInformation?.lastName, item.personalInformation?.grandfatherName].filter(Boolean).join(" "), phone: item.personalInformation?.phoneNumber || "", email: item.personalInformation?.email || "", program: item.trainingInformation?.trainingProgram || "", trainingType: item.trainingInformation?.trainingType || "", status: item.status || "PENDING", submitted: item.submittedAt ? new Date(item.submittedAt).toLocaleString("en-GB") : "" }];
}

function writeApplicationsPdf(rows, res, filename = "assessment-applications.pdf") {
  const doc = new PDFDocument({ margin: 36, size: "A4", layout: "landscape" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  doc.pipe(res);
  doc.fontSize(18).text("Assessment Applications", { align: "center" }).moveDown();
  rows.forEach((row) => {
    if (doc.y > doc.page.height - 55) doc.addPage();
    doc.fontSize(9).text(`${row.number}. ${row.applicationNumber} | ${row.applicant} | ${row.phone} | ${row.program} | ${row.trainingType} | ${row.status} | ${row.submitted}`);
  });
  if (!rows.length) doc.text("No assessment applications found.", { align: "center" });
  doc.end();
}

async function writeApplicationsExcel(rows, res, filename = "assessment-applications.xlsx") {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Applications");
  sheet.columns = [{ header: "No.", key: "number", width: 7 }, { header: "Application No.", key: "applicationNumber", width: 22 }, { header: "Applicant", key: "applicant", width: 32 }, { header: "Phone", key: "phone", width: 18 }, { header: "Email", key: "email", width: 30 }, { header: "Training Program", key: "program", width: 30 }, { header: "Training Type", key: "trainingType", width: 16 }, { header: "Status", key: "status", width: 12 }, { header: "Submitted", key: "submitted", width: 24 }];
  sheet.addRows(rows);
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F88D2" } };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: "A1", to: "I1" };
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
}

export async function exportApplicationsPdf(req, res, next) {
  try { const rows = await applicationExportRows(req.query); const doc = new PDFDocument({ margin: 36, size: "A4", layout: "landscape" }); res.setHeader("Content-Type", "application/pdf"); res.setHeader("Content-Disposition", "attachment; filename=assessment-applications.pdf"); doc.pipe(res); doc.fontSize(18).text("Assessment Applications", { align: "center" }).moveDown(); rows.forEach((row) => { if (doc.y > doc.page.height - 55) doc.addPage(); doc.fontSize(9).text(`${row.number}. ${row.applicationNumber} | ${row.applicant} | ${row.phone} | ${row.program} | ${row.trainingType} | ${row.status} | ${row.submitted}`); }); if (!rows.length) doc.text("No assessment applications found.", { align: "center" }); doc.end(); } catch (error) { next(error); }
}

export async function exportApplicationsExcel(req, res, next) {
  try { const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet("Applications"); sheet.columns = [{ header: "No.", key: "number", width: 7 }, { header: "Application No.", key: "applicationNumber", width: 22 }, { header: "Applicant", key: "applicant", width: 32 }, { header: "Phone", key: "phone", width: 18 }, { header: "Email", key: "email", width: 30 }, { header: "Training Program", key: "program", width: 30 }, { header: "Training Type", key: "trainingType", width: 16 }, { header: "Status", key: "status", width: 12 }, { header: "Submitted", key: "submitted", width: 24 }]; sheet.addRows(await applicationExportRows(req.query)); sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }; sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F88D2" } }; sheet.views = [{ state: "frozen", ySplit: 1 }]; sheet.autoFilter = { from: "A1", to: "I1" }; res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"); res.setHeader("Content-Disposition", "attachment; filename=assessment-applications.xlsx"); await workbook.xlsx.write(res); res.end(); } catch (error) { next(error); }
}

export async function exportApplicationPdf(req, res, next) {
  try { const rows = await applicationExportRowsById(req.params.id); writeApplicationsPdf(rows, res, `${rows[0].applicationNumber}-application.pdf`); } catch (error) { next(error); }
}

export async function exportApplicationExcel(req, res, next) {
  try { const rows = await applicationExportRowsById(req.params.id); await writeApplicationsExcel(rows, res, `${rows[0].applicationNumber}-application.xlsx`); } catch (error) { next(error); }
}

export async function rejectApplication(req, res, next) {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      const error = new Error("Application not found");
      error.statusCode = 404;
      throw error;
    }
    application.status = "REJECTED";
    application.rejectionReason = String(req.body.reason || "").trim();
    application.rejectedAt = new Date();
    application.rejectedBy = req.user._id;
    await application.save();
    const saved = await Application.findById(application._id).select("-passportPhoto.data -fayadaDigitalId.data -paymentScreenshot.data").lean();
    res.json({ message: "Application rejected and student information preserved", application: applicationForResponse(saved) });
  } catch (error) {
    next(error);
  }
}
export async function getApplicationByNumber(req, res, next) {
  try {
    const application = await Application.findOne({ applicationNumber: req.params.applicationNumber }).select("-passportPhoto.data -fayadaDigitalId.data -paymentScreenshot.data").lean();
    if (!application) {
      const error = new Error("Application not found");
      error.statusCode = 404;
      throw error;
    }
    res.json({ application: applicationForResponse(application) });
  } catch (error) {
    next(error);
  }
}
export async function serveApplicationUpload(req, res, next) {
  try {
    const { filename } = req.params;
    const application = await Application.findOne({
      $or: [
        { "passportPhoto.filename": filename },
        { "fayadaDigitalId.filename": filename },
        { "paymentScreenshot.filename": filename }
      ]
    }).select(
      "passportPhoto.filename passportPhoto.mimetype passportPhoto.data " +
      "fayadaDigitalId.filename fayadaDigitalId.mimetype fayadaDigitalId.data " +
      "paymentScreenshot.filename paymentScreenshot.mimetype paymentScreenshot.data"
    );

    const file = findStoredFile(application, filename);
    const buffer = storedBuffer(file?.data);
    if (!buffer) return next();

    res.setHeader("Content-Type", file.mimetype || "application/octet-stream");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.send(buffer);
  } catch (error) {
    return next(error);
  }
}

