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
      subCity: { type: String, required: true, trim: true },
      woreda: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true },
      phoneNumber: { type: String, required: true, trim: true },
      email: { type: String, trim: true, lowercase: true },
    },
    trainingInformation: {
      institutionType: { type: String, required: true, enum: ["Government", "Private", "Other"] },
      trainingStartMonth: { type: String, required: true },
      trainingEndMonth: { type: String, required: true },
      trainingMode: { type: String, required: true, enum: ["Regular", "Extension", "Distance", "Other"] },
      trainingProgram: { type: String, required: true, enum: ["Coffee Cupping", "Barista", "Digital Marketing", "International Import Export"] },
      trainingType: { type: String, required: true, enum: ["Formal", "Non-formal", "VIP", "Nights"] },
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
