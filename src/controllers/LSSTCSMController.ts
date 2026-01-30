import { Response } from 'express'
import { MulterRequest } from '../types'
import { LSSTCSMService } from '../services/LSSTCSMService'


export class LSSTCSMController {
  private static readonly service = new LSSTCSMService()

  static readonly validateFile = async (req: MulterRequest, res: Response) => {

    try {
      if (!req.files) { return res.status(400).json({ success: false, message: 'Archivo requerido', }) }

      const result = await LSSTCSMController.service.validateFiles(req.files)

      if (result) {
        return res.status(200).json(result)
      } else {
        return res.status(400).json(result)
      }
    } catch (error: any) {
      console.error('Error al procesar archivo LSS_TCSM:', error)

      return res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor',
      })
    }
  }

}
