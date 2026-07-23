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
  const panelX=380,panelY=715,panelWidth=840,panelHeight=112,cellWidth=panelWidth/3;
  ctx.fillStyle="#f8fafc";ctx.strokeStyle="#cbd5e1";ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(panelX,panelY,panelWidth,panelHeight,18);ctx.fill();ctx.stroke();
  ctx.strokeStyle="#e1b955";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(panelX+cellWidth,panelY+17);ctx.lineTo(panelX+cellWidth,panelY+panelHeight-17);ctx.moveTo(panelX+cellWidth*2,panelY+17);ctx.lineTo(panelX+cellWidth*2,panelY+panelHeight-17);ctx.stroke();
  const percentage=Number(c.percentage);
  const percentageText=Number.isFinite(percentage)?`${Number(percentage.toFixed(2))}%`:"--";
  const scoreText=Number.isFinite(Number(c.score))&&Number.isFinite(Number(c.totalMarks))?`${c.score} / ${c.totalMarks}`:"--";
  const resultText=String(c.status||"PASS").toUpperCase();
  const resultCell=(label,value,index,valueColor)=>{const x=panelX+cellWidth*(index+.5);ctx.textAlign="center";ctx.textBaseline="alphabetic";ctx.fillStyle="#334155";ctx.font="600 14px Arial";ctx.fillText(label,x,750,220);ctx.fillStyle=valueColor;ctx.font="700 27px Arial";ctx.fillText(value,x,797,220)};
  resultCell("FINAL SCORE",scoreText,0,"#0754ad");
  resultCell("PERCENTAGE",percentageText,1,"#0754ad");
  resultCell("RESULT",resultText,2,"#08783f");
  ctx.textAlign="left";ctx.fillStyle="#475569";ctx.font="18px Arial";ctx.fillText("Certificate ID",150,875);ctx.fillStyle="#13294b";ctx.font="700 20px Arial";ctx.fillText(c.certificateId,150,910,330);
  ctx.textAlign="center";ctx.strokeStyle="#64748b";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(630,900);ctx.lineTo(970,900);ctx.stroke();ctx.fillStyle="#13294b";ctx.font="italic 25px Georgia";ctx.fillText(c.signatoryName||"Authorized Certification Officer",800,890,320);ctx.font="16px Arial";ctx.fillStyle="#64748b";ctx.fillText("Authorized Signature",800,925);
  const issueDate=new Date(c.issueDate);
  const issueDateText=Number.isNaN(issueDate.getTime())?"Date unavailable":issueDate.toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"});
  ctx.textAlign="center";ctx.fillStyle="#475569";ctx.font="18px Arial";ctx.fillText("Issue Date",1250,875);ctx.fillStyle="#13294b";ctx.font="700 20px Arial";ctx.fillText(issueDateText,1250,910,330);
  center("Verified professional credential - "+(c.enrollmentNumber||"Trade Ethiopia Certification"),1035,"16px Arial","#64748b",1050);
}
export default function CertificateCanvas({certificate,className=""}){const ref=useRef(null);useEffect(()=>{if(!certificate)return;const img=new Image();img.onload=()=>drawCertificate(ref.current,certificate,img);img.onerror=()=>drawCertificate(ref.current,certificate);img.src=logoUrl},[certificate]);return <canvas ref={ref} className={"block aspect-[1600/1130] h-auto w-full rounded-lg "+className} aria-label={"Certificate for "+certificate?.studentName}/>;}
export async function certificateBlob(certificate){const canvas=document.createElement("canvas");const logo=new Image();await new Promise(resolve=>{logo.onload=resolve;logo.onerror=resolve;logo.src=logoUrl});drawCertificate(canvas,certificate,logo.complete?logo:null);return new Promise(resolve=>canvas.toBlob(resolve,"image/png",1));}
