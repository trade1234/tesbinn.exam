import { useEffect, useRef } from "react";
import logoUrl from "../logo/download.png";

export function drawCertificate(canvas, c, logo) {
  const ctx=canvas.getContext("2d"),w=1600,h=1130; canvas.width=w;canvas.height=h;
  const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,"#f8fbff");g.addColorStop(.55,"#fff");g.addColorStop(1,"#eef6ff");ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  ctx.strokeStyle="#0b5cab";ctx.lineWidth=18;ctx.strokeRect(28,28,w-56,h-56);ctx.strokeStyle="#c79b2b";ctx.lineWidth=4;ctx.strokeRect(52,52,w-104,h-104);
  ctx.fillStyle="#0b5cab";ctx.beginPath();ctx.moveTo(28,28);ctx.lineTo(330,28);ctx.lineTo(28,330);ctx.fill();ctx.beginPath();ctx.moveTo(w-28,h-28);ctx.lineTo(w-330,h-28);ctx.lineTo(w-28,h-330);ctx.fill();
  if(logo)ctx.drawImage(logo,w/2-64,82,128,128);
  const center=(text,y,font,color="#16324f")=>{ctx.font=font;ctx.fillStyle=color;ctx.textAlign="center";ctx.fillText(text,w/2,y)};
  center(c.companyName||"Trade Ethiopia SBI",244,"700 28px Arial","#0b5cab");
  center("CERTIFICATE OF ACHIEVEMENT",330,"700 54px Georgia","#13294b");
  center("This certificate is proudly presented to",397,"24px Arial","#64748b");
  center(c.studentName,486,"italic 700 58px Georgia","#0b5cab");
  ctx.strokeStyle="#c79b2b";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(390,510);ctx.lineTo(1210,510);ctx.stroke();
  center("for successfully completing and passing",570,"24px Arial","#64748b");
  center(c.courseName,636,"700 38px Georgia","#13294b");
  center(c.examName,683,"22px Arial","#475569");
  ctx.fillStyle="#edf6ff";ctx.roundRect(420,725,760,92,18);ctx.fill();
  center("FINAL SCORE  "+c.score+" / "+c.totalMarks+"     |     "+c.percentage+"%     |     PASS",783,"700 27px Arial","#067647");
  ctx.textAlign="left";ctx.fillStyle="#475569";ctx.font="18px Arial";ctx.fillText("Certificate ID",125,920);ctx.fillStyle="#13294b";ctx.font="700 20px Arial";ctx.fillText(c.certificateId,125,952);
  ctx.textAlign="center";ctx.strokeStyle="#64748b";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(630,935);ctx.lineTo(970,935);ctx.stroke();ctx.fillStyle="#13294b";ctx.font="italic 25px Georgia";ctx.fillText(c.signatoryName||"Authorized Certification Officer",800,925);ctx.font="16px Arial";ctx.fillStyle="#64748b";ctx.fillText("Authorized Signature",800,960);
  ctx.textAlign="right";ctx.font="18px Arial";ctx.fillText("Issue Date",1475,920);ctx.fillStyle="#13294b";ctx.font="700 20px Arial";ctx.fillText(new Date(c.issueDate).toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"}),1475,952);
  center("Verified professional credential - "+(c.enrollmentNumber||"Trade Ethiopia Certification"),1035,"16px Arial","#64748b");
}
export default function CertificateCanvas({certificate,className=""}){const ref=useRef(null);useEffect(()=>{if(!certificate)return;const img=new Image();img.onload=()=>drawCertificate(ref.current,certificate,img);img.onerror=()=>drawCertificate(ref.current,certificate);img.src=logoUrl},[certificate]);return <canvas ref={ref} className={"w-full rounded-xl shadow-2xl "+className} aria-label={"Certificate for "+certificate?.studentName}/>;}
export async function certificateBlob(certificate){const canvas=document.createElement("canvas");const logo=new Image();await new Promise(resolve=>{logo.onload=resolve;logo.onerror=resolve;logo.src=logoUrl});drawCertificate(canvas,certificate,logo.complete?logo:null);return new Promise(resolve=>canvas.toBlob(resolve,"image/png",1));}
