import fs from 'fs'
import csv from 'csv-parser'
import stripBomStream from 'strip-bom-stream'
import type { Request, Response } from 'express'
import WhiteListCV from '../models/WhiteListCV'
import { validateFileName, validateInfoFiles, ValidationErrorItem } from '../utils/files'
import { getAllRecordsBySelectedVersion, getAllVersions, getHighestVersionRecords, getMaxVersion, processVersionUpdate } from '../utils/versions'
import WhiteList from '../models/WhiteList'
import { searchByHexID } from '../utils/buscador'
import { Op } from 'sequelize'
import { validateChangeInRecord, validateHeaders } from '../utils/validation'

const REQUIRED_HEADERS = ['SERIAL_DEC', 'SERIAL_HEX', 'CONFIG', 'OPERATOR', 'LOCATION_ID', 'ESTACION']
const PROVIDER_CODES = ['01', '02', '03', '04', '05', '06', '07', '15', '32', '3C', '46', '5A', '64']

// Interfaces
interface MulterRequest extends Request {
  files: Express.Multer.File[]
}

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

const getSamById = (model: any) => async (req: Request, res: Response) => {
  try {
    const { hexId } = req.params

    if (!hexId) {
      return res.status(400).send({ message: "hexId is required" })
    }

    const result = await searchByHexID(hexId, model)

    if (!result) {
      return res.status(404).send({ message: "Record not found" })
    }

    return res.status(200).send(result)

  } catch (error) {
    console.error("Error in getSamById:", error)
    return res.status(500).send({ message: "Internal server error" })
  }
}

