import { useEffect, useRef } from "react";
import logoUrl from "../logo/download.png";

export function drawCertificate(canvas, c, logo) {
  const ctx=canvas.getContext("2d"),w=1600,h=1130; canvas.width=w;canvas.height=h;
  const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,"#f8fbff");g.addColorStop(.55,"#fff");g.addColorStop(1,"#eef6ff");ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  ctx.strokeStyle="#d5a23c";ctx.lineWidth=5;ctx.strokeRect(48,48,w-96,h-96);ctx.strokeStyle="#e7bd68";ctx.lineWidth=2;ctx.strokeRect(62,62,w-124,h-124);
  ctx.fillStyle="#062657";ctx.beginPath();ctx.moveTo(28,28);ctx.lineTo(430,28);ctx.lineTo(28,350);ctx.fill();ctx.beginPath();ctx.moveTo(w-28,h-28);ctx.lineTo(w-420,h-28);ctx.lineTo(w-28,h-360);ctx.fill();ctx.strokeStyle="#d5a23c";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(28,368);ctx.lineTo(452,28);ctx.stroke();ctx.beginPath();ctx.moveTo(w-445,h-28);ctx.lineTo(w-28,h-382);ctx.stroke();
  if(logo)ctx.drawImage(logo,w/2-64,82,128,128);
  const center=(text,y,font,color="#16324f",maxWidth=w-240)=>{ctx.font=font;ctx.fillStyle=color;ctx.textAlign="center";ctx.fillText(String(text||""),w/2,y,maxWidth)};
  center(c.companyName||"Trade Ethiopia School of Business and Innovation",244,"700 28px Arial","#0b5cab",900);
  center("CERTIFICATE OF ACHIEVEMENT",330,"700 54px Georgia","#13294b");
  center("This certificate is proudly presented to",397,"24px Arial","#64748b");
  center(c.studentName,486,"italic 700 58px Georgia","#0b5cab",900);
  ctx.strokeStyle="#c79b2b";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(390,510);ctx.lineTo(1210,510);ctx.stroke();
  center("for successfully completing and passing",570,"24px Arial","#64748b");
  center(c.courseName,636,"700 38px Georgia","#13294b",1000);
  center(c.examName,683,"22px Arial","#475569",900);
  ctx.fillStyle="#f6f8fa";ctx.strokeStyle="#c9d0d8";ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(420,715,760,112,18);ctx.fill();ctx.stroke();
  ctx.strokeStyle="#dfb65f";ctx.beginPath();ctx.moveTo(674,732);ctx.lineTo(674,810);ctx.moveTo(926,732);ctx.lineTo(926,810);ctx.stroke();
  const percentage=Number(c.percentage);
  const percentageText=Number.isFinite(percentage)?`${Number(percentage.toFixed(2))}%`:"--";
  ctx.textAlign="center";ctx.fillStyle="#12203f";ctx.font="700 15px Arial";ctx.fillText("FINAL SCORE",547,750);ctx.fillStyle="#0754ad";ctx.font="700 29px Arial";ctx.fillText(c.score+" / "+c.totalMarks,547,798);
  ctx.fillStyle="#12203f";ctx.font="700 15px Arial";ctx.fillText("PERCENTAGE",800,750);ctx.fillStyle="#0754ad";ctx.font="700 29px Arial";ctx.fillText(percentageText,800,798);ctx.fillStyle="#12203f";ctx.font="700 15px Arial";ctx.fillText("RESULT",1052,750);ctx.fillStyle="#08783f";ctx.font="700 29px Arial";ctx.fillText("PASS",1052,798);
  ctx.textAlign="left";ctx.fillStyle="#475569";ctx.font="18px Arial";ctx.fillText("Certificate ID",125,920);ctx.fillStyle="#13294b";ctx.font="700 20px Arial";ctx.fillText(c.certificateId,125,952);
  ctx.textAlign="center";ctx.strokeStyle="#64748b";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(630,935);ctx.lineTo(970,935);ctx.stroke();ctx.fillStyle="#13294b";ctx.font="italic 25px Georgia";ctx.fillText(c.signatoryName||"Authorized Certification Officer",800,925,320);ctx.font="16px Arial";ctx.fillStyle="#64748b";ctx.fillText("Authorized Signature",800,960);
  const issueDate=new Date(c.issueDate);
  const issueDateText=Number.isNaN(issueDate.getTime())?"Date unavailable":issueDate.toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"});
  ctx.textAlign="center";ctx.fillStyle="#475569";ctx.font="18px Arial";ctx.fillText("Issue Date",1250,920);ctx.fillStyle="#13294b";ctx.font="700 20px Arial";ctx.fillText(issueDateText,1250,952);
  center("Verified professional credential - "+(c.enrollmentNumber||"Trade Ethiopia Certification"),1035,"16px Arial","#64748b",1050);
}
export default function CertificateCanvas({certificate,className=""}){const ref=useRef(null);useEffect(()=>{if(!certificate)return;const img=new Image();img.onload=()=>drawCertificate(ref.current,certificate,img);img.onerror=()=>drawCertificate(ref.current,certificate);img.src=logoUrl},[certificate]);return <canvas ref={ref} className={"block aspect-[1600/1130] h-auto w-full rounded-lg "+className} aria-label={"Certificate for "+certificate?.studentName}/>;}
export async function certificateBlob(certificate){const canvas=document.createElement("canvas");const logo=new Image();await new Promise(resolve=>{logo.onload=resolve;logo.onerror=resolve;logo.src=logoUrl});drawCertificate(canvas,certificate,logo.complete?logo:null);return new Promise(resolve=>canvas.toBlob(resolve,"image/png",1));}
