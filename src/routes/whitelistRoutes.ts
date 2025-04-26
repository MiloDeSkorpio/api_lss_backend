import { Router } from "express";
import { WhitelistController } from "../controllers/WhitelistController"
import { uploadCSVs } from "../middleware/uploadFiles";

const router = Router()

// router.get('/last-version',
//   WhitelistController.getLastVersion
// )
router.post('/new-version',
  uploadCSVs,
  WhitelistController.newVersionCV
)

export default router