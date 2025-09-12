import fs from 'fs'
import csv from 'csv-parser'
import stripBomStream from "strip-bom-stream"
import SamsSitp from '../models/SamsSitp'
import StolenCards from '../models/StolenCards'
import { checkDuplicates, eliminarRegistros, getAllValidSams, validateChangeInRecord, validateHeaders } from "./validation"
import { validateRow } from '../middleware/validationRow'
import { getHighestVersionRecords, getInvalidRecords, getMaxVersion, getResumeOfValidationBL, getStolenCards } from './versions'
import { CategorizedBLFiles, CategorizedFiles, ValidationErrorItem, catByOrg, categorized, categorizedBl, headers_downs_blacklist, headers_ups_blacklist } from '../types'

export const validateFileName = (filename: string): boolean => {
  try {
    const patterns = {
      listanegra: /^listanegra_tarjetas_(altas|bajas)_[0-9A-Fa-f]{2}_\d{14}\.csv$/,
      listablanca: /^listablanca_sams_(altas|bajas|cambios)_[0-9A-Fa-f]{2}_\d{12}\.csv$/,
      listablanca_cv: /^listablanca_sams_cv_(altas|bajas|cambios)_[0-9A-Fa-f]{2}_\d{12}\.csv$/,
      inventario: /^inventario_sams_(altas|bajas|cambios)_[0-9A-Fa-f]{2}_\d{12}\.csv$/,
      sams: /^buscar_sams.*\.csv$/
    }

    const fileType = Object.entries(patterns).find(([, regex]) =>
      regex.test(filename)
    )?.[0]

    return !!fileType
  } catch (error) {
    console.error(`Error al validar nombre de archivo: ${filename}`, error)
    return false
  }
}

export const categorizeAllFiles = (files: Express.Multer.File[]): CategorizedFiles => {
  files?.forEach((file) => {
    if (file.originalname.includes('altas')) categorized.altasFiles.push(file)
    else if (file.originalname.includes('bajas')) categorized.bajasFiles.push(file)
    else if (file.originalname.includes('cambios')) categorized.cambiosFiles.push(file)
  })

  return categorized
}
export const categorizeBLFiles = (files: Express.Multer.File[]): CategorizedBLFiles => {
  const { altas, bajas} = categorizedBl

  files.forEach((file) => {
    if (file.originalname.includes('altas')) altas.push(file)
    if (file.originalname.includes('bajas')) bajas.push(file)
  })
  return categorizedBl
}

export const processFileBLGroup = async (files: Express.Multer.File[]) => {
  const processingPromises = files.map(async (file) => {
    if (file.originalname.includes('bajas')) {
      try {
        const { fileName, errors, validData } = await processSingleBLFile(file, headers_downs_blacklist)
        return { fileName, errors, validData }
      } catch (error) {
        return {
          fileName: file.originalname,
          errors: error,
        }
      }
    } else {
      try {
        const { fileName, errors, validData } = await processSingleBLFile(file, headers_ups_blacklist)
        return { fileName, errors, validData }
      } catch (error) {
        return {
          fileName: file.originalname,
          errors: error,
        }
      }
    }
  })
  // Esperar a que todos los archivos se procesen
  return await Promise.all(processingPromises)
}
export const processFileGroup = async (files: Express.Multer.File[], REQUIRED_HEADERS: string[], PROVIDER_CODES: string[]) => {
  const processingPromises = files.map(async (file) => {
    try {
      const { fileName, errors, validData } = await processSingleFile(file, REQUIRED_HEADERS, PROVIDER_CODES)
      return { fileName, errors, validData }
    } catch (error) {
      return {
        fileName: file.originalname,
        errors: error,
      }
    }
  })
  // Esperar a que todos los archivos se procesen
  return await Promise.all(processingPromises)
}

