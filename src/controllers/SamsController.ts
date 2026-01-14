import fs from 'node:fs'
import csv from 'csv-parser'
import type { Request, Response } from 'express'
import SamsSitp from '../models/SamsSitp'
import { Op } from 'sequelize'
import stripBomStream from 'strip-bom-stream'
import { MulterRequest } from '../types'
import { SamsService } from '../services/SamsService'
import { AuthRequest } from '../types/AuthRequest'


export class SamsController {
  private static readonly samsService = new SamsService()

  static readonly createSamsRecordController = async (req: AuthRequest, res: Response) => {
      const { altasValidas,newVersion } = req.body
      const { user } = req
      try {
      const result = await SamsController.samsService.createNewVersion(altasValidas, user.id, newVersion)
      return res.status(200).json(result)
    } catch (error: any) {
      if (error.message === 'No se subieron archivos') {
        return res.status(400).json({ error: error.message })
      }
      console.error('Error al crear registro SAMS:', error)
      return res.status(500).json({ error: error.message || 'Error interno del servidor' })
    }
  }

  static readonly validateSamsRecordController = async (req: MulterRequest, res: Response) => {
    try {
      const result = await SamsController.samsService.validateSamsFile(req.file)
      if (result.success) {
        return res.status(200).json(result)
      } else {
        return res.status(400).json(result) 
      }
    } catch (error: any) {
      console.error('Error al validar archivo SAMS:', error)
      return res.status(500).json({ success: false, message: error.message || 'Error interno del servidor' })
    }
  }

  static readonly getSummary = async(req: Request, res: Response) => {
    try {
      const result = await SamsController.samsService.getSummaryLastVersión()
      if(result.success){
        return res.status(200).json(result)
      } else {
        return res.status(400).json(result)
      }
    } catch (error) {
      console.log('Error al obtener resumen:', error)
      return res.status(500).json({success: false, message: error.message})
    }
  }

  static readonly getSamBySerial = async (req: Request, res: Response) => {
    const { hexId } = req.params
    const result =  await SamsController.samsService.getSamBySerial(hexId)
    if (result) {
      return  res.status(200).json(result)
    } else {
      return res.status(404).json({ success: false, message: 'No se encontró el SAM con el número de serie proporcionado.' })
    }
  }
  //before refactor module
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

  static getSamsByFile = async (req: MulterRequest, res: Response) => {
    const resultados: any[] = []

    try {
      // Validar que el archivo existe
      if (!req.file?.path) {
        throw new Error('No se proporcionó archivo o la ruta es inválida')
      }

      const batchSize = 100
      let currentBatch = []

      const processBatch = async (batch) => {
        const serials = batch.map(row => `$${row.serial_hex}`)
        const foundRecords = await SamsSitp.findAll({
          where: { serial_number_hexadecimal: { [Op.in]: serials } },
          raw: true
        })

        const recordsMap = new Map()
        foundRecords.forEach(record => {
          recordsMap.set(record.serial_number_hexadecimal, record)
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
      console.log(resultados)
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
      console.log(resultados)
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
