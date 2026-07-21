import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import logoUrl from "../logo/download.png";

function loadImage(source) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = source;
  });
}

function fitText(ctx, text, maxWidth, startSize) {
  let size = startSize;
  do {
    ctx.font = `700 ${size}px Arial`;
    if (ctx.measureText(text).width <= maxWidth) return;
    size -= 2;
  } while (size > 24);
}

export async function drawResultImage(canvas, result) {
  const width = 1200, height = 1500;
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#eff6ff"); gradient.addColorStop(.48, "#fff"); gradient.addColorStop(1, "#ecfdf5");
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#0b5cab"; ctx.fillRect(0, 0, width, 28);
  ctx.fillStyle = result.status === "PASS" ? "#059669" : "#dc2626"; ctx.fillRect(0, height - 28, width, 28);
  ctx.strokeStyle = "#0b5cab"; ctx.lineWidth = 4; ctx.strokeRect(50, 50, width - 100, height - 100);

  const qrPayload = JSON.stringify({ organization: "Trade Ethiopia SBI", resultId: String(result.attemptId || ""), student: result.studentName, trainingType: result.trainingType, exam: result.examName, score: `${result.score}/${result.totalMarks}`, percentage: result.percentage, result: result.status, submittedAt: result.submittedAt });
  const [logo, qr] = await Promise.all([loadImage(logoUrl), loadImage(await QRCode.toDataURL(qrPayload, { width: 320, margin: 2, errorCorrectionLevel: "M" }))]);
  if (logo) ctx.drawImage(logo, width / 2 - 75, 105, 150, 150);
  ctx.textAlign = "center"; ctx.fillStyle = "#0b5cab"; ctx.font = "700 30px Arial"; ctx.fillText("TRADE ETHIOPIA SBI", width / 2, 300);
  ctx.fillStyle = "#64748b"; ctx.font = "600 21px Arial"; ctx.fillText("TESBINN FINAL EXAMINATION", width / 2, 338);
  ctx.fillStyle = "#0f172a"; ctx.font = "700 48px Georgia"; ctx.fillText("OFFICIAL EXAM RESULT", width / 2, 430);
  ctx.fillStyle = result.status === "PASS" ? "#d1fae5" : "#fee2e2"; ctx.beginPath(); ctx.roundRect(350, 480, 500, 110, 24); ctx.fill();
  ctx.fillStyle = result.status === "PASS" ? "#047857" : "#b91c1c"; ctx.font = "800 58px Arial"; ctx.fillText(result.status || "RESULT", width / 2, 555);
  const label = (text, y) => { ctx.fillStyle = "#64748b"; ctx.font = "600 19px Arial"; ctx.fillText(text.toUpperCase(), width / 2, y); };
  const value = (text, y, size) => { text = String(text || "Not provided"); ctx.fillStyle = "#13294b"; fitText(ctx, text, 940, size); ctx.fillText(text, width / 2, y); };
  label("Student full name", 670); value(result.studentName, 720, 42);
  label("Training type", 790); value(result.trainingType || result.courseName, 838, 34);
  label("Exam", 905); value(result.examName, 950, 31);
  ctx.fillStyle = "#eff6ff"; ctx.beginPath(); ctx.roundRect(150, 1005, 900, 130, 22); ctx.fill();
  ctx.fillStyle = "#0f172a"; ctx.font = "800 44px Arial"; ctx.fillText(`${result.score} / ${result.totalMarks}   •   ${result.percentage}%`, width / 2, 1085);
  if (qr) ctx.drawImage(qr, 470, 1175, 260, 260);
  ctx.fillStyle = "#64748b"; ctx.font = "500 17px Arial"; ctx.fillText("Scan to read the complete result details", width / 2, 1465);
}

export async function resultImageBlob(result) {
  const canvas = document.createElement("canvas");
  await drawResultImage(canvas, result);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1));
}

export default function ResultImageCanvas({ result }) {
  const canvasRef = useRef(null);
  useEffect(() => { if (result && canvasRef.current) drawResultImage(canvasRef.current, result); }, [result]);
  return <canvas ref={canvasRef} className="w-full rounded-2xl shadow-2xl" aria-label={`Exam result for ${result?.studentName || "student"}`} />;
}
