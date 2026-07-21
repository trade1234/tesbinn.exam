import { Router } from "express";
import { authorize,protect } from "../middlewares/auth.js";
import { getCertificate,listCertificates,recordDownload,removeCertificate,updateCertificate } from "../controllers/certificate.controller.js";
const router=Router();router.get("/",protect,listCertificates);router.get("/:id",protect,getCertificate);router.post("/:id/download",protect,recordDownload);router.put("/:id",protect,authorize("ADMIN"),updateCertificate);router.delete("/:id",protect,authorize("ADMIN"),removeCertificate);export default router;
