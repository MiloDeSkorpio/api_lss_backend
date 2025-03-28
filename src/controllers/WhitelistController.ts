import type { Request, Response } from 'express'
import { categorizeFilesWL } from '../helpers/orderFilesByEvent'
import { processFileGroup } from '../middleware/validationWL'

// Interfaces
interface MulterRequest extends Request {
  files: Express.Multer.File[]
}

export class WhitelistController {

  static newVersionCV = async (req: MulterRequest, res: Response) => {

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No se subieron archivos' })
    }

    const files = req.files
    const categorizeFiles = categorizeFilesWL(files)
    
    try {

      const [altasData, bajasData, cambiosData] = await Promise.all([
        processFileGroup(categorizeFiles.altasFiles),
        processFileGroup(categorizeFiles.bajasFiles),
        processFileGroup(categorizeFiles.cambiosFiles)
      ])

      res.json({
        altas: altasData,
        bajas: bajasData,
        cambios: cambiosData,
        counts: {
          altas: altasData.length,
          bajas: bajasData.length,
          cambios: cambiosData.length
        }
      })

    } catch (error) {

      res.status(500).json({ error: `${error.message}` })
    }
  }
}
