import { Router } from "express"
import { BlacklistController } from "../controllers/BlacklistController"
import { uploadCSV,uploadCSVs } from "../middleware/uploadFiles"
import { handleInputErrors, multerErrorHandler } from "../middleware"
import { body } from "express-validator"

const router = Router()

router.post('/validate',
  uploadCSVs,
  handleInputErrors,
  multerErrorHandler,
  BlacklistController.validateBLFiles
)
router.post('/new-version',
  handleInputErrors,
  BlacklistController.newVersion
)
router.get('/last-version',
  BlacklistController.getLastVersionRecords
)
router.get('/resume-last-ver',
  BlacklistController.getResumeLastVersion
)
router.get('/find-card',
  BlacklistController.getCardById
)
router.post('/cards-bl',
  uploadCSV,
  multerErrorHandler,
  BlacklistController.getCardsByID
)
router.get('/resume',
  BlacklistController.getResume
)
router.post('/compare-bl-versions',
  body('currentVersion').notEmpty().withMessage('Es necesaria la Version'),
  body('oldVersion').notEmpty().withMessage('Es necesaria la Version'),
  handleInputErrors,
  BlacklistController.compareVersions
)
router.post('/restore-version-bl',
  body('oldVersion').notEmpty().withMessage('Es necesaria la Version'),
  handleInputErrors,
  BlacklistController.restoreBlacklistVersion
)
export default router