import { Router } from "express";
import { uploadCSVs } from "../middleware/uploadFiles";
import { multerErrorHandler } from "../middleware";
import { LSSTCSMController } from "../controllers/LSSTCSMController";
import { LSSTIMTController } from "../controllers/LSSTIMTController";
import { authMiddleware } from "../middleware/auth";


const router = Router()

// LSS_TCSM

router.post('/validate-tcsm',
  authMiddleware,
  uploadCSVs,
  multerErrorHandler,
  LSSTCSMController.validateFile
)


// LSS_TIMT

router.post('/validate-timt',
  authMiddleware,
  uploadCSVs,
  multerErrorHandler,
  LSSTIMTController.validateFile
)

router.get('/get-summary',
  authMiddleware,
  LSSTIMTController.getSummary
)


export default router