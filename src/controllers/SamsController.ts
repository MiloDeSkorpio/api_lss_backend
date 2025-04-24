import type { Request, Response } from 'express'
import fs from 'fs'
import csv from 'csv-parser'
import stripBomStream from 'strip-bom-stream'


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

export class SamsController {

  static newVersionInventory = async (req: MulterRequest, res: Response) => {

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No se subieron archivos' })
    }
    console.log(req)

  }
}
