import fs from 'fs'
import csv from 'csv-parser'
import BlackList from "../models/BlackList";
import { MulterRequest, ValidationErrorItem, } from "../types";
import { Response, Request } from 'express'
import { validateFileName, validateInfoBLFiles } from '../utils/files';
import { getAllRecordsBySelectedVersion, getAllVersions, getHighestVersionRecords, getMaxVersion, resumeBlackList } from "../utils/versions";
import { eliminarRegistrosLN, validateHeaders } from "../utils/validation";
import { searchByHexID } from "../utils/buscador";
import { Model, ModelStatic, Op } from "sequelize";
import stripBomStream from "strip-bom-stream";

const validateFiles = (model) => async (req: MulterRequest, res: Response) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No se subieron archivos' })
  }
  const validationResult = await validateInfoBLFiles(req.files, model)
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
}
const getLastVersionRecords = (model) => async (req: Request, res: Response) => {
  const result = await getHighestVersionRecords(model, 'version_ln', 'estado')
  const transformedResult = result.map(record => {
    return Object.fromEntries(
      Object.entries(record).map(([key, value]) => [key.toLowerCase(), value])
    )
  })
  res.status(200).json(transformedResult)
}
const getResumeLastVersion = (model) => async (req: Request, res: Response) => {
  const result = await resumeBlackList(model)
  res.status(200).json(result)
}
const newVersionLN = (model) => async (req: Request, res: Response) => {
  if (!req.body || req.body.length === 0) {
    return res.status(400).json({ error: 'No se enviaron datos para crear una nueva version' })
  }
  const { altasValidas, bajasValidas } = req.body
  try {

    const currentVersionRecords = await getHighestVersionRecords(model, 'version_ln', 'estado')
    const currentVersion = await getMaxVersion(model, 'version_ln')
    const newVersion = currentVersion + 1

    if (currentVersionRecords.length === 0) {
      if (bajasValidas.length > 0) {
        console.warn('Primera versión - Ignorando datos de bajas')
        bajasValidas.length = 0
      }
      res.status(202).json({ message: "Archivos recibidos. Procesando en segundo plano..." })

      process.nextTick(async () => {
        try {
          const result = await model.bulkCreate(
            altasValidas.map(item => ({
              ...item,
              version_ln: newVersion
            }))
          )
          console.log(` Inserción exitosa: ${result.length} registros añadidos.`)
        } catch (error) {
          console.error(" Error en inserción en segundo plano:", error.message)
        }
      })
    } else {

      const finalRecords = eliminarRegistrosLN(currentVersionRecords, bajasValidas)
      const newRecords = [...finalRecords, ...altasValidas]
      const transaction = await model.sequelize.transaction()
      try {
        // 1. Marcar bajas con nueva versión e INACTIVO
        if (bajasValidas.length > 0) {
          const serialesBajas = bajasValidas.map(item => item.keyField)
          await model.update(
            { estado: 'INACTIVO', version_ln: newVersion },
            {
              where: {
                card_serial_number: serialesBajas,
                estado: 'ACTIVO',
                version_ln: currentVersion
              },
              transaction
            }
          )
        }
        // 2. Insertar altas con nueva versión
        if (newRecords.length > 0) {
          const chunkSize = 1000 // ajusta según tamaño de datos o memoria
          const total = newRecords.length

          console.log(`Iniciando inserción de ${total} registros en bloques de ${chunkSize}...`)
          for (let i = 0; i < total; i += chunkSize) {
            const chunk = newRecords.slice(i, i + chunkSize).map(item => ({
              ...item,
              version_ln: newVersion,
            }))
            console.log(`Insertando registros ${i + 1} a ${Math.min(i + chunkSize, total)}...`)
            await model.bulkCreate(chunk, { transaction })
          }
          console.log(`Inserción completada (${total} registros).`)
        }

        await transaction.commit()
        return res.status(200).json({ success: true })
      } catch (error) {
        await transaction.rollback()
        console.log(error)
        throw error
      }
    }
  } catch (error) {
    console.log("Error de inserción en segundo plano:", error.message)
  }
}
const getCardById = <T extends Model>(model: ModelStatic<T>) =>
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const hexId = req.query.hexId as string
      if (!hexId) {
        return res.status(400).json({ success: false, message: "No hay hexId válido" })
      }

      const normalizedHex = hexId.padStart(16, '0')
      const keyField = "card_serial_number"

      const result = await searchByHexID(normalizedHex, model, keyField)

      if (!result) {
        return res.status(404).json({ success: false, message: "Tarjeta no encontrada" })
      }

      return res.status(200).json({ success: true, data: result })

    } catch (error) {
      console.error("Error in getCardById:", error)
      return res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
}
const getCardsById = (model) => async (req: MulterRequest, res: Response) => {
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
              const card = await model.findOne({ where: { card_serial_number: row.serial_hex.padStart(16, '0') } })
              console.log(card)
              if (card) {
                recordsFound.push(card)
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
const getResume = (model) => async (req: Request, res: Response) => {
  const versions = await getAllVersions(model,'version_ln')
  const currentVersion = await getMaxVersion(model,'version_ln')
  const currentVersionRecords = await getHighestVersionRecords(model,'version_ln','estado')
  const totalRecords = currentVersionRecords.length
  const previusVersion = currentVersion - 1
  const previusVersionRecords = await getAllRecordsBySelectedVersion(model, previusVersion, 'version_ln')
  let altasDataV = 0
  let bajasDataV = 0


  if (previusVersion < 1) {
    altasDataV = currentVersionRecords.length
  } else {

    const idsPrev = new Set(previusVersionRecords.map(r => r.card_serial_number))
    const idsCurr = new Set(currentVersionRecords.map(r => r.card_serial_number))
    const bajas = previusVersionRecords.filter(r => !idsCurr.has(r.card_serial_number))
    const altas = currentVersionRecords.filter(r => !idsPrev.has(r.card_serial_number))
    bajasDataV = bajas.length
    altasDataV = altas.length

  }

  const response = {
    totalRecords,
    currentVersion,
    versions,
    altasDataV,
    bajasDataV,

  }
  res.json(response)
}
const restoreBlacklistVersion = (model) => async (req: Request, res: Response) => {
  try {
    const { oldVersion } = req.body
    if (!oldVersion) {
      return res.status(400).json({ error: 'El parámetro oldVersion es requerido' })
    }

    const dataVersion = await model.findOne({
      where: { version_ln: oldVersion },
      raw: true
    })

    if (!dataVersion) {
      return res.status(404).json({ error: 'Versión no encontrada' })
    }

    const deletedCount = await model.destroy({
      where: { version_ln: { [Op.gt]: oldVersion } }
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
const compareVersions = (model, baseOptions: any) => async (req: Request, res: Response) => {
  try {
    const { currentVersion, oldVersion } = req.body
    const [currentData, oldData] = await Promise.all([
      model.findAll({ ...baseOptions, where: { ...baseOptions.where, version_ln: currentVersion } }),
      model.findAll({ ...baseOptions, where: { ...baseOptions.where, version_ln: oldVersion } })
    ])

    if (!currentData || !oldData) {
      return res.status(404).json({ error: "No se encontraron datos para las versiones especificadas" })
    }

    // const { cambiosValidos } = validateChangeInRecord(oldData, currentData)
    const idsPrev = new Set(oldData.map(r => r.card_serial_number))
    const idsCurr = new Set(currentData.map(r => r.card_serial_number))
    const bajas = oldData.filter(r => !idsCurr.has(r.card_serial_number))
    const altas = currentData.filter(r => !idsPrev.has(r.card_serial_number))

    const response = {
      currentData: currentData.length,
      oldData: oldData.length,
      // cambiosRes: cambiosValidos.length,
      altasRes: altas.length,
      bajasRes: bajas.length,
      // cambiosData: cambiosValidos,
      bajasData: bajas,
      altasData: altas
    }
    res.json(response)
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
}
export class BlacklistController {
  static newVersion = newVersionLN(BlackList)
  static validateBLFiles = validateFiles(BlackList)
  static getLastVersionRecords = getLastVersionRecords(BlackList)
  static getResumeLastVersion = getResumeLastVersion(BlackList)
  static getCardById = getCardById(BlackList)
  static getCardsByID = getCardsById(BlackList)
  static getResume = getResume(BlackList)
  static restoreBlacklistVersion = restoreBlacklistVersion(BlackList)
  static compareVersions = compareVersions(BlackList, { raw: true })
}