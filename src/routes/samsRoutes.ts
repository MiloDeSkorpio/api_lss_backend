import { Router } from "express";
import { uploadCSV } from "../middleware/uploadFiles";
import { SamsController } from "../controllers/SamsController";
import { authMiddleware } from "../middleware/auth"
import { multerErrorHandler } from "../middleware";

const router = Router()

router.post('/validate',
  authMiddleware, 
  uploadCSV,
  multerErrorHandler,
  SamsController.validateSamsRecordController
)

router.post('/new-version',
  authMiddleware,
  SamsController.createSamsRecordController
)

router.get('/all-records',
  authMiddleware,
  SamsController.getAllRecords
)


router.post('/find-by-file',
  authMiddleware,
  uploadCSV,
  SamsController.getSamsByFile
)
export default router