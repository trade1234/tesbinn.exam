import { useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { api, apiBaseURL } from "../services/api.js";
import tessbinLogo from "../logo/download.png";

const steps = [
  "Personal Information",
  "Training Information",
  "Employment & Assessment",
  "Payment",
  "Review & Submit"
];

const fieldGroups = [
  [
    "firstName", "lastName", "grandfatherName", "gender", "age", "nationality", "subCity",
    "woreda", "address", "phoneNumber", "maritalStatus", "physicalDisability", "passportPhoto", "fayadaDigitalId"
  ],
  [
    "occupation", "collegeInstituteName", "institutionType", "trainingStartMonth", "trainingEndMonth", "trainingMode", "trainingProgram", "trainingType", "cooperativeTraining"
  ],
  ["employmentStatus", "companyCategory", "registerFor", "assessmentType"],
  ["paymentBank", "paymentScreenshot"],
  ["agreementAccepted"]
];

const defaultValues = {
  physicalDisability: "No",
  companyCategory: "Not applicable",
  registerFor: "Both",
  assessmentType: "New Assessment"
};

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

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const compressedUploadSize = 2 * 1024 * 1024;
const maxImageDimension = 1600;

function validateUpload(files) {
  const file = files?.[0];
  if (!file) return "This image is required";
  if (!allowedImageTypes.includes(file.type)) return "Uploaded files must be JPG, PNG, or WEBP";
  return true;
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the uploaded image."));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not compress the uploaded image."));
    }, "image/jpeg", quality);
  });
}