const getSamsById = (model) => async (req: MulterRequest, res: Response) => {
  const samsFound: any[] = []
  const samsNotFound: any[] = []
  let headersValid = true
  let lineNumber = 0
  const errorMessages: ValidationErrorItem[] = []
  const pendingPromises: Promise<void>[] = []
  const REQ_HEADER = ['serial_hex']
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).send({ error: 'No se proporcionó archivo o la ruta es inválida' })
    }

    validateFileName(req.file.originalname)

    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(stripBomStream())
        .pipe(csv())
        .on('headers', (headers: string[]) => {
          const missing = validateHeaders(headers, REQ_HEADER)
          if (missing.length > 0) {
            headersValid = false
            errorMessages.push({
              message: `Faltan columnas: ${missing.join(', ')}`,
            })
          }
        })
        .on('data', (row) => {
          lineNumber++

          if (headersValid) {
            // Guardamos la promesa en lugar de usar await directo
            const promise = (async () => {
              const sam = await model.findOne({ where: { SERIAL_HEX: row.serial_hex } })
              if (sam) {
                samsFound.push({ lineNumber, ...row })
              } else {
                samsNotFound.push({ lineNumber, ...row })
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

    return res.status(200).send({
      total: lineNumber,
      encontrados: samsFound.length,
      noEncontrados: samsNotFound.length,
      samsFound,
      samsNotFound,
    })

  } catch (error) {
    console.error("Error en getSamsById:", error)
    return res.status(500).send({ error: "Error interno al procesar el archivo" })
  }
}

const getLastVersionRecords = (model) => async (req: Request, res: Response) => {
  const result = await getHighestVersionRecords(model)
  const transformedResult = result.map(record => {
    return Object.fromEntries(
      Object.entries(record).map(([key, value]) => [key.toLowerCase(), value])
    )
  })
  res.status(200).json(transformedResult)
}

export class WhitelistController {
  // Validation files
  static validateWLCVFiles = validateFiles(WhiteListCV)
  static validateWLCLFiles = validateFiles(WhiteList)
  // Get by SERIAL_HEX
  static getSamCvByID = getSamById(WhiteListCV)
  static getSamByID = getSamById(WhiteList)
  // Get many by ID from file
  static getSamsCvByID = getSamsById(WhiteListCV)
  static getSamsByID = getSamsById(WhiteList)

  // Get last version records
  static getLastVersionRecordsCV = getLastVersionRecords(WhiteListCV)
  static getLastVersionRecords = getLastVersionRecords(WhiteList)

  // static getLastVersionRecordsCV = async (req: Request, res: Response) => {
  //   const result = await getHighestVersionRecords(WhiteListCV)

  //   const transformedResult = result.map(record => {
  //     return Object.fromEntries(
  //       Object.entries(record).map(([key, value]) => [key.toLowerCase(), value])
  //     )
  //   })

  //   res.status(200).json(transformedResult)
  // }
  // static getLastVersionRecords = async (req: Request, res: Response) => {
  //   const result = await getHighestVersionRecords(WhiteList)
  //   const transformedResult = result.map(record => {
  //     return Object.fromEntries(
  //       Object.entries(record).map(([key, value]) => [key.toLowerCase(), value])
  //     )
  //   })

  //   res.status(200).json(transformedResult)
  // }
  static newVersionCV = async (req: Request, res: Response) => {

    if (!req.body || req.body.length === 0) {
      return res.status(400).json({ error: 'No se subieron archivos' })
    }
    const { altasValidas, bajasValidas, cambiosValidos } = req.body

    const keyField = 'SERIAL_DEC'
    try {
      const currentVersionRecords = await getHighestVersionRecords(WhiteListCV)
      const currentVersion = await getMaxVersion(WhiteListCV)
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
            const result = await WhiteListCV.bulkCreate(
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
              WhiteListCV,
              altasValidas,
              bajasValidas,
              cambiosValidos,
              keyField
            )

            if (!result.success) {
              return res.status(500).json({ error: "Problema al Generar la nueva version." })
            }

            return res.status(200).json(result)

          } catch (error) {
            console.error("Error en procesamiento en segundo plano:", error)
          }
        })
      }

    } catch (error) {
      console.log('The error')
      res.status(500).json({ error: `${error.message}` })
    }
  }
  static newVersion = async (req: MulterRequest, res: Response) => {

    if (!req.body || req.body.length === 0) {
      return res.status(400).json({ error: 'No se subieron archivos' })
    }
    const { altasValidas, bajasValidas, cambiosValidos } = req.body
    const keyField = 'SERIAL_DEC'
    try {
      const currentVersionRecords = await getHighestVersionRecords(WhiteList)
      const currentVersion = await getMaxVersion(WhiteList)
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
            const result = await WhiteList.bulkCreate(
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
              WhiteList,
              altasValidas,
              bajasValidas,
              cambiosValidos,
              keyField
            )

            if (!result.success) {
              return res.status(500).json({ error: "Problema al Generar la nueva version." })
            }

            return res.status(200).json(result)

          } catch (error) {
            console.error("Error en procesamiento en segundo plano:", error)
          }
        })
      }

    } catch (error) {
      console.log('The error')
      res.status(500).json({ error: `${error.message}` })
    }
  }
  static compareCVVersions = async (req: Request, res: Response) => {
    try {
      const { currentVersion, oldVersion } = req.body
      let altasDataV = 0
      let bajasDataV = 0
      let cambiosDataV = 0
      // Opciones base para las consultas
      const baseOptions: any = {
        attributes: { exclude: ['ESTADO', 'VERSION'] }, // Excluir campos automáticos
        raw: true
      }

      // Obtener ambas versiones en paralelo
      const [currentData, oldData] = await Promise.all([
        WhiteListCV.findAll({
          ...baseOptions,
          where: { ...baseOptions.where, VERSION: currentVersion }
        }),
        WhiteListCV.findAll({
          ...baseOptions,
          where: { ...baseOptions.where, VERSION: oldVersion }
        })
      ])

      // Si no hay datos en alguna versión
      if (!currentData || !oldData) {
        return { current: currentData, old: oldData }
      }

      const { cambiosValidos } = validateChangeInRecord(oldData, currentData)
      const idsPrev = new Set(oldData.map(r => r.SERIAL_HEX))
      const idsCurr = new Set(currentData.map(r => r.SERIAL_HEX))
      const bajas = oldData.filter(r => !idsCurr.has(r.SERIAL_HEX))
      const altas = currentData.filter(r => !idsPrev.has(r.SERIAL_HEX))
      bajasDataV = bajas.length
      altasDataV = altas.length
      cambiosDataV = cambiosValidos.length
      const response = {
        currentData: currentData.length,
        oldData: oldData.length,
        cambiosRes: cambiosDataV,
        altasRes: altasDataV,
        bajasRes: bajasDataV,
        cambiosData: cambiosValidos,
        bajasData: bajas,
        altasData: altas
      }
      res.json(response)
    } catch (error) {
      console.log(error)
    }

  }
  static compareVersions = async (req: Request, res: Response) => {
    try {
      const { currentVersion, oldVersion } = req.body
      let altasDataV = 0
      let bajasDataV = 0
      let cambiosDataV = 0
      // Opciones base para las consultas
      const baseOptions: any = {
        attributes: { exclude: ['VERSION'] },
        raw: true,
        where: {
          ESTADO: 'ACTIVO'
        }
      }

      // Obtener ambas versiones en paralelo
      const [currentData, oldData] = await Promise.all([
        WhiteList.findAll({
          ...baseOptions,
          where: {
            ...baseOptions.where,
            VERSION: currentVersion
          }
        }),
        WhiteList.findAll({
          ...baseOptions,
          where: {
            ...baseOptions.where,
            VERSION: oldVersion
          }
        })
      ])
      // Si no hay datos en alguna versión
      if (!currentData || !oldData) {
        return { current: currentData, old: oldData }
      }

      const { cambiosValidos } = validateChangeInRecord(oldData, currentData)
      const idsPrev = new Set(oldData.map(r => r.SERIAL_HEX))
      const idsCurr = new Set(currentData.map(r => r.SERIAL_HEX))
      const bajas = oldData.filter(r => !idsCurr.has(r.SERIAL_HEX))
      const altas = currentData.filter(r => !idsPrev.has(r.SERIAL_HEX))
      bajasDataV = bajas.length
      altasDataV = altas.length
      cambiosDataV = cambiosValidos.length
      const response = {
        currentData: currentData.length,
        oldData: oldData.length,
        cambiosRes: cambiosDataV,
        altasRes: altasDataV,
        bajasRes: bajasDataV,
        cambiosData: cambiosValidos,
        bajasData: bajas,
        altasData: altas
      }
      res.json(response)
    } catch (error) {
      console.log(error)
    }

  }
  static getResumeCV = async (req: Request, res: Response) => {
    const versions = await getAllVersions(WhiteListCV)
    const currentVersion = await getMaxVersion(WhiteListCV)
    const currentVersionRecords = await getHighestVersionRecords(WhiteListCV)
    const totalRecords = currentVersionRecords.length
    const previusVersion = currentVersion - 1
    const previusVersionRecords = await getAllRecordsBySelectedVersion(WhiteListCV, previusVersion)
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
  static getResume = async (req: Request, res: Response) => {
    const versions = await getAllVersions(WhiteList)
    const currentVersion = await getMaxVersion(WhiteList)
    const currentVersionRecords = await getHighestVersionRecords(WhiteList)
    const totalRecords = currentVersionRecords.length
    const previusVersion = currentVersion - 1
    const previusVersionRecords = await getAllRecordsBySelectedVersion(WhiteList, previusVersion)
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
  static restoreWhitelistCVVersion = async (req: Request, res: Response) => {
    try {
      const { oldVersion } = req.body

      if (!oldVersion) {
        return res.status(400).json({ error: 'El parámetro oldVersion es requerido' })
      }

      const dataVersion = await WhiteListCV.findOne({
        where: { VERSION: oldVersion },
        raw: true
      })

      if (!dataVersion) {
        return res.status(404).json({ error: 'Versión no encontrada' })
      }

      const deletedCount = await WhiteListCV.destroy({
        where: { VERSION: { [Op.gt]: oldVersion } }
      })

      res.json({
        success: true,
        message: `Restauración completada. ${deletedCount} registros eliminados.`
      })

    } catch (error) {
      console.error('Error en restoreWhitelistCVVersion:', error)
      res.status(500).json({
        error: 'Error interno del servidor',
        details: error.message
      })
    }
  }
  static restoreWhitelistVersion = async (req: Request, res: Response) => {
    try {
      const { oldVersion } = req.body

      if (!oldVersion) {
        return res.status(400).json({ error: 'El parámetro oldVersion es requerido' })
      }

      const dataVersion = await WhiteList.findOne({
        where: { VERSION: oldVersion },
        raw: true
      })

      if (!dataVersion) {
        return res.status(404).json({ error: 'Versión no encontrada' })
      }

      const deletedCount = await WhiteList.destroy({
        where: { VERSION: { [Op.gt]: oldVersion } }
      })

      res.json({
        success: true,
        message: `Restauración completada. ${deletedCount} registros eliminados.`
      })

    } catch (error) {
      console.error('Error en restoreWhitelistVersion:', error)
      res.status(500).json({
        error: 'Error interno del servidor',
        details: error.message
      })
    }
  }
}
