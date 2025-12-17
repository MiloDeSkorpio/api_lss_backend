import { Router } from 'express';
import { VersionHistoryController } from '../controllers/VersionHistoryController';
import { VersionHistoryService } from '../services/VersionHistoryService';
import { validateDto } from '../middleware/validateDto';
import { LogVersionHistoryDto } from '../dtos/LogVersionHistoryDto';
import { authMiddleware } from '../middleware/auth'; // Assuming version history operations might need authentication

const router = Router();

const versionHistoryService = new VersionHistoryService();
const versionHistoryController = new VersionHistoryController(versionHistoryService);

// Route to log a new version history entry
router.post('/', authMiddleware, validateDto(LogVersionHistoryDto), versionHistoryController.createVersionLog);

// Route to get all version history entries for a specific list name
router.get('/list/:listName', authMiddleware, versionHistoryController.getVersionsByListName);

// Route to get the latest version history entry for a specific list name
router.get('/latest/:listName', authMiddleware, versionHistoryController.getLatestVersionByListName);

// Route to get a specific version history entry by ID
router.get('/:id', authMiddleware, versionHistoryController.getVersionById);

export default router;
