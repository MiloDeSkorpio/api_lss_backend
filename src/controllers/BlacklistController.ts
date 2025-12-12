import { Response, Request } from 'express';
import { BlacklistService } from '../services/BlacklistService';

/**
 * Controller for handling Blacklist-related HTTP requests.
 * Follows a dependency-injected, service-oriented architecture.
 */
export class BlacklistController {
  constructor(private readonly service: BlacklistService) {}

  /**
   * Handles the HTTP request to get the last version records.
   */
  getLastVersionRecords = async (req: Request, res: Response) => {
    try {
      const result = await this.service.getLastVersionRecords();
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ message: 'Error fetching last version records', error: error.message });
    }
  };

  /**
   * Handles the HTTP request to find a card by its hex ID.
   */
  getCardById = async (req: Request, res: Response) => {
    try {
      const hexId = req.query.hexId as string;
      const result = await this.service.findCardByHexId(hexId);

      if (!result) {
        return res.status(404).json({ success: false, message: 'Tarjeta no encontrada' });
      }

      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      if (error.message.includes('requerido')) {
        return res.status(400).json({ success: false, message: error.message });
      }
      return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  };

  /**
   * Handles the HTTP request to find cards from an uploaded CSV file.
   */
  getCardsByID = async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No se proporcionó ningún archivo.' });
      }
      const result = await this.service.findCardsFromFile(req.file);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  };

  /**
   * Handles the HTTP request to validate files for a new version.
   */
  validateFiles = async (req: Request, res: Response) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'No se proporcionaron archivos para validar.' });
      }
      
      const result = await this.service.validateFilesForNewVersion(req.files as Express.Multer.File[]);

      if (!result.success) {
        return res.status(400).json({ success: false, errorsFiles: result.fileErrors });
      }

      return res.status(200).json(result);

    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Error interno del servidor durante la validación.', error: error.message });
    }
  };
}