async function compressImageFile(file) {
  const image = await readImage(file);
  let scale = Math.min(1, maxImageDimension / Math.max(image.naturalWidth, image.naturalHeight));
  let quality = 0.86;
  let blob = null;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    blob = await canvasToBlob(canvas, quality);
    if (blob.size <= compressedUploadSize) break;

    if (quality > 0.58) quality -= 0.08;
    else scale *= 0.82;
  }

  if (!blob || blob.size > compressedUploadSize) {
    throw new Error("This image is too large to compress. Please choose a smaller image.");
  }

  const filename = file.name.replace(/\.[^.]+$/, "") || "upload";
  return new File([blob], `${filename}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}

const validationFieldLabels = {
  trainingEndMonth: "Training end month"
};

function formatValidationDetails(details) {
  if (!Array.isArray(details) || details.length === 0) return "";

  return details
    .map((detail) => {
      const fieldKey = Array.isArray(detail.path) && detail.path.length > 0 ? detail.path.join(".") : "Application";
      const field = validationFieldLabels[fieldKey] || fieldKey;
      return `${field}: ${detail.message}`;
    })
    .join("; ");
}


function FieldError({ error }) {
  return error ? <div className="invalid-feedback d-block">{error.message}</div> : null;
}

function Field({ label, error, span = "third", children }) {
  return (
    <div className={`form-field form-field-${span}`}>
      <label className="form-label">{label}</label>
      {children}
      <FieldError error={error} />
    </div>
  );
}

function SelectField({ label, error, span = "third", registerProps, children }) {
  return (
    <Field label={label} error={error} span={span}>
      <select className={`form-select ${error ? "is-invalid" : ""}`} {...registerProps}>{children}</select>
    </Field>
  );
}

function TextField({ label, error, span = "third", registerProps, ...props }) {
  return (
    <Field label={label} error={error} span={span}>
      <input className={`form-control ${error ? "is-invalid" : ""}`} {...registerProps} {...props} />
    </Field>
  );
}

function RadioGroup({ label, error, options, registerProps, span = "half" }) {
  return (
    <Field label={label} error={error} span={span}>
      <div className="choice-row">
        {options.map((option) => (
          <label className="form-check-inline" key={option}>
            <input type="radio" value={option} {...registerProps} />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </Field>
  );
}

function ReviewItem({ label, value, mobileHidden = false }) {
  return (
    <div className={`review-item ${mobileHidden ? "review-item-mobile-hidden" : ""}`}>
      <span>{label}</span>
      <strong>{value || "Not provided"}</strong>
    </div>
  );
}

function SignaturePad({ onChange }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  function pointFromEvent(event) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height
    };
  }

  function startDrawing(event) {
    event.preventDefault();
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const point = pointFromEvent(event);
    drawingRef.current = true;
    context.lineWidth = 2.4;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#111827";
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function draw(event) {
    if (!drawingRef.current) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const point = pointFromEvent(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function stopDrawing() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    onChange(canvasRef.current.toDataURL("image/png"));
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  }

  return (
    <div className="digital-signature-pad">
      <div className="signature-canvas-frame">
        <canvas
          ref={canvasRef}
          width="640"
          height="220"
          aria-label="Draw digital signature"
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          onPointerLeave={stopDrawing}
        />
      </div>
      <button className="signature-clear-button" type="button" onClick={clearSignature}>Clear Signature</button>
    </div>
  );
}


export default function ApplicationRegistration() {
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(null);
  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({ defaultValues, mode: "onTouched" });

  const values = watch();
  const photoStatus = values.passportPhoto?.[0] ? "Uploaded" : "Not uploaded";
  const fayadaStatus = values.fayadaDigitalId?.[0] ? "Uploaded" : "Not uploaded";
  const paymentScreenshotStatus = values.paymentScreenshot?.[0] ? "Uploaded" : "Not uploaded";

  const reviewItems = useMemo(() => [
    ["First Name", values.firstName],
    ["Last Name", values.lastName],
    ["Grandfather Name", values.grandfatherName],
    ["Gender", values.gender],
    ["Age", values.age],
    ["Nationality", values.nationality],
    ["Sub City", values.subCity],
    ["Woreda", values.woreda],
    ["Address", values.address],
    ["Phone Number", values.phoneNumber],
    ["Email", values.email],
    ["Marital Status", values.maritalStatus],
    ["Physical Disability", values.physicalDisability],
    ...(values.disabilityDescription ? [["Disability Description", values.disabilityDescription]] : []),
    ["Passport Photo", photoStatus, { mobileHidden: true }],
    ["FAYADA DIGITAL ID", fayadaStatus, { mobileHidden: true }],
    ["Occupation", values.occupation],
    ["College/Institute Name", values.collegeInstituteName],
    ["Institution Type", values.institutionType],
    ["Training Start Month", values.trainingStartMonth],
    ["Training End Month", values.trainingEndMonth],
    ["Training Mode", values.trainingMode],
    ["Training Program", values.trainingProgram],
    ["Training Type", values.trainingType],
    ["Cooperative Training", values.cooperativeTraining],
    ["Employment Status", values.employmentStatus],
    ["Company Name", values.companyName],
    ["Company Category", values.companyCategory],
    ["Register For", values.registerFor],
    ["Assessment Type", values.assessmentType],
    ["Payment Bank", values.paymentBank],
    ["Payment Screenshot", paymentScreenshotStatus, { mobileHidden: true }]
  ], [values, photoStatus, fayadaStatus, paymentScreenshotStatus]);

  async function goNext() {
    const fields = [...fieldGroups[step]];
    if (step === 0 && values.physicalDisability === "Yes") fields.push("disabilityDescription");
    const isValid = await trigger(fields, { shouldFocus: true });
    if (isValid) setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function goBack() {
    setStep((current) => Math.max(current - 1, 0));
  }

  async function onSubmit(data) {
    setServerError("");
    if (window.innerWidth <= 767 && !data.digitalSignature?.trim()) {
      setServerError("Draw your digital signature before submitting.");
      return;
    }
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === "passportPhoto" || key === "fayadaDigitalId" || key === "paymentScreenshot") return;
      formData.append(key, value ?? "");
    });
    try {
      const [passportPhoto, fayadaDigitalId, paymentScreenshot] = await Promise.all([
        compressImageFile(data.passportPhoto[0]),
        compressImageFile(data.fayadaDigitalId[0]),
        compressImageFile(data.paymentScreenshot[0])
      ]);
      formData.append("passportPhoto", passportPhoto);
      formData.append("fayadaDigitalId", fayadaDigitalId);
      formData.append("paymentScreenshot", paymentScreenshot);

      const response = await api.post("/applications", formData);
      setSuccess(response.data);
    } catch (error) {
      const status = error.response?.status;
      const responseData = error.response?.data;
      const validationDetails = formatValidationDetails(responseData?.details);
      const serverMessage = validationDetails || responseData?.message;
      const message = serverMessage || (error.request ? `Unable to reach the application server at ${apiBaseURL}. Refresh the page, then try again so the latest image compressor is loaded.` : error.message || "Unable to submit application. Please try again.");
      setServerError(status ? `${message} (HTTP ${status})` : message);
    }
  }

  if (success) {
    return (
      <main className="application-page">
        <div className="application-container application-container-narrow">
          <section className="success-panel text-center mx-auto">
            <CheckCircle2 size={58} className="success-check" />
            <h1>Application Submitted Successfully</h1>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="application-page">
      <div className="application-container">
        <div className="application-shell">
          <aside className="application-sidebar">
            <div className="service-mark"><img src={tessbinLogo} alt="Tessbin logo" /></div>
            <h1>Competency Assessment Registration</h1>
            <p>Complete the application form and review all information before submission.</p>
            <div className="step-list">
              {steps.map((label, index) => (
                <button
                  type="button"
                  className={`step-button ${index === step ? "active" : ""} ${index < step ? "complete" : ""}`}
                  key={label}
                  onClick={() => index < step && setStep(index)}
                >
                  <span>{index + 1}</span>
                  {label}
                </button>
              ))}
            </div>
          </aside>

          <section className="application-content">
            <div className="form-heading">
              <span>Step {step + 1} of {steps.length}</span>
              <h2>{steps[step]}</h2>
            </div>

            {serverError && <div className="alert-danger">{serverError}</div>}

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              {step === 0 && (
                <div className="form-grid">
                  <TextField label="First Name" error={errors.firstName} registerProps={register("firstName", { required: "First name is required" })} />
                  <TextField label="Last Name" error={errors.lastName} registerProps={register("lastName", { required: "Last name is required" })} />
                  <TextField label="Grandfather Name" error={errors.grandfatherName} registerProps={register("grandfatherName", { required: "Grandfather name is required" })} />
                  <SelectField label="Gender" error={errors.gender} registerProps={register("gender", { required: "Gender is required" })}><option value="">Select gender</option><option>Male</option><option>Female</option></SelectField>
                  <TextField label="Age" type="number" error={errors.age} registerProps={register("age", { required: "Age is required", min: { value: 15, message: "Minimum age is 15" } })} />
                  <TextField label="Nationality" error={errors.nationality} registerProps={register("nationality", { required: "Nationality is required" })} />
                  <TextField label="Sub City" error={errors.subCity} registerProps={register("subCity", { required: "Sub city is required" })} />
                  <TextField label="Woreda" error={errors.woreda} registerProps={register("woreda", { required: "Woreda is required" })} />
                  <TextField label="Phone Number" error={errors.phoneNumber} registerProps={register("phoneNumber", { required: "Phone number is required", minLength: { value: 7, message: "Enter a valid phone number" } })} />
                  <TextField label={<span>Email <span className="muted-text">(optional)</span></span>} type="email" span="half" error={errors.email} registerProps={register("email", { pattern: { value: /^\S+@\S+$/i, message: "Enter a valid email" } })} />
                  <SelectField label="Marital Status" span="half" error={errors.maritalStatus} registerProps={register("maritalStatus", { required: "Marital status is required" })}><option value="">Select status</option><option>Single</option><option>Married</option></SelectField>
                  <Field label="Address" error={errors.address} span="full"><textarea className={`form-control ${errors.address ? "is-invalid" : ""}`} rows={2} {...register("address", { required: "Address is required" })} /></Field>
                  <RadioGroup label="Physical Disability" options={["No", "Yes"]} registerProps={register("physicalDisability", { required: true })} />
                  {values.physicalDisability === "Yes" && <TextField label="Disability Description" span="half" error={errors.disabilityDescription} registerProps={register("disabilityDescription", { required: "Disability description is required" })} />}
                  <Field label="Upload Passport Photo (3x4)" error={errors.passportPhoto} span="half"><input className={`form-control ${errors.passportPhoto ? "is-invalid" : ""}`} type="file" accept="image/png,image/jpeg,image/webp" {...register("passportPhoto", { validate: validateUpload })} /></Field>
                  <Field label="Upload FAYADA DIGITAL ID" error={errors.fayadaDigitalId} span="half"><input className={`form-control ${errors.fayadaDigitalId ? "is-invalid" : ""}`} type="file" accept="image/png,image/jpeg,image/webp" {...register("fayadaDigitalId", { validate: validateUpload })} /></Field>
                </div>
              )}

              {step === 1 && (
                <div className="form-grid">
                  <TextField label="Occupation" span="half" error={errors.occupation} registerProps={register("occupation", { required: "Occupation is required" })} />
                  <TextField label="College/Institute Name" span="full" error={errors.collegeInstituteName} registerProps={register("collegeInstituteName", { required: "College or institute name is required" })} />
                  <SelectField label="Institution Type" error={errors.institutionType} registerProps={register("institutionType", { required: "Institution type is required" })}><option value="">Select type</option><option>Government</option><option>Private</option><option>Other</option></SelectField>
                  <TextField label="Training Start Month" type="month" error={errors.trainingStartMonth} registerProps={register("trainingStartMonth", { required: "Training start month is required" })} />
                  <TextField label="Training End Month" type="month" min={values.trainingStartMonth || undefined} error={errors.trainingEndMonth} registerProps={register("trainingEndMonth", { required: "Training end month is required", validate: (value) => !values.trainingStartMonth || !value || value >= values.trainingStartMonth || "End month cannot be before start month" })} />
                  <SelectField label="Training Mode" error={errors.trainingMode} registerProps={register("trainingMode", { required: "Training mode is required" })}><option value="">Select mode</option><option>Regular</option><option>Extension</option><option>Distance</option><option>Other</option></SelectField>
                  <SelectField label="Training Program" error={errors.trainingProgram} registerProps={register("trainingProgram", { required: "Training program is required" })}><option value="">Select program</option><option>Coffee Cupping</option><option>Barista</option><option>Digital Marketing</option><option>International Import Export</option></SelectField>
                  <SelectField label="Training Type" error={errors.trainingType} registerProps={register("trainingType", { required: "Training type is required" })}><option value="">Select type</option><option>Formal</option><option>Non-formal</option></SelectField>
                  <SelectField label="Cooperative Training" error={errors.cooperativeTraining} registerProps={register("cooperativeTraining", { required: "Cooperative training is required" })}><option value="">Select option</option><option>Large scale enterprise</option><option>Medium scale enterprise</option><option>Small scale enterprise</option><option>None</option></SelectField>
                </div>
              )}

              {step === 2 && (
                <div className="form-grid">
                  <SelectField label="Employment Status" span="half" error={errors.employmentStatus} registerProps={register("employmentStatus", { required: "Employment status is required" })}><option value="">Select status</option><option>Self employed</option><option>Government employed</option><option>Private employed</option><option>Unemployed</option></SelectField>
                  <TextField label={<span>Company Name <span className="muted-text">(optional)</span></span>} span="half" registerProps={register("companyName")} />
                  <SelectField label="Company Category" span="half" error={errors.companyCategory} registerProps={register("companyCategory", { required: "Company category is required" })}><option>Not applicable</option><option>Micro and small scale enterprise</option><option>Medium and large enterprise</option></SelectField>
                  <RadioGroup label="Register For" options={["Theory", "Practical", "Both"]} error={errors.registerFor} registerProps={register("registerFor", { required: "Select what to register for" })} />
                  <RadioGroup label="Assessment Type" options={["New Assessment", "Reassessment"]} error={errors.assessmentType} registerProps={register("assessmentType", { required: "Assessment type is required" })} />
                </div>
              )}

              {step === 3 && (
                <div className="form-grid">
                  <SelectField label="Payment Bank" span="half" error={errors.paymentBank} registerProps={register("paymentBank", { required: "Payment bank is required" })}>
                    <option value="">Select bank</option>
                    {ethiopianBanks.map((bank) => <option key={bank} value={bank}>{bank}</option>)}
                  </SelectField>
                  <Field label="Upload Payment Screenshot" error={errors.paymentScreenshot} span="half"><input className={`form-control ${errors.paymentScreenshot ? "is-invalid" : ""}`} type="file" accept="image/png,image/jpeg,image/webp" {...register("paymentScreenshot", { validate: validateUpload })} /></Field>
                </div>
              )}

              {step === 4 && (
                <div>
                  <div className="review-grid">{reviewItems.map(([label, value, options]) => <ReviewItem key={label} label={label} value={value} mobileHidden={options?.mobileHidden} />)}</div>
                  <label className="agreement-check">
                    <input type="checkbox" {...register("agreementAccepted", { required: "Confirmation is required" })} />
                    <span>I confirm that the information provided is correct.</span>
                  </label>
                  <FieldError error={errors.agreementAccepted} />
                  <section className="mobile-digital-registration" aria-label="Digital registration signature">
                    <div className="digital-signature-field">
                      <span>Digital Signature</span>
                      <p>Sign inside the box below.</p>
                      <input
                        type="hidden"
                        {...register("digitalSignature", {
                          validate: (value) => window.innerWidth > 767 || Boolean(value?.trim()) || "Draw your digital signature"
                        })}
                      />
                      <SignaturePad onChange={(signature) => setValue("digitalSignature", signature, { shouldDirty: true, shouldValidate: true })} />
                    </div>
                    <FieldError error={errors.digitalSignature} />
                  </section>
                </div>
              )}

              <div className="wizard-actions">
                <button className="btn-outline-application" type="button" onClick={goBack} disabled={step === 0 || isSubmitting}><ChevronLeft size={18} /> Back</button>
                {step < steps.length - 1 ? (
                  <button className="btn-government" type="button" onClick={goNext}>Next <ChevronRight size={18} /></button>
                ) : (
                  <button className="btn-government" type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="spin-icon" size={18} />} Submit Application</button>
                )}
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}


