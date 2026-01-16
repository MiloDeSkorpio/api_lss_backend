import { Router } from "express";
import { uploadCSVs } from "../middleware/uploadFiles";
import { multerErrorHandler } from "../middleware";
import { LSSTCSMController } from "../controllers/LSSTCSMController";

const router = Router()

// LSS_TCSM

router.post('/validate-tcsm',
  uploadCSVs,
  multerErrorHandler,
  LSSTCSMController.validateFile
)

export default router