import fs from 'fs'
import csv from 'csv-parser'
import type { Request, Response } from 'express'
import { processSingleFile } from '../utils/files'
import SamsSitp from '../models/SamsSitp'
import { Op } from 'sequelize'
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

const PROVIDER_CODES = ['01', '02', '03', '04', '05', '06', '07', '15', '32', '3C', '46', '5A', '64']

export class SamsController {
  static getAllRecords = async (req: Request, res: Response) => {
    const tableExists = await SamsSitp.sequelize.getQueryInterface().tableExists(SamsSitp.tableName)

    if (!tableExists) {
      await SamsSitp.sync()
      return []
    }
    const records = await SamsSitp.findAll({
      raw: true
    })
    return res.status(200).json(records)
  }
  static createSamsRecordController = async (req: MulterRequest, res: Response) => {

    if (!req.file) {
      return res.status(400).json({ error: 'No se subieron archivos' })
    }
    const file = req.file
    try {

      const fileData = await processSingleFile(file, REQUIRED_HEADERS, PROVIDER_CODES)

      const tableExists = await SamsSitp.sequelize.getQueryInterface().tableExists(SamsSitp.tableName)

      if (!tableExists) {
        await SamsSitp.sync()
        return []
      }

      const result = await SamsSitp.bulkCreate(
        fileData.validData.map(sam => ({
          ...sam,
        }))
      )
      return res.status(200).json(result)
    } catch (error) {
      res.status(500).json({ error: `${error}` })
    }
  }
  static getSamsByFile = async (req: MulterRequest, res: Response) => {
    const resultados: any[] = []

    try {
      // Validar que el archivo existe
      if (!req.file || !req.file.path) {
        throw new Error('No se proporcionó archivo o la ruta es inválida')
      }

      const batchSize = 100
      let currentBatch = []

      const processBatch = async (batch) => {
        const serials = batch.map(row => row.serial_hex)

        const foundRecords = await SamsSitp.findAll({
          where: { sam_id_hex: { [Op.in]: serials } },
          raw: true
        })

        const recordsMap = new Map()
        foundRecords.forEach(record => {
          recordsMap.set(record.sam_id_hex, record)
        })
        // Combinar datos del CSV con los registros encontrados
        batch.forEach(row => {
          const matchedRecord = recordsMap.get(row.serial_hex)
          if (matchedRecord) {
            resultados.push({
              ...matchedRecord,      // Todos los campos del registro encontrado
            })
          }
        })
      }
      // Procesar el CSV
      await new Promise((resolve, reject) => {
        fs.createReadStream(req.file.path)
          .pipe(stripBomStream())
          .pipe(csv())
          .on('data', async (row) => {
            currentBatch.push(row)
            if (currentBatch.length >= batchSize) {
              await processBatch(currentBatch)
              currentBatch = []
            }

          })
          .on('end', async () => {
            if (currentBatch.length > 0) {
              const resultados = await processBatch(currentBatch)
              resolve(resultados)
            }
          })
          .on('error', (error) => {
            reject(error)
          })
      })

      res.json(resultados)
    } catch (error) {
      console.error('Error en el procesamiento:', error)
      res.status(500).json({
        success: false,
        error: error.message
      })
    } finally {
      // Limpiar: eliminar el archivo temporal si es necesario
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error al eliminar archivo temporal:', err)
        })
      }
    }

  }
}
