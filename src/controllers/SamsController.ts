import type { Request, Response } from 'express'
import {  processSingleFile } from '../utils/files'
import SamsSitp from '../models/SamsSitp'

// Interfaces
interface MulterRequest extends Request {
  files: Express.Multer.File[]
}

const REQUIRED_HEADERS = ['sam_id_hex', 'sam_id_dec', 'sam_tipo', 'sam_config', 'llaves_tipo',
  'version_parametros', 'lock_index', 'fecha_produccion',
  'hora_produccion', 'atr', 'samsp_id_hex', 'samsp_version_parametros',
  'sam_fabricante', 'sam_archivo_produccion', 'receptor_operador_linea',
  'recibido_por', 'documento_soporte1', 'documento_soporte2',
  'observaciones', 'provider_code']

const PROVIDER_CODES = ['01', '02', '03', '04', '05', '06', '07', '15', '32', '3C', '46', '5A', '64']

export class SamsController {

  static createSamsRecordController = async (req: MulterRequest, res: Response) => {

    if (!req.file) {
      return res.status(400).json({ error: 'No se subieron archivos' })
    }
    const file = req.file
    try {
  
      const fileData = await processSingleFile(file,REQUIRED_HEADERS,PROVIDER_CODES)

      const tableExists = await SamsSitp.sequelize.getQueryInterface().tableExists(SamsSitp.tableName)
      
      if (!tableExists) {
        await SamsSitp.sync()
        return []
      }
        
      const result = await SamsSitp.bulkCreate(
        fileData.map(sam => ({
          ...sam,
        }))
      )
      return res.status(200).json(result)
    } catch (error) {
      res.status(500).json({ error: `${error}` })
    }
  }
}
