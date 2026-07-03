import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { z } from "zod";
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
  nationality: z.string().trim().min(1, "Nationality is required"),
  subCity: z.string().trim().min(1, "Sub city is required"),
  woreda: z.string().trim().min(1, "Woreda is required"),
  address: z.string().trim().min(1, "Address is required"),
  phoneNumber: z.string().trim().min(7, "Phone number is required"),
  email: z.string().trim().email("Email is invalid").optional().or(z.literal("")),
  maritalStatus: z.enum(["Single", "Married"]),
  physicalDisability: z.enum(["Yes", "No"]),
  disabilityDescription: z.string().trim().optional(),
  occupation: z.string().trim().min(1, "Occupation is required"),
  collegeInstituteName: z.string().trim().min(1, "College or institute name is required"),
  institutionType: z.enum(["Government", "Private", "Other"]),
  trainingStartMonth: z.string().regex(/^\d{4}-\d{2}$/, "Training start month is required"),
  trainingEndMonth: z.string().regex(/^\d{4}-\d{2}$/, "Training end month is required"),
  trainingMode: z.enum(["Regular", "Extension", "Distance", "Other"]),
  trainingProgram: z.enum(["Coffee Cupping", "Barista", "Digital Marketing", "International Import Export"]),
  trainingType: z.enum(["Formal", "Non-formal"]),
  cooperativeTraining: z.enum(["Large scale enterprise", "Medium scale enterprise", "Small scale enterprise", "None"]),
  employmentStatus: z.enum(["Self employed", "Government employed", "Private employed", "Unemployed"]),
  companyName: z.string().trim().optional(),
  companyCategory: z.enum(["Micro and small scale enterprise", "Medium and large enterprise", "Not applicable"]),
  registerFor: z.enum(["Theory", "Practical", "Both"]),
  assessmentType: z.enum(["New Assessment", "Reassessment"]),
  paymentBank: z.enum(ethiopianBanks),
  agreementAccepted: z.coerce.boolean().refine((value) => value === true, "Confirmation is required"),
  digitalSignature: z.string().trim().optional()
}).superRefine((data, ctx) => {
  if (data.trainingEndMonth < data.trainingStartMonth) {
    ctx.addIssue({ code: "custom", path: ["trainingEndMonth"], message: "End month cannot be before start month" });
  }
  if (data.physicalDisability === "Yes" && !data.disabilityDescription?.trim()) {
    ctx.addIssue({ code: "custom", path: ["disabilityDescription"], message: "Please describe the disability" });
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

    if (!passportPhoto) {
      const error = new Error("Passport photo is required");
      error.statusCode = 400;
      throw error;
    }

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

    assertCompressedUpload(passportPhoto);
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
        nationality: parsed.nationality,
        subCity: parsed.subCity,
        woreda: parsed.woreda,
        address: parsed.address,
        phoneNumber: parsed.phoneNumber,
        email: parsed.email || "",
        maritalStatus: parsed.maritalStatus,
        physicalDisability: parsed.physicalDisability,
        disabilityDescription: parsed.disabilityDescription || ""
      },
      trainingInformation: {
        occupation: parsed.occupation,
        collegeInstituteName: parsed.collegeInstituteName,
        institutionType: parsed.institutionType,
        trainingStartMonth: parsed.trainingStartMonth,
        trainingEndMonth: parsed.trainingEndMonth,
        trainingMode: parsed.trainingMode,
        trainingProgram: parsed.trainingProgram,
        trainingType: parsed.trainingType,
        cooperativeTraining: parsed.cooperativeTraining
      },
      employmentInformation: {
        employmentStatus: parsed.employmentStatus,
        companyName: parsed.companyName || "",
        companyCategory: parsed.companyCategory
      },
      assessmentInformation: {
        registerFor: parsed.registerFor,
        assessmentType: parsed.assessmentType
      },
      paymentInformation: {
        bankName: parsed.paymentBank
      },
      passportPhoto: buildUploadDocument(passportPhoto),
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
        passportPhoto: uploadPath(application.passportPhoto.filename),
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
        { "trainingInformation.occupation": pattern },
        { "trainingInformation.collegeInstituteName": pattern },
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
    }).select("+passportPhoto.data +fayadaDigitalId.data +paymentScreenshot.data");

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
