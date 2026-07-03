import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    applicationNumber: { type: String, required: true, unique: true, index: true },
    personalInformation: {
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
      grandfatherName: { type: String, required: true, trim: true },
      gender: { type: String, required: true, enum: ["Male", "Female"] },
      age: { type: Number, required: true, min: 15, max: 100 },
      nationality: { type: String, required: true, trim: true },
      subCity: { type: String, required: true, trim: true },
      woreda: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true },
      phoneNumber: { type: String, required: true, trim: true },
      email: { type: String, trim: true, lowercase: true },
      maritalStatus: { type: String, required: true, enum: ["Single", "Married"] },
      physicalDisability: { type: String, required: true, enum: ["Yes", "No"] },
      disabilityDescription: { type: String, trim: true, default: "" }
    },
    trainingInformation: {
      occupation: { type: String, required: true, trim: true },
      collegeInstituteName: { type: String, required: true, trim: true },
      institutionType: { type: String, required: true, enum: ["Government", "Private", "Other"] },
      trainingStartMonth: { type: String, required: true },
      trainingEndMonth: { type: String, required: true },
      trainingMode: { type: String, required: true, enum: ["Regular", "Extension", "Distance", "Other"] },
      trainingProgram: { type: String, required: true, enum: ["Coffee Cupping", "Barista", "Digital Marketing", "International Import Export"] },
      trainingType: { type: String, required: true, enum: ["Formal", "Non-formal"] },
      cooperativeTraining: { type: String, required: true, enum: ["Large scale enterprise", "Medium scale enterprise", "Small scale enterprise", "None"] }
    },
    employmentInformation: {
      employmentStatus: { type: String, required: true, enum: ["Self employed", "Government employed", "Private employed", "Unemployed"] },
      companyName: { type: String, trim: true, default: "" },
      companyCategory: { type: String, required: true, enum: ["Micro and small scale enterprise", "Medium and large enterprise", "Not applicable"] }
    },
    assessmentInformation: {
      registerFor: { type: String, required: true, enum: ["Theory", "Practical", "Both"] },
      assessmentType: { type: String, required: true, enum: ["New Assessment", "Reassessment"] }
    },
    passportPhoto: {
      filename: { type: String, required: true },
      originalName: { type: String, required: true },
      path: { type: String, required: true },
      storage: { type: String, default: "mongodb" },
      mimetype: { type: String, required: true },
      size: { type: Number, required: true },
      data: { type: Buffer, select: false }
    },
    fayadaDigitalId: {
      filename: { type: String, required: true },
      originalName: { type: String, required: true },
      path: { type: String, required: true },
      storage: { type: String, default: "mongodb" },
      mimetype: { type: String, required: true },
      size: { type: Number, required: true },
      data: { type: Buffer, select: false }
    },
    paymentInformation: {
      bankName: { type: String, required: true, trim: true }
    },
    paymentScreenshot: {
      filename: { type: String, required: true },
      originalName: { type: String, required: true },
      path: { type: String, required: true },
      storage: { type: String, default: "mongodb" },
      mimetype: { type: String, required: true },
      size: { type: Number, required: true },
      data: { type: Buffer, select: false }
    },
    agreementAccepted: { type: Boolean, required: true },
    digitalSignature: { type: String, trim: true, default: "" },
    submittedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const Application = mongoose.model("Application", applicationSchema);

