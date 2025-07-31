import fs from 'fs'
import csv from 'csv-parser'
import stripBomStream from 'strip-bom-stream'
import type { Request, Response } from 'express'
import WhiteListCV from '../models/WhiteListCV'
import { categorizeAllFiles, processFileGroup, processSingleFile } from '../utils/files'
import { getAllRecordsBySelectedVersion, getAllVersions, getHighestVersionRecords, getMaxVersion, processVersionUpdate } from '../utils/versions'
import WhiteList from '../models/WhiteList'
import { searchByHexID } from '../utils/buscador'
import { Op } from 'sequelize'
import { validateChangeInRecord } from '../utils/validation'



const REQUIRED_HEADERS = ['SERIAL_DEC', 'SERIAL_HEX', 'CONFIG', 'OPERATOR', 'LOCATION_ID', 'ESTACION']
const PROVIDER_CODES = ['01', '02', '03', '04', '05', '06', '07', '15', '32', '3C', '46', '5A', '64']

// Interfaces
interface MulterRequest extends Request {
  files: Express.Multer.File[]
}

export class WhitelistController {
  static validateWhiteListCV = async (req: MulterRequest, res: Response) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No se subieron archivos' });
      }

      const files = req.files;
      const results = [];
      let hasErrors = false;

      // Procesar todos los archivos en paralelo (o en serie si prefieres)
      const processingPromises = files.map(async (file) => {
        try {
          const { errors, validData } = await processSingleFile(file, REQUIRED_HEADERS, PROVIDER_CODES);
          return { fileName: file.originalname, errors, validData };
        } catch (error) {
          return {
            fileName: file.originalname,
            errors: error,
            validData: null
          };
        }
      });

      // Esperar a que todos los archivos se procesen
      const fileResults = await Promise.all(processingPromises);
      // Verificar si hay errores en alguno de los archivos
      hasErrors = fileResults.some(result => result.errors && result.errors.length > 0);
      if (hasErrors) {
        fileResults.forEach(result => {
          if (result.errors.length > 0) {
            results.push({
              fileName: result.fileName,
              fileErrors: result.errors
            });
          }
        });
      } else {
        fileResults.forEach(result => {
          if (result.validData.length > 0) {
            results.push({
              fileName: result.fileName,
              validData: result.validData
            })
          }
        })
      }

      // Enviar respuesta adecuada
      if (hasErrors) {
        const response = {
          success: !hasErrors,
          errorsFiles: results,
        }
        return res.status(400).json(response);
      } else {
        const response = {
          success: true,
          validData: results,
        }
        return res.status(200).json(response);
      }

    } catch (error) {
      console.error('Error en validateWhiteListCV:', error);
      return res.status(500).json({
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  };

  static getSamCvByID = async (req: Request, res: Response) => {
    const { hexId } = req.params
    const result = await searchByHexID(hexId, WhiteListCV)

    return res.status(200).send(result)
  }
  static getSamByID = async (req: Request, res: Response) => {
    const { hexId } = req.params
    const result = await searchByHexID(hexId, WhiteList)

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
  static getSamsByID = async (req: MulterRequest, res: Response) => {
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

        const foundRecords = await WhiteList.findAll({
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
      const currentVersionRecords = await getHighestVersionRecords(WhiteList)
      const currentVersion = await getMaxVersion(WhiteList)
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
            const result = await WhiteList.bulkCreate(
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
              WhiteList,
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

      const { cambiosValidos } = validateChangeInRecord(currentData, oldData)
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
        attributes: { exclude: ['ESTADO', 'VERSION'] }, // Excluir campos automáticos
        raw: true
      }

      // Obtener ambas versiones en paralelo
      const [currentData, oldData] = await Promise.all([
        WhiteList.findAll({
          ...baseOptions,
          where: { ...baseOptions.where, VERSION: currentVersion }
        }),
        WhiteList.findAll({
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
