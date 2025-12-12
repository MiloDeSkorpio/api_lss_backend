import { Router } from "express";
import { body } from "express-validator";
import { handleInputErrors, multerErrorHandler } from "../middleware";
import { uploadCSV, uploadCSVs } from "../middleware/uploadFiles";

// Nuevas importaciones para DI y el controlador refactorizado
import { BlacklistController } from "../controllers/BlacklistController";
import { BlacklistRepository } from "../repositories/BlacklistRepository";
import { BlacklistService } from "../services/BlacklistService";
import { StolenCardsRepository } from "../repositories/StolenCardsRepository";

// Importación temporal de la implementación antigua


const router = Router();

// --- Configuración de Inyección de Dependencias ---
const blacklistRepository = new BlacklistRepository();
const stolenCardsRepository = new StolenCardsRepository();
const service = new BlacklistService(blacklistRepository, stolenCardsRepository);
const controller = new BlacklistController(service);

// --- Rutas ---

// Rutas refactorizadas: usan la nueva arquitectura
router.get('/last-version', controller.getLastVersionRecords);
router.get('/find-card', controller.getCardById);
router.post('/cards-bl',
  uploadCSV,
  multerErrorHandler,
  controller.getCardsByID
);
router.post('/validate',
  uploadCSVs,
  handleInputErrors,
  multerErrorHandler,
  controller.validateFiles
);

// // Rutas antiguas: siguen usando los métodos estáticos del controlador antiguo
// router.post('/new-version',
//   handleInputErrors,
//   multerErrorHandler,
//   BlacklistController.validateBLFiles
// );
// router.post('/new-version',
//   handleInputErrors,
//   BlacklistController.newVersion
// );
// router.get('/resume-last-ver',
//   BlacklistController.getResumeLastVersion
// );
// router.get('/find-card',
//   BlacklistController.getCardById
// );
// router.post('/cards-bl',
//   uploadCSV,
//   multerErrorHandler,
//   BlacklistController.getCardsByID
// );
// router.get('/resume',
//   BlacklistController.getResume
// );
// router.post('/compare-bl-versions',
//   body('currentVersion').notEmpty().withMessage('Es necesaria la Version'),
//   body('oldVersion').notEmpty().withMessage('Es necesaria la Version'),
//   handleInputErrors,
//   BlacklistController.compareVersions
// );
// router.post('/restore-version-bl',
//   body('oldVersion').notEmpty().withMessage('Es necesaria la Version'),
//   handleInputErrors,
//   BlacklistController.restoreBlacklistVersion
// );

export default router;