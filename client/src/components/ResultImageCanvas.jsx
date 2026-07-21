import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import logoUrl from "../logo/download.png";

const NAVY = "#071f4e";
const BLUE = "#0960b9";
const GOLD = "#f3bd52";
const INK = "#0b2249";
const MUTED = "#65738d";

function loadImage(source) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = source;
  });
}

function roundedRect(ctx, x, y, width, height, radius, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}

function fittedText(ctx, text, x, y, maxWidth, size, color = INK, align = "left") {
  const value = String(text || "Not provided");
  let fontSize = size;
  ctx.textAlign = align;
  ctx.fillStyle = color;
  do {
    ctx.font = `700 ${fontSize}px Arial`;
    if (ctx.measureText(value).width <= maxWidth) break;
    fontSize -= 2;
  } while (fontSize > 20);
  ctx.fillText(value, x, y);
}

function formatResultDate(value) {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function label(ctx, text, x, y, align = "left") {
  ctx.textAlign = align;
  ctx.fillStyle = MUTED;
  ctx.font = "700 17px Arial";
  ctx.fillText(text.toUpperCase(), x, y);
}

function iconCircle(ctx, x, y, glyph) {
  ctx.fillStyle = "#edf5ff";
  ctx.beginPath();
  ctx.arc(x, y, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.textAlign = "center";
  ctx.fillStyle = BLUE;
  ctx.font = "700 30px Arial";
  ctx.fillText(glyph, x, y + 10);
}

function drawConfetti(ctx, width) {
  const pieces = [
    [72, 104, 9, GOLD], [180, 172, 7, "#1474ca"], [1015, 92, 7, GOLD], [1110, 185, 10, "#267dcc"],
    [93, 300, 11, GOLD], [1080, 325, 8, GOLD], [245, 85, 5, "#2e83ce"], [932, 252, 6, "#2e83ce"]
  ];
  pieces.forEach(([x, y, size, color], index) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(index * .55);
    ctx.fillStyle = color;
    ctx.fillRect(-size, -size / 2, size * 2, size);
    ctx.restore();
  });
  const glow = ctx.createRadialGradient(width - 120, 40, 2, width - 120, 40, 120);
  glow.addColorStop(0, "rgba(35,124,210,.4)");
  glow.addColorStop(1, "rgba(35,124,210,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(width - 250, 0, 250, 220);
}

function drawLaurel(ctx, x, y, flip = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip, 1);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 45, Math.PI * .65, Math.PI * 1.35);
  ctx.stroke();
  ctx.fillStyle = GOLD;
  for (let i = -2; i <= 2; i += 1) {
    const angle = Math.PI + i * .22;
    const px = Math.cos(angle) * 44;
    const py = Math.sin(angle) * 44;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, 5, 12, .7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

export async function drawResultImage(canvas, result) {
  const width = 1200;
  const height = 1500;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const passed = result.status === "PASS";
  const statusColor = passed ? "#07965f" : "#d82323";
  const statusTint = passed ? "#e8f8f1" : "#fff0f0";
  const percentage = Number(result.percentage || 0);

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#203a4a");
  background.addColorStop(.35, "#073d7b");
  background.addColorStop(.72, "#072d68");
  background.addColorStop(1, "#f4f8fd");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  drawConfetti(ctx, width);

  const qrPayload = JSON.stringify({ organization: "Trade Ethiopia SBI", resultId: String(result.attemptId || ""), student: result.studentName, trainingType: result.trainingType, exam: result.examName, score: `${result.score}/${result.totalMarks}`, percentage: result.percentage, result: result.status, submittedAt: result.submittedAt });
  const [logo, qr] = await Promise.all([
    loadImage(logoUrl),
    loadImage(await QRCode.toDataURL(qrPayload, { width: 340, margin: 2, errorCorrectionLevel: "M" }))
  ]);

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(width / 2, 115, 57, 0, Math.PI * 2);
  ctx.stroke();
  if (logo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, 115, 48, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#fff";
    ctx.fillRect(width / 2 - 48, 67, 96, 96);
    ctx.drawImage(logo, width / 2 - 44, 71, 88, 88);
    ctx.restore();
  }
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = "800 31px Arial";
  ctx.fillText("TRADE ETHIOPIA SBI", width / 2, 218);
  ctx.fillStyle = GOLD;
  ctx.font = "700 20px Arial";
  ctx.fillText("TESBINN FINAL EXAMINATION", width / 2, 256);
  drawLaurel(ctx, 382, 330, 1);
  drawLaurel(ctx, 818, 330, -1);
  ctx.fillStyle = "#fff";
  ctx.font = "800 55px Arial";
  ctx.fillText("EXAM", 515, 340);
  ctx.fillStyle = GOLD;
  ctx.fillText("RESULT", 686, 340);
  ctx.fillStyle = "#fff";
  ctx.font = "500 19px Arial";
  ctx.fillText("Your Performance Summary", width / 2, 376);

  ctx.shadowColor = "rgba(7,31,78,.22)";
  ctx.shadowBlur = 35;
  ctx.shadowOffsetY = 14;
  roundedRect(ctx, 65, 420, 1070, 1010, 30, "#fff");
  ctx.shadowColor = "transparent";

  roundedRect(ctx, 325, 450, 550, 130, 24, statusTint);
  ctx.fillStyle = statusColor;
  ctx.beginPath();
  ctx.arc(460, 515, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "800 42px Arial";
  ctx.fillText(passed ? "✓" : "×", 460, 529);
  ctx.textAlign = "left";
  ctx.fillStyle = statusColor;
  ctx.font = "800 49px Arial";
  ctx.fillText(result.status || "RESULT", 525, 520);
  ctx.fillStyle = MUTED;
  ctx.font = "500 16px Arial";
  ctx.fillText(passed ? "Congratulations on your achievement!" : "Keep learning, keep growing.", 525, 551);

  iconCircle(ctx, 170, 670, "♙");
  label(ctx, "Student full name", 230, 655);
  fittedText(ctx, result.studentName, 230, 695, 330, 29);
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(600, 620); ctx.lineTo(600, 710); ctx.stroke();
  iconCircle(ctx, 690, 670, "◆");
  label(ctx, "Training type", 750, 655);
  fittedText(ctx, result.trainingType || result.courseName, 750, 695, 310, 29);
  ctx.beginPath(); ctx.moveTo(105, 745); ctx.lineTo(1095, 745); ctx.stroke();
  iconCircle(ctx, 470, 805, "▣");
  label(ctx, "Exam", 535, 790);
  fittedText(ctx, result.examName, 535, 830, 500, 27);

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(105, 852); ctx.lineTo(1095, 852); ctx.stroke();
  label(ctx, "Student ID", 190, 878);
  fittedText(ctx, result.enrollmentNumber || "Not assigned", 190, 906, 330, 22);
  label(ctx, "Result date", 690, 878);
  fittedText(ctx, formatResultDate(result.submittedAt), 690, 906, 300, 22);

  roundedRect(ctx, 105, 930, 990, 190, 25, "#eef6ff");
  ctx.strokeStyle = "#d9e9fa";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(400, 950); ctx.lineTo(400, 1095); ctx.moveTo(755, 950); ctx.lineTo(755, 1095); ctx.stroke();

  ctx.strokeStyle = "#dce9f8";
  ctx.lineWidth = 17;
  ctx.beginPath(); ctx.arc(250, 1025, 67, -.55, Math.PI * 1.78); ctx.stroke();
  const scoreGradient = ctx.createLinearGradient(180, 920, 330, 1060);
  scoreGradient.addColorStop(0, "#42a5f5"); scoreGradient.addColorStop(1, "#1260bb");
  ctx.strokeStyle = scoreGradient;
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(250, 1025, 67, -.55, -.55 + Math.PI * 2 * Math.min(percentage, 100) / 100); ctx.stroke();
  ctx.lineCap = "butt";
  ctx.fillStyle = INK;
  ctx.font = "800 36px Arial";
  ctx.fillText(`${percentage}%`, 250, 1035);
  ctx.font = "700 16px Arial";
  ctx.fillText("SCORE", 250, 1068);

  label(ctx, "Marks obtained", 505, 995);
  fittedText(ctx, result.score, 505, 1045, 190, 39);
  ctx.fillStyle = INK;
  ctx.font = "700 17px Arial";
  ctx.fillText(`OUT OF ${result.totalMarks}`, 505, 1075);
  iconCircle(ctx, 835, 995, "☆");
  label(ctx, "Grade", 900, 997);
  ctx.fillStyle = statusColor;
  ctx.font = "800 36px Arial";
  ctx.fillText(result.status || "RESULT", 900, 1060);

  roundedRect(ctx, 88, 1150, 1024, 220, 25, "#06367a");
  ctx.fillStyle = "#fff8e8";
  ctx.beginPath(); ctx.arc(168, 1260, 43, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.font = "700 37px Arial";
  ctx.fillText(passed ? "★" : "♛", 168, 1273);
  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  ctx.font = "700 20px Arial";
  ctx.fillText(passed ? "Well done!" : "Don't give up!", 235, 1235);
  ctx.font = "500 16px Arial";
  ctx.fillText(passed ? "Your hard work has paid off." : "Every attempt brings you closer", 235, 1270);
  ctx.fillText(passed ? "Keep reaching for excellence!" : "to success. Keep pushing forward!", 235, 1300);
  ctx.strokeStyle = "rgba(255,255,255,.35)";
  ctx.beginPath(); ctx.moveTo(585, 1185); ctx.lineTo(585, 1335); ctx.stroke();
  if (qr) ctx.drawImage(qr, 642, 1185, 150, 150);
  ctx.fillStyle = "#fff";
  ctx.font = "700 20px Arial";
  ctx.fillText("Scan to verify", 825, 1238);
  ctx.font = "500 15px Arial";
  ctx.fillText("Read the complete result", 825, 1272);
  ctx.fillText("details and authenticity.", 825, 1300);
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