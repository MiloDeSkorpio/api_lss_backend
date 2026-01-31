import { Router } from "express";
import { uploadCSV, uploadCSVs } from "../middleware/uploadFiles";
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
router.post('/new-version-timt',
  authMiddleware,
  LSSTIMTController.createNewLssTIMT
)

router.post('/validate-timt',
  authMiddleware,
  uploadCSVs,
  multerErrorHandler,
  LSSTIMTController.validateFile
)

router.get('/get-summary-timt',
  authMiddleware,
  LSSTIMTController.getSummary
)

router.get('/find-timt/:hexId',
  authMiddleware,
  LSSTIMTController.getSamBySerial
)
router.post('/find-by-file-timt',
  authMiddleware,
  uploadCSV,
  LSSTIMTController.getLssTimtByFile
)
export default router