import fs from 'fs'
import csv from 'csv-parser'
import stripBomStream from 'strip-bom-stream'
import type { Request, Response } from 'express'
import WhiteListCV from '../models/WhiteListCV'
import { validateFileName, validateInfoFiles, validateSearchFile } from '../utils/files'
import { getAllRecordsBySelectedVersion, getAllVersions, getHighestVersionRecords, getMaxVersion, processVersionUpdate } from '../utils/versions'
import WhiteList from '../models/WhiteList'
import { searchByHexID } from '../utils/buscador'
import { Op } from 'sequelize'
import { validateChangeInRecord, validateHeaders } from '../utils/validation'
import { MulterRequest, PROVIDER_CODES, REQUIRED_HEADERS, ValidationErrorItem } from '../types'

const validateFiles = (model) => async (req: MulterRequest, res: Response) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No se subieron archivos' })
    }

    const validationResult = await validateInfoFiles(req.files, model, REQUIRED_HEADERS, PROVIDER_CODES)
    const data = await Promise.all(validationResult)

    const results = []
    const hasErrors = data.some(result => result.fileErrors && result.fileErrors.length > 0)

    if (hasErrors) {
      data.forEach(result => {
        if (result.fileErrors.length > 0) {
          results.push({
            fileName: result.fileName,
            fileErrors: result.fileErrors
          })
        }
      })
      const response = {
        success: !hasErrors,
        errorsFiles: results,
      }
      return res.status(400).json(response)
    } else {
      return res.status(200).json(data)
    }
  } catch (error) {
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    })
  }
}
const validateSearchList = (model) => async (req: MulterRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subio archivo' })
    }
    const file = req.file
    const header = ['serial_hex']
    const { errors, validData} = await validateSearchFile(file,model,header)
    const hasErrors = errors.some(result => result )
    const results = []
    if(hasErrors) {
        errors.forEach(result => {
        if (result) {
          results.push({
            fileName: result,
            fileErrors: result
          })
        }
      })
      const response = {
        success: !hasErrors,
        errorsFiles: results,
      }
      return res.status(400).json(response)
    } else {
      return res.status(200).json(validData)
    }
  } catch (error) {
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    })
  }

}
const getSamById = (model: any) => async (req: Request, res: Response) => {
  try {
    const { hexId } = req.params

    if (!hexId) {
      return res.status(400).send({ message: "hexId is required" })
    }
    const keyField = 'SERIAL_HEX'
    const result = await searchByHexID(hexId, model, keyField)

    if (!result) {
      return res.status(404).send({ message: "No se encontro registro" })
    }

    return res.status(200).json({ success: true, data: result })

  } catch (error) {
    console.error("Error in getSamById:", error)
    return res.status(500).send({ message: "Internal server error" })
  }
}
const getSamsById = (model) => async (req: MulterRequest, res: Response) => {
  const recordsFound: any[] = []
  const recordsNotFound: any[] = []
  let headersValid = true
  let lineNumber = 0
  const errorMessages: ValidationErrorItem[] = []
  const pendingPromises: Promise<void>[] = []
  const REQ_HEADER = ['serial_hex']
  try {
    if (!req.file?.path) {
      return res.status(400).send({ error: 'No se proporcionó archivo o la ruta es inválida' })
    }

    validateFileName(req.file.originalname)

    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(stripBomStream())
        .pipe(csv())
        .on('headers', (headers: string[]) => {
          const { missing } = validateHeaders(headers, REQ_HEADER)
          if (missing.length > 0) {
            headersValid = false
            errorMessages.push({
              message: `Faltan columnas: ${missing.join(', ')}`,
            })
          }
        })
        .on('data', (row) => {
          if (headersValid) {
            lineNumber++

            const promise = (async () => {
              const sam = await model.findOne({ where: { SERIAL_HEX: row.serial_hex } })
              if (sam) {
                recordsFound.push(sam)
              } else {
                recordsNotFound.push({ ...row })
              }
            })()

            pendingPromises.push(promise)
          }
        })
        .on('end', async () => {
          try {
            // Esperar todas las promesas pendientes antes de terminar
            await Promise.all(pendingPromises)
            resolve()
          } catch (err) {
            reject(err)
          }
        })
        .on('error', (error) => {
          reject(error)
        })
    })

    if (!headersValid) {
      return res.status(400).send({ errors: errorMessages })
    }
    const result = {
      recordsFound,
      recordsNotFound
    }
    return res.status(200).send({success: true, data: result})

  } catch (error) {
    console.error("Error en getSamsById:", error)
    return res.status(500).send({ error: "Error interno al procesar el archivo" })
  }
}
const getLastVersionRecords = (model) => async (req: Request, res: Response) => {
  const result = await getHighestVersionRecords(model,'VERSION','ESTADO')
  const transformedResult = result.map(record => {
    return Object.fromEntries(
      Object.entries(record).map(([key, value]) => [key.toLowerCase(), value])
    )
  })
  res.status(200).json(transformedResult)
}
const newVersion = (model) => async (req: Request, res: Response) => {
  if (!req.body || req.body.length === 0) {
    return res.status(400).json({ error: 'No se subieron archivos' })
  }
  const { altasValidas, bajasValidas, cambiosValidos } = req.body
  const keyField = 'SERIAL_DEC'

  try {
    const currentVersionRecords = await getHighestVersionRecords(model,'VERSION','ESTADO')
    const currentVersion = await getMaxVersion(model,'VERSION')

    if (currentVersionRecords.length === 0) {
      if (bajasValidas.length > 0 || cambiosValidos.length > 0) {
        console.warn('Primera versión - Ignorando datos de bajas y cambios')
        bajasValidas.length = 0
        cambiosValidos.length = 0
      }
      const newVersion = currentVersion + 1
      res.status(202).json({ message: "Archivos recibidos. Procesando en segundo plano..." })

      process.nextTick(async () => {
        try {
          const result = await model.bulkCreate(
            altasValidas.map(item => ({
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
            model,
            altasValidas,
            bajasValidas,
            cambiosValidos,
            keyField
          )
          if (!result.success) {
            // No se puede enviar respuesta aquí porque ya se envió una.
            console.error("Problema al Generar la nueva version.")
          }
        } catch (error) {
          console.error("Error en procesamiento en segundo plano:", error)
        }
      })
      res.status(200).json({ message: "Procesando nueva version." })
    }
  } catch (error) {
    res.status(500).json({ error: `${error.message}` })
  }
}
const compareVersions = (model, baseOptions: any) => async (req: Request, res: Response) => {
  try {
    const { currentVersion, oldVersion } = req.body
    const [currentData, oldData] = await Promise.all([
      model.findAll({ ...baseOptions, where: { ...baseOptions.where, VERSION: currentVersion } }),
      model.findAll({ ...baseOptions, where: { ...baseOptions.where, VERSION: oldVersion } })
    ])

    if (!currentData || !oldData) {
      return res.status(404).json({ error: "No se encontraron datos para las versiones especificadas" })
    }

    const { cambiosValidos } = validateChangeInRecord(oldData, currentData)
    const idsPrev = new Set(oldData.map(r => r.SERIAL_HEX))
    const idsCurr = new Set(currentData.map(r => r.SERIAL_HEX))
    const bajas = oldData.filter(r => !idsCurr.has(r.SERIAL_HEX))
    const altas = currentData.filter(r => !idsPrev.has(r.SERIAL_HEX))

    const response = {
      currentData: currentData.length,
      oldData: oldData.length,
      cambiosRes: cambiosValidos.length,
      altasRes: altas.length,
      bajasRes: bajas.length,
      cambiosData: cambiosValidos,
      bajasData: bajas,
      altasData: altas
    }
    res.json(response)
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
}
const getResume = (model) => async (req: Request, res: Response) => {
  const versions = await getAllVersions(model)
  const currentVersion = await getMaxVersion(model,'VERSION')
  const currentVersionRecords = await getHighestVersionRecords(model,'VERSION','ESTADO')
  const totalRecords = currentVersionRecords.length
  const previusVersion = currentVersion - 1
  const previusVersionRecords = await getAllRecordsBySelectedVersion(model, previusVersion)
  let altasDataV = 0
  let bajasDataV = 0
  let cambiosDataV = 0

  if (previusVersion < 1) {
    altasDataV = currentVersionRecords.length
  } else {
    const { cambiosValidos } = validateChangeInRecord(currentVersionRecords, previusVersionRecords)
    const idsPrev = new Set(previusVersionRecords.map(r => r.SERIAL_HEX))
    const idsCurr = new Set(currentVersionRecords.map(r => r.SERIAL_HEX))
    const bajas = previusVersionRecords.filter(r => !idsCurr.has(r.SERIAL_HEX))
    const altas = currentVersionRecords.filter(r => !idsPrev.has(r.SERIAL_HEX))
    bajasDataV = bajas.length
    altasDataV = altas.length
    cambiosDataV = cambiosValidos.length
  }

  const response = {
    totalRecords,
    currentVersion,
    versions,
    altasDataV,
    bajasDataV,
    cambiosDataV
  }
  res.json(response)
}
const restoreWhitelistVersion = (model) => async (req: Request, res: Response) => {
  try {
    const { oldVersion } = req.body
    if (!oldVersion) {
      return res.status(400).json({ error: 'El parámetro oldVersion es requerido' })
    }

    const dataVersion = await model.findOne({
      where: { VERSION: oldVersion },
      raw: true
    })

    if (!dataVersion) {
      return res.status(404).json({ error: 'Versión no encontrada' })
    }

    const deletedCount = await model.destroy({
      where: { VERSION: { [Op.gt]: oldVersion } }
    })

    res.json({
      success: true,
      message: `Restauración completada. ${deletedCount} registros eliminados.`
    })
  } catch (error) {
    console.error(`Error en restoreWhitelistVersion:`, error)
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    })
  }
}

export class WhitelistController {
  // Validation files
  static validateWLCVFiles = validateFiles(WhiteListCV)
  static validateWLCLFiles = validateFiles(WhiteList)
  // Validation Search List
  static validateWLCVList = validateSearchList(WhiteListCV)
  static validateWLCLList = validateSearchList(WhiteList)
  // Get by SERIAL_HEX
  static getSamCvByID = getSamById(WhiteListCV)
  static getSamByID = getSamById(WhiteList)
  // Get many by ID from file
  static getSamsCvByID = getSamsById(WhiteListCV)
  static getSamsByID = getSamsById(WhiteList)
  // Get last version records
  static getLastVersionRecordsCV = getLastVersionRecords(WhiteListCV)
  static getLastVersionRecords = getLastVersionRecords(WhiteList)
  // Create new version
  static newVersionCV = newVersion(WhiteListCV)
  static newVersion = newVersion(WhiteList)
  // Compare versions
  static compareCVVersions = compareVersions(WhiteListCV, {
    attributes: { exclude: ['ESTADO', 'VERSION'] },
    raw: true,
    where: { ESTADO: 'ACTIVO' }
  })
  static compareVersions = compareVersions(WhiteList, {
    attributes: { exclude: ['ESTADO', 'VERSION'] },
    raw: true,
    where: { ESTADO: 'ACTIVO' }
  })
  // Get resume
  static getResumeCV = getResume(WhiteListCV)
  static getResume = getResume(WhiteList)

  // Restore version
  static restoreWhitelistCVVersion = restoreWhitelistVersion(WhiteListCV)
  static restoreWhitelistVersion = restoreWhitelistVersion(WhiteList)
}
