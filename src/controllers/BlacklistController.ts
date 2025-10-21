import BlackList from "../models/BlackList";
import { MulterRequest, } from "../types";
import { Response, Request } from 'express'
import { validateInfoBLFiles } from '../utils/files';
import { getHighestVersionRecords, getMaxVersion, resumeBlackList } from "../utils/versions";
import { eliminarRegistrosLN } from "../utils/validation";



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
        return res.status(200).json({success: true})
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
export class BlacklistController {
  static newVersion = newVersionLN(BlackList)
  static validateBLFiles = validateFiles(BlackList)
  static getLastVersionRecords = getLastVersionRecords(BlackList)
  static getResumeLastVersion = getResumeLastVersion(BlackList)
}