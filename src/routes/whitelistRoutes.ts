import { Router } from "express";
import { WhitelistController } from "../controllers/WhitelistController"
import { uploadCSV, uploadCSVs } from "../middleware/uploadFiles";
import { param } from "express-validator";


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

export default router