import { Router } from "express";
import { WhitelistController } from "../controllers/WhitelistController"
import { uploadCSV } from "../middleware/uploadFiles";

const router = Router()

// router.get('/last-version',
//   WhitelistController.getLastVersion
// )
router.post('/new-version',
  uploadCSV,
  WhitelistController.newVersionCV
)

export default router