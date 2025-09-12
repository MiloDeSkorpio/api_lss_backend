import { Router } from "express"
import { BlacklistController } from "../controllers/BlacklistController"
import { uploadCSV,uploadCSVs } from "../middleware/uploadFiles"
import { handleInputErrors, multerErrorHandler } from "../middleware"

const router = Router()

router.post('/validate',
  uploadCSVs,
  handleInputErrors,
  multerErrorHandler,
  BlacklistController.validateBLFiles
)
router.get('/last-version',
  BlacklistController.getLastVersionRecords
)
export default router