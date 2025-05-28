import { Router } from "express";
import { WhitelistController } from "../controllers/WhitelistController"
import { uploadCSVs } from "../middleware/uploadFiles";

const router = Router()

router.get('/last-version-cv',
  WhitelistController.getLastVersionRecordsCV
)
router.get('/cv/:hexId',
  WhitelistController.getSamCvByID
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