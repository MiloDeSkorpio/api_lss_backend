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

router.get('/all-versions-cv',
  WhitelistController.getAllVersionsCV
)
router.post('/all-version-records-cv',
  body('version').notEmpty().withMessage('Es necesaria la Version'),
  WhitelistController.getAllVersionRecordsCV
)
export default router