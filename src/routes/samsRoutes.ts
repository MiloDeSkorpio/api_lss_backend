import { Router } from "express";
import { uploadCSV } from "../middleware/uploadFiles";
import { SamsController } from "../controllers/SamsController";
import { authMiddleware } from "../middleware/auth"
import { handleInputErrors, multerErrorHandler } from "../middleware";

const router = Router()

router.post('/validate',
  authMiddleware, 
  uploadCSV,
  multerErrorHandler,
  SamsController.validateSamsRecordController
)

router.get('/all-records',
  authMiddleware,
  SamsController.getAllRecords
)

// router.post('/new-version',
//   authMiddleware,
//   uploadCSV,
//   SamsController.createSamsRecordController
// )

router.post('/find-by-file',
  authMiddleware,
  uploadCSV,
  SamsController.getSamsByFile
)
export default router