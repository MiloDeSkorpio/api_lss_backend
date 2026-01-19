import { Router } from "express";
import { uploadCSVs } from "../middleware/uploadFiles";
import { multerErrorHandler } from "../middleware";
import { LSSTCSMController } from "../controllers/LSSTCSMController";
import { LSSTIMTController } from "../controllers/LSSTIMTController";


const router = Router()

// LSS_TCSM

router.post('/validate-tcsm',
  uploadCSVs,
  multerErrorHandler,
  LSSTCSMController.validateFile
)


// LSS_TIMT

router.post('/validate-timt',
  uploadCSVs,
  multerErrorHandler,
  LSSTIMTController.validateFile
)


export default router