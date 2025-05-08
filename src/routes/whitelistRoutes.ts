import { Router } from "express";
import { WhitelistController } from "../controllers/WhitelistController"
import { uploadCSVs } from "../middleware/uploadFiles";

const router = Router()

router.get('/last-version-cv',
  WhitelistController.getLastVersionRecords
)
router.post('/new-version-cv',
  uploadCSVs,
  WhitelistController.newVersionCV
)

export default router