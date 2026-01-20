import fs from 'node:fs'
import csv from 'csv-parser'
import { Op } from 'sequelize'
import stripBomStream from 'strip-bom-stream'
import { processSingleFile } from '../utils/files'
import { headers_sams, OperationType } from '../types'
import { SamsRepository } from '../repositories/SamsRepository'
import { CustomSamValidationDto } from '../dtos/CustomSamValidationDto'
import { sanitizeBigInt } from '../utils/sanitizeBigInt'
import { categorizeByOperator } from '../utils/validation'
import { versionHistoryRepository } from '../repositories/VersionHistoryRepository'
import connexion from '../config/db'

export class SamsService {
  private readonly samsRepository: SamsRepository

  constructor() {
    this.samsRepository = new SamsRepository()
  }

  public async validateSamsFile(file: Express.Multer.File) {
    if (!file) {
      throw new Error('No se proporcionó ningún archivo para validar.')
    }
    const { errors: formatErrors, validData } = await processSingleFile(file, headers_sams)
    const currentVersion = await this.samsRepository.getLastVersión()
    const currentVersionRecords = await this.samsRepository.getLastVersionRecords()
    const newVersion = currentVersion + 1
    const altasValidas = sanitizeBigInt(validData)
    const hexSerialsToCheck = validData.map(dto => dto.serial_number_hexadecimal)
    const existingSams = await this.samsRepository.findExistingSerialsByHex(hexSerialsToCheck)
    const existingHexSet = new Set(
      existingSams.map(s => s.serial_number_hexadecimal)
    )
    const altasFinales = altasValidas.filter(
      dto => !existingHexSet.has(dto.serial_number_hexadecimal)
    )
    const altasDuplicadas = altasValidas.filter(
      dto => existingHexSet.has(dto.serial_number_hexadecimal)
    )
    const validByOp = categorizeByOperator(altasFinales)
    const oldByOp = categorizeByOperator(currentVersionRecords)
    const dupByOp = categorizeByOperator(altasDuplicadas)

    if (formatErrors.length > 0) {
      return {
        success: false,
        errorsFiles: [{
          fileName: file.originalname,
          fileErrors: formatErrors
        }]
      }
    }

    if (validData.length === 0) {
      return {
        success: false,
        message: 'El archivo está vacío o no contiene filas válidas.',
      }
    }

    return {
      success: true,
      currentVersion,
      newVersion,
      currentVersionCount: currentVersionRecords.length,
      newVersionRecordsCount: altasFinales.length,
      ignoredRows: existingSams.length,
      altasValidas: altasFinales,
      altasDuplicadas,
      validByOp,
      oldByOp,
      dupByOp
    }
  }
  public async createNewVersion(records, userId, version) {
    if (!records) {
      throw new Error('No hay información para una nueva versión.')
    }
    return await connexion.transaction(async (t) => {

      const recordsWithVersion = records.map(r => ({
        ...r,
        version
      }))

      await this.samsRepository.bulkCreate(recordsWithVersion)

      await versionHistoryRepository.create(
        {
          listName: 'SAMS',
          version,
          operationType: 'CREATION' as OperationType,
          userId
        },
        { transaction: t }
      )
      return { success: true }
    })
  }
  public async getSummaryLastVersión() {
    const records = await this.samsRepository.getLastVersionRecords()
    const totalRecords = records.length
    const categorized = categorizeByOperator(records)
    const recordsByOrg = Object.entries(categorized).map(
      ([label, records]) => ({
        label,
        value: records.length,
      })
    )
    const version = await this.samsRepository.getLastVersión()
    return {
      success: true,
      version,
      totalRecords,
      recordsByOrg,
      records
    }
  }
  public async getSamBySerial(hexId: string) {
    return await this.samsRepository.getBySerialHex(hexId)
  }
  public async getSamsByHex(file: Express.Multer.File) {
    const resultados: any[] = []

    try {

      if (!file) {
        throw new Error('No se proporcionó archivo o la ruta es inválida')
      }

      const batchSize = 100
      let currentBatch = []

      const processBatch = async (batch) => {
        const serials = batch.map(row => `$${row.serial_hex}`)
        const foundRecords = await this.samsRepository.getSamsBySerialHex(serials)

        foundRecords.forEach(record => {
           resultados.push({
              ...record, 
            })
        })
      }
      // Procesar el CSV
      await new Promise((resolve, reject) => {
        fs.createReadStream(file.path)
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

      return resultados
    } catch (error) {
      console.error('Error en el procesamiento:', error)
      return {
        success: false,
        error: error.message
      }
    } finally {
      if (file && file.path) {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error al eliminar archivo temporal:', err)
        })
      }
    }

  }
}

