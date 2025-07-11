import { Router } from "express";
import { uploadCSV } from "../middleware/uploadFiles";
import { SamsController } from "../controllers/SamsController";

const router = Router()

router.get('/all-records',
  SamsController.getAllRecords
)

router.post('/new-version',
  uploadCSV,
  SamsController.createSamsRecordController
)

router.post('/find-by-file',
  uploadCSV,
  SamsController.getSamsByFile
)
export default router