export async function processSingleBLFile(
  file: Express.Multer.File,
  reqHeaders: string[]
): Promise<{ fileName: string; validData: any[]; errors: ValidationErrorItem[] }> {
  return new Promise(async (resolve, reject) => {
    let lineNumber = 0
    const errorMessages: ValidationErrorItem[] = []
    const fileValidData: any[] = []
    let headersValid = true
    
    if (validateFileName(file.originalname)) {
      fs.createReadStream(file.path)
        .pipe(stripBomStream())
        .pipe(csv())
        .on('headers', (headers: string[]) => {
          const { missing, extra } = validateHeaders(headers, reqHeaders)
          if (missing.length > 0) {
            headersValid = false
            errorMessages.push({
              message: `Faltan columnas: ${missing.join(', ')}`,
            })
          } else if (extra.length > 0) {
            headersValid = false
            errorMessages.push({
              message: `Sobran columnas: ${extra.join(', ')}`,
            })
          }
        })
        .on('data', (row) => {
          lineNumber++
          if (headersValid) {
            validateRow(
              row,
              lineNumber,
              fileValidData,
              errorMessages,
              file.originalname,
            )
          }
        })
        .on('end', () => {
          fs.unlinkSync(file.path)
          resolve({
            fileName: file.originalname,
            validData: fileValidData,
            errors: errorMessages
          })
        })
        .on('error', (error) => {
          fs.unlinkSync(file.path)
          reject(error)
        })
    }

  })
}
export async function processSingleFile(
  file: Express.Multer.File,
  REQUIRED_HEADERS: string[],
  PROVIDER_CODES: string[]
): Promise<{ fileName: string; validData: any[]; errors: ValidationErrorItem[] }> {
  return new Promise(async (resolve, reject) => {
    let lineNumber = 0
    const errorMessages: ValidationErrorItem[] = []
    const fileValidData: any[] = []
    let headersValid = true

    const samsValid = await getAllValidSams(SamsSitp)
    fs.createReadStream(file.path)
      .pipe(stripBomStream())
      .pipe(csv())
      .on('headers', (headers: string[]) => {
        const { missing, extra } = validateHeaders(headers, REQUIRED_HEADERS)
        if (missing.length > 0) {
          headersValid = false
          errorMessages.push({
            message: `Faltan columnas: ${missing.join(', ')}`,
          })
        } else if (extra.length > 0) {
          headersValid = false
          errorMessages.push({
            message: `Sobran columnas: ${extra.join(', ')}`,
          })
        }
      })
      .on('data', (row) => {
        lineNumber++
        if (headersValid) {
          validateRow(
            row,
            lineNumber,
            fileValidData,
            errorMessages,
            file.originalname,
          )
        }
      })
      .on('end', () => {
        fs.unlinkSync(file.path)
        resolve({
          fileName: file.originalname,
          validData: fileValidData,
          errors: errorMessages
        })
      })
      .on('error', (error) => {
        fs.unlinkSync(file.path)
        reject(error)
      })
  })
}

export async function valdiateInfoBLFiles(files, Model) {
  const categorizedBl = categorizeBLFiles(files)
  let hasAltasErrors = false
  let hasBajasErrors = false
  const results = []

  try {
    let [altasData, bajasData] = await Promise.all([
      processFileBLGroup(categorizedBl.altas),
      processFileBLGroup(categorizedBl.bajas)
    ])
    hasAltasErrors = altasData.some(result => result.errors && result.errors.length > 0)
    hasBajasErrors = bajasData.some(result => result.errors && result.errors.length > 0)
    if (hasAltasErrors || hasBajasErrors) {
      altasData.forEach(result => {
        results.push({
          fileName: result.fileName,
          fileErrors: result.errors
        })
      })
      bajasData.forEach(result => {
        results.push({
          fileName: result.fileName,
          fileErrors: result.errors
        })
      })
      return results
    } else {
      const currentVersionRecords = await getHighestVersionRecords(Model,'version_ln','estado')
      const currentVersion = await getMaxVersion(Model)
      const newVersion = currentVersion + 1
      const keyField = 'card_serial_number'
      const allInvalidRecords = await getInvalidRecords(Model)
      const stolenCards = await getStolenCards(StolenCards)
      const {results: resultsByOrg, altasFinal,bajasFinal} = await getResumeOfValidationBL(altasData,bajasData,currentVersionRecords,allInvalidRecords,stolenCards, keyField)
      
      results.push({
        newVersion,
        currentVersion,
        currentVersionCount: currentVersionRecords.length,
        altasFinal,
        bajasFinal,
        resultsByOrg
      })
      return results
    }
  } catch (error) {
    console.log(error)
  }

}


