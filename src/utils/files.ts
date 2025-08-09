import fs from 'fs'
import csv from 'csv-parser'
import stripBomStream from "strip-bom-stream"
import { checkDuplicates, eliminarRegistros, getAllValidSams, validateChangeInRecord, validateHeaders } from "./validation"
import { validateRow } from '../middleware/validationRow'
import SamsSitp from '../models/SamsSitp'
import { getHighestVersionRecords, getInvalidRecords, getMaxVersion } from './versions'

export interface CategorizedFiles {
  altasFiles: Express.Multer.File[]
  bajasFiles: Express.Multer.File[]
  cambiosFiles: Express.Multer.File[]
}

const categorized: CategorizedFiles = {
  altasFiles: [],
  bajasFiles: [],
  cambiosFiles: [],
}
export interface ValidationErrorItem {
  message?: string
}

export interface ValidationError {
  fileName?: string
  fileErrors?: ValidationErrorItem[]
}

export const validateFileName = (filename: string): boolean => {
  try {
    const patterns = {
      listanegra: /^listanegra_tarjetas_(altas|bajas|cambios)_[0-9A-Fa-f]{2}_\d{14}\.csv$/,
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

export const processFileGroup = async (files: Express.Multer.File[], REQUIRED_HEADERS: string[], PROVIDER_CODES: string[]) => {
  const processingPromises = files.map(async (file) => {
    try {
      const { errors, validData } = await processSingleFile(file, REQUIRED_HEADERS, PROVIDER_CODES);
      return { errors, validData }
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

export async function processSingleFile(
  file: Express.Multer.File,
  REQUIRED_HEADERS: string[],
  PROVIDER_CODES: string[]
): Promise<{ validData: any[]; errors: ValidationErrorItem[] }> {
  return new Promise(async (resolve, reject) => {
    let lineNumber = 0;
    const errorMessages: ValidationErrorItem[] = [];
    const fileValidData: any[] = [];
    const samsValid = await getAllValidSams(SamsSitp);

    let headersValid = true;

    const stream = fs.createReadStream(file.path)
      .pipe(stripBomStream())
      .pipe(csv());

    stream
      .on('headers', (headers: string[]) => {
        const missing = validateHeaders(headers, REQUIRED_HEADERS);
        if (missing.length > 0) {
          headersValid = false;
          errorMessages.push({
            message: `Faltan columnas: ${missing.join(', ')}`,
          });
        }
      })
      .on('data', (row) => {
        lineNumber++;
        if (headersValid) {
          validateRow(
            row,
            lineNumber,
            fileValidData,
            errorMessages,
            file.originalname,
            PROVIDER_CODES,
            samsValid
          );
        }
      })
      .on('end', () => {
        fs.unlinkSync(file.path);
        resolve({
          validData: fileValidData,
          errors: errorMessages
        });
      })
      .on('error', (error) => {
        fs.unlinkSync(file.path);
        reject(error);
      });
  });
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
      const currentVersionRecords = await getHighestVersionRecords(Model)
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
        // console.log(file.validData)
        cambiosFinal.push(...file.validData)
      })
      const { datosValidos: bajasValidas, datosDuplicados: bajasInactivas } = checkDuplicates(allInvalidRecords, bajasFinal, keyField)

      const { cambiosValidos, sinCambios } = validateChangeInRecord(currentVersionRecords, cambiosFinal)

      const { datosValidos: altasValidas, datosDuplicados: altasDuplicadas } = checkDuplicates(currentVersionRecords, altasFinal, keyField)

      const finalRecords = eliminarRegistros(currentVersionRecords, altasValidas, cambiosValidos)

      const newRecords = [...finalRecords, ...altasValidas]

      results.push({
        newVersion,
        currentVersion,
        currentVersionCount: currentVersionRecords.length,
        newRecordsCount: newRecords.length,
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