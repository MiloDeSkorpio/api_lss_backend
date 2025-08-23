import { Router } from "express";
import { WhitelistController } from "../controllers/WhitelistController"
import { uploadCSV, uploadCSVs } from "../middleware/uploadFiles";
import { body, param } from "express-validator";
import { handleInputErrors, multerErrorHandler } from "../middleware";


const router = Router()

router.post('/validate-cv',
  uploadCSVs,
  handleInputErrors,
  multerErrorHandler,
  WhitelistController.validateWLCVFiles
)
router.post('/validate',
  uploadCSVs,
  handleInputErrors,
  multerErrorHandler,
  WhitelistController.validateWLCLFiles
)

router.get('/last-version-cv',
  WhitelistController.getLastVersionRecordsCV
)
router.get('/cv/:hexId',
  param('hexId').notEmpty().withMessage('Hex ID No Valido'),
  handleInputErrors,
  WhitelistController.getSamCvByID
)
router.get('/first/:hexId',
  param('hexId').notEmpty().withMessage('Hex ID No Valido'),
  handleInputErrors,
  WhitelistController.getSamByID
)
router.post('/sams-cv',
  uploadCSV,
  WhitelistController.getSamsCvByID
)
router.post('/sams-wl',
  uploadCSV,
  WhitelistController.getSamsByID
)
router.get('/last-version',
  WhitelistController.getLastVersionRecords
)
router.post('/new-version-cv',
  uploadCSVs,
  handleInputErrors,
  WhitelistController.newVersionCV
)
router.post('/new-version',
  uploadCSVs,
  handleInputErrors,
  WhitelistController.newVersion
)

router.post('/compare-cv-versions',
  body('currentVersion').notEmpty().withMessage('Es necesaria la Version'),
  body('oldVersion').notEmpty().withMessage('Es necesaria la Version'),
  handleInputErrors,
  WhitelistController.compareCVVersions
)
router.post('/compare-versions',
  body('currentVersion').notEmpty().withMessage('Es necesaria la Version'),
  body('oldVersion').notEmpty().withMessage('Es necesaria la Version'),
  handleInputErrors,
  WhitelistController.compareVersions
)
router.get('/resume-cv',
  WhitelistController.getResumeCV
)
router.get('/resume',
  WhitelistController.getResume
)

router.post('/restore-version-cv',
  body('oldVersion').notEmpty().withMessage('Es necesaria la Version'),
  handleInputErrors,
  WhitelistController.restoreWhitelistCVVersion
)
router.post('/restore-version',
  body('oldVersion').notEmpty().withMessage('Es necesaria la Version'),
  handleInputErrors,
  WhitelistController.restoreWhitelistVersion
)

export default router