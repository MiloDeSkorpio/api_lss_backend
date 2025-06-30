import { Router } from "express";
import { WhitelistController } from "../controllers/WhitelistController"
import { uploadCSV, uploadCSVs } from "../middleware/uploadFiles";
import { body, param } from "express-validator";
import { handleInputErrors } from "../middleware";


const router = Router()

router.get('/last-version-cv',
  WhitelistController.getLastVersionRecordsCV
)
router.get('/cv/:hexId',
  param('hexId').notEmpty().withMessage('Hex ID No Valido'),
  handleInputErrors,
  WhitelistController.getSamCvByID
)
router.post('/sams-cv',
  uploadCSV,
  WhitelistController.getSamsCvByID
)
router.get('/last-version',
  WhitelistController.getLastVersionRecords
)
router.post('/new-version-cv',
  uploadCSVs,
  WhitelistController.newVersionCV
)
router.post('/new-version',
  uploadCSVs,
  WhitelistController.newVersion
)

router.post('/compare-cv-versions',
  body('currentVersion').notEmpty().withMessage('Es necesaria la Version'),
  body('oldVersion').notEmpty().withMessage('Es necesaria la Version'),
  handleInputErrors,
  WhitelistController.compareCVVersions
)
router.get('/resume-cv',
  WhitelistController.getResumeCV
)

router.post('/restore-version-cv',
  body('oldVersion').notEmpty().withMessage('Es necesaria la Version'),
  handleInputErrors,
  WhitelistController.restoreWhitelistCVVersion
)


export default router