import fs from 'fs'
import csv from 'csv-parser'
import stripBomStream from 'strip-bom-stream'
import type { Request, Response } from 'express'
import WhiteListCV from '../models/WhiteListCV'
import { categorizeAllFiles, processFileGroup } from '../utils/files'
import { getHighestVersionRecords, getMaxVersion, processVersionUpdate } from '../utils/versions'
import WhiteList from '../models/WhiteList'
import { searchByHexID } from '../utils/buscador'
import { Op } from 'sequelize'

const REQUIRED_HEADERS = ['SERIAL_DEC', 'SERIAL_HEX', 'CONFIG', 'OPERATOR', 'LOCATION_ID', 'ESTACION']
const PROVIDER_CODES = ['01', '02', '03', '04', '05', '06', '07', '15', '32', '3C', '46', '5A', '64']

// Interfaces
interface MulterRequest extends Request {
  files: Express.Multer.File[]
}

export class WhitelistController {

  static getSamCvByID = async (req: Request, res: Response) => {
    const { hexId } = req.params
    const result = await searchByHexID(hexId, WhiteListCV)

    return res.status(200).send(result)
  }
  static getSamsCvByID = async (req: MulterRequest, res: Response) => {
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

        const foundRecords = await WhiteListCV.findAll({
          where: { SERIAL_HEX: { [Op.in]: serials } },
          raw: true
        })

        const recordsMap = new Map()
        foundRecords.forEach(record => {
          recordsMap.set(record.SERIAL_HEX, record)
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
  static getLastVersionRecordsCV = async (req: Request, res: Response) => {
    const result = await getHighestVersionRecords(WhiteListCV)

    const transformedResult = result.map(record => {
      return Object.fromEntries(
        Object.entries(record).map(([key, value]) => [key.toLowerCase(), value])
      )
    })

    res.status(200).json(transformedResult)
  }
  static getLastVersionRecords = async (req: Request, res: Response) => {
    const result = await getHighestVersionRecords(WhiteList)
    // console.log(result)
    const transformedResult = result.map(record => {
      return Object.fromEntries(
        Object.entries(record).map(([key, value]) => [key.toLowerCase(), value])
      )
    })

    res.status(200).json(transformedResult)
  }

  static newVersionCV = async (req: MulterRequest, res: Response) => {

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No se subieron archivos' })
    }

    const files = req.files
    const categorizeFiles = categorizeAllFiles(files)
    const keyField = 'SERIAL_DEC'
    try {
      const currentVersionRecords = await getHighestVersionRecords(WhiteListCV)
      const currentVersion = await getMaxVersion(WhiteListCV)
      let [altasData, bajasData, cambiosData] = await Promise.all([
        processFileGroup(categorizeFiles.altasFiles, REQUIRED_HEADERS, PROVIDER_CODES),
        processFileGroup(categorizeFiles.bajasFiles, REQUIRED_HEADERS, PROVIDER_CODES),
        processFileGroup(categorizeFiles.cambiosFiles, REQUIRED_HEADERS, PROVIDER_CODES)
      ])

      if (currentVersionRecords.length < 0) {
        if (bajasData.length > 0 || cambiosData.length > 0) {
          console.warn('Primera versión - Ignorando datos de bajas y cambios')
          bajasData.length = 0
          cambiosData.length = 0
        }
        const newVersion = currentVersion + 1

        res.status(202).json({ message: "Archivos recibidos. Procesando en segundo plano..." })

        process.nextTick(async () => {
          try {
            const result = await WhiteListCV.bulkCreate(
              altasData.map(item => ({
                ...item,
                VERSION: newVersion
              }))
            )
            console.log(` Inserción exitosa: ${result.length} registros añadidos.`)
          } catch (error) {
            console.error(" Error en inserción en segundo plano:", error.message)
          }
        })
      } else {

        process.nextTick(async () => {
          try {
            const result = await processVersionUpdate(
              currentVersionRecords,
              WhiteListCV,
              altasData,
              bajasData,
              cambiosData,
              keyField
            )

            if (!result.success) {
              return res.status(500).json({ error: "Problema al Generar la nueva version." })
            }

            return res.status(200).json(result)

          } catch (error) {
            console.error("Error en procesamiento en segundo plano:", error.message)
          }
        })
      }

    } catch (error) {

      res.status(500).json({ error: `${error.message}` })
    }
  }
  static newVersion = async (req: MulterRequest, res: Response) => {

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No se subieron archivos' })
    }

    const files = req.files
    const categorizeFiles = categorizeAllFiles(files)
    const keyField = 'SERIAL_DEC'
    try {
      const currentVersionRecords = await getHighestVersionRecords(WhiteListCV)
      const currentVersion = await getMaxVersion(WhiteListCV)
      let [altasData, bajasData, cambiosData] = await Promise.all([
        processFileGroup(categorizeFiles.altasFiles, REQUIRED_HEADERS, PROVIDER_CODES),
        processFileGroup(categorizeFiles.bajasFiles, REQUIRED_HEADERS, PROVIDER_CODES),
        processFileGroup(categorizeFiles.cambiosFiles, REQUIRED_HEADERS, PROVIDER_CODES)
      ])

      if (currentVersionRecords.length < 0) {
        if (bajasData.length > 0 || cambiosData.length > 0) {
          console.warn('Primera versión - Ignorando datos de bajas y cambios')
          bajasData.length = 0
          cambiosData.length = 0
        }
        const newVersion = currentVersion + 1

        res.status(202).json({ message: "Archivos recibidos. Procesando en segundo plano..." })

        process.nextTick(async () => {
          try {
            const result = await WhiteListCV.bulkCreate(
              altasData.map(item => ({
                ...item,
                VERSION: newVersion
              }))
            )
            console.log(` Inserción exitosa: ${result.length} registros añadidos.`)
          } catch (error) {
            console.error(" Error en inserción en segundo plano:", error.message)
          }
        })
      } else {

        process.nextTick(async () => {
          try {
            const result = await processVersionUpdate(
              currentVersionRecords,
              WhiteListCV,
              altasData,
              bajasData,
              cambiosData,
              keyField
            )

            if (!result.success) {
              return res.status(500).json({ error: "Problema al Generar la nueva version." })
            }

            return res.status(200).json(result)

          } catch (error) {
            console.error("Error en procesamiento en segundo plano:", error.message)
          }
        })
      }

    } catch (error) {

      res.status(500).json({ error: `${error.message}` })
    }
  }
}
