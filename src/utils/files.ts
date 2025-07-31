import fs from 'fs'
import csv from 'csv-parser'
import stripBomStream from "strip-bom-stream"
import { getAllValidSams, validateHeaders } from "./validation"
import { validateRow } from '../middleware/validationRow'
import SamsSitp from '../models/SamsSitp'

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

  for (const file of files) {
    const result = await processSingleFile(file, REQUIRED_HEADERS, PROVIDER_CODES)
    if (result.errors.length > 0) {
      return result.errors
    } else {
      return result.validData
    }
  }
}

export async function processSingleFile(
  file: Express.Multer.File,
  REQUIRED_HEADERS: string[],
  PROVIDER_CODES: string[]
): Promise<{ validData: any[]; errors: ValidationErrorItem[] }> {
  return new Promise(async (resolve, reject) => {
    let lineNumber = 0;
    const filesErrors: ValidationError[] = [];
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
