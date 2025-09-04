import { Router } from "express"
import { BlacklistController } from "../controllers/BlacklistController"
import { uploadCSV,uploadCSVs } from "../middleware/uploadFiles"
import { body,param } from "express-validator"
import { handleInputErrors, multerErrorHandler } from "../middleware"

const router = Router()

router.post('/validate',
  uploadCSVs,
  handleInputErrors,
  multerErrorHandler,
  BlacklistController.validateBLFiles
)

export default router