export async function validateInfoFiles(files, Model, REQUIRED_HEADERS: string[], PROVIDER_CODES: string[]) {

  const categorizeFiles = categorizeAllFiles(files)
  let hasAltasErrors = false
  let hasBajasErrors = false
  let hasCambiosErrors = false
  const results = []

  try {
    let [altasData, bajasData, cambiosData] = await Promise.all([
      processFileGroup(categorizeFiles.altasFiles, REQUIRED_HEADERS, PROVIDER_CODES),
      processFileGroup(categorizeFiles.bajasFiles, REQUIRED_HEADERS, PROVIDER_CODES),
      processFileGroup(categorizeFiles.cambiosFiles, REQUIRED_HEADERS, PROVIDER_CODES)
    ])
    hasAltasErrors = altasData.some(result => result.errors && result.errors.length > 0)
    hasBajasErrors = bajasData.some(result => result.errors && result.errors.length > 0)
    hasCambiosErrors = cambiosData.some(result => result.errors && result.errors.length > 0)

    if (hasAltasErrors || hasBajasErrors || hasCambiosErrors) {
      altasData.forEach(result => {
        results.push({
          fileName: result.fileName,
          fileErrors: result.errors
        })
      })
      bajasData.forEach(result => {
        results.push({
          fileName: result.fileName,
          fileErrors: result.errors
        })
      })
      cambiosData.forEach(result => {
        results.push({
          fileName: result.fileName,
          fileErrors: result.errors
        })
      })
      return results
    } else {
      const currentVersionRecords = await getHighestVersionRecords(Model,'VERSION','ESTADO')
      const currentVersion = await getMaxVersion(Model)
      const newVersion = currentVersion + 1
      const keyField = 'SERIAL_HEX'
      const allInvalidRecords = await getInvalidRecords(Model)
      const altasFinal = []
      const bajasFinal = []
      const cambiosFinal = []

      altasData.forEach(file => {
        altasFinal.push(...file.validData)
      })
      bajasData.forEach(file => {
        bajasFinal.push(...file.validData)
      })
      cambiosData.forEach(file => {
        cambiosFinal.push(...file.validData)
      })
      const { datosValidos: bajasValidas, datosDuplicados: bajasInactivas } = checkDuplicates(allInvalidRecords, bajasFinal, keyField)

      const { cambiosValidos, sinCambios } = validateChangeInRecord(currentVersionRecords, cambiosFinal)

      const { datosValidos: altasValidas, datosDuplicados: altasDuplicadas } = checkDuplicates(currentVersionRecords, altasFinal, keyField)

      const finalRecords = eliminarRegistros(currentVersionRecords, altasValidas, cambiosValidos)

      const newRecords = [...finalRecords, ...altasValidas]
      const newR = currentVersionRecords.length + altasValidas.length - bajasValidas.length
      results.push({
        newVersion,
        currentVersion,
        currentVersionCount: currentVersionRecords.length,
        newRecordsCount: newR,
        newRecordsVersion: newRecords,
        altasDuplicadas,
        bajasInactivas,
        sinCambios,
        bajasValidas,
        altasValidas,
        cambiosValidos
      })
      return results
    }
  } catch (error) {
    console.log('Error al validar archivos:', error)
  }

}