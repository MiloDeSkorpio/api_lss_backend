import { Response } from 'express'
import { LSSTIMTService } from "../services/LSSTIMTService";
import { MulterRequest } from "../types";


export class LSSTIMTController { 
  private static readonly service = new LSSTIMTService()

  static readonly validateFile = async (req: MulterRequest, res: Response) => {

    try {
      if (!req.files) { return res.status(400).json({ success: false, message: 'Archivo requerido', }) }
      const result = await LSSTIMTController.service.validateFiles(req.files)

      if (result) {
        return res.status(200).json(result)
      } else {
        return res.status(400).json(result)
      }
    } catch (error: any) {
      console.error('Error al procesar archivo LSS_TIMT:', error)
      return res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor',
      })
    }
  }
}