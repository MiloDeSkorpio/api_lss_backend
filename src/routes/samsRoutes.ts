import { Router } from "express";
import { uploadCSV } from "../middleware/uploadFiles";
import { SamsController } from "../controllers/SamsController";

const router = Router()

router.post('/new-version',
  uploadCSV,
  SamsController.createSamsRecordController
)

export default router