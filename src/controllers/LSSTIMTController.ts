import { Response, Request } from 'express'
import { LSSTIMTService } from "../services/LSSTIMTService";
import { MulterRequest } from "../types";
import { AuthRequest } from '../types/AuthRequest';


export class LSSTIMTController {
  private static readonly service = new LSSTIMTService()

  static readonly createNewLssTIMT = async (req: AuthRequest, res: Response) => {
    const { altasValidas, bajasValidas, cambiosValidos, newVersion } = req.body
    const { user } = req
    try {
      const result = await LSSTIMTController.service.createNewVersion(altasValidas, bajasValidas, cambiosValidos, user.id, newVersion)
      return res.status(200).json(result)
    } catch (error: any) {
      if (error.message === 'No hay información para una nueva versión.') {
        return res.status(400).json({ error: error.message })
      } 
      console.error('Error al crear nueva versión LSS_TIMT:', error)
      return res.status(500).json({ error: error.message || 'Error interno del servidor' })
    }
  }

  static readonly validateFile = async (req: MulterRequest, res: Response) => {

    try {
      if (!req.files) { return res.status(400).json({ success: false, message: 'Archivo requerido', }) }
      const result = await LSSTIMTController.service.validateFiles(req.files)
      if (result.success) {
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

  static readonly getSummary = async (_req: Request, res: Response) => {
    try {
      const result = await LSSTIMTController.service.getSummaryLastVersión()
      if (result.success) {
        return res.status(200).json(result)
      } else {
        return res.status(400).json(result)
      }
    } catch (error) {
      console.log('Error al obtener resumen:', error)
      return res.status(500).json({ success: false, message: error.message })
    }
  }
  static readonly getSamBySerial = async (req: Request, res: Response) => {
    const { hexId } = req.params
    try {
      const result = await LSSTIMTController.service.getBySerialHex(hexId)
      if (result) {
        return res.status(200).json(result)
      }
      return res.status(404).json({ message: 'Registro no encontrado' })
    } catch (error) {
      console.log('Error al obtener registro por serial hex:', error)
      return res.status(500).json({ success: false, message: error.message })
    }
  }
  static readonly getLssTimtByFile = async (req: MulterRequest, res: Response) => {
    try {
      const result = await LSSTIMTController.service.getSAMTimtByHex(req.file)
      if (result) {
        return res.status(200).json(result)
      } else {
        return res.status(400).json(result)
      }
    } catch (error) {
      console.log('Error al Buscar LSS_TIMT', error)
      return res.status(500).json({ success: false, message: error.message })
    }
  }
}