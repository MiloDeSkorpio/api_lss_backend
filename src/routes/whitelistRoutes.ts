import { Router } from "express";
import { WhitelistController } from "../controllers/WhitelistController"
import { uploadCSV, uploadCSVs } from "../middleware/uploadFiles";
import { body, param } from "express-validator";


const router = Router()

router.get('/last-version-cv',
  WhitelistController.getLastVersionRecordsCV
)
router.get('/cv/:hexId',
  param('hexId').notEmpty().withMessage('Hex ID No Valido'),
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

// router.post('/all-version-records-cv',
//   body('version').notEmpty().withMessage('Es necesaria la Version'),
//   WhitelistController.getAllVersionRecordsCV
// )
router.get('/resume-cv',
  WhitelistController.getResumeCV
)
export default router