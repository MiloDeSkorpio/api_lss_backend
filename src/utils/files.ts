import fs from 'fs'
import csv from 'csv-parser'
import stripBomStream from "strip-bom-stream"
import { validateHeaders } from "./validation"
import { validateRow } from '../middleware/validationRow';

export interface CategorizedFiles {
  altasFiles: Express.Multer.File[];
  bajasFiles: Express.Multer.File[];
  cambiosFiles: Express.Multer.File[];
}

const categorized: CategorizedFiles = {
  altasFiles: [],
  bajasFiles: [],
  cambiosFiles: [],
}

export interface ValidationError {
  line: number
  message: string
  rawData?: any
}

export const validateFileName = (filename: string): boolean => {
  const patterns = {
    listanegra: /^listanegra_tarjetas_(altas|bajas|cambios)_[0-9A-Fa-f]{2}_\d{14}\.csv$/,
    listablanca: /^listablanca_sams_(altas|bajas|cambios)_[0-9A-Fa-f]{2}_\d{12}\.csv$/,
    listablanca_cv: /^listablanca_sams_cv_(altas|bajas|cambios)_[0-9A-Fa-f]{2}_\d{12}\.csv$/,
    inventario: /^inventario_sams_(altas|bajas|cambios)_[0-9A-Fa-f]{2}_\d{12}\.csv$/
  }

  const hasCV = filename.includes('_cv_')
  const fileType = Object.keys(patterns).find(key => {
    const isCVType = key.includes('_cv')
    return (hasCV && isCVType && filename.includes(key.replace('_cv', ''))) || 
           (!hasCV && !isCVType && filename.includes(key))
  })
  
  if (!fileType) return false
  
  return patterns[fileType as keyof typeof patterns].test(filename)
}

export const categorizeAllFiles = (files: Express.Multer.File[]): CategorizedFiles => {

  files?.forEach((file) => {
    if (file.originalname.includes('altas')) categorized.altasFiles.push(file);
    else if (file.originalname.includes('bajas')) categorized.bajasFiles.push(file);
    else if (file.originalname.includes('cambios')) categorized.cambiosFiles.push(file);
  });

  return categorized
}

export const processFileGroup = async (files: Express.Multer.File[], REQUIRED_HEADERS: string[],PROVIDER_CODES: string[]) => {
  const validData: any[] = []
  const allErrors: ValidationError[] = []
  // let lineNumber = 0
  for (const file of files) {
    try {
      const fileData = await processSingleFile(file,REQUIRED_HEADERS,PROVIDER_CODES)
      validData.push(...fileData)
    } catch (error) {
      allErrors.push({
        line: error.line,
        message: `Error procesando archivo ${file.originalname}: ${error.message}`
      })
    }
  }

  if (allErrors.length > 0) {
    throw new Error(
      'Errores encontrados durante la validación:' +
      allErrors.map(e => `- Línea ${e.line}: ${e.message}`).join('')
    )
  }

  return validData
}

export async function processSingleFile(file: Express.Multer.File,REQUIRED_HEADERS: string[], PROVIDER_CODES: string[]): Promise<any[]> {
  return new Promise((resolve, reject) => {
    let lineNumber = 0
    const fileErrors: ValidationError[] = []
    const fileValidData: any[] = []

    fs.createReadStream(file.path)
      .pipe(stripBomStream())
      .pipe(csv())
      .on('headers', (headers: string[]) => {
        validateHeaders(headers,REQUIRED_HEADERS)
      })
      .on('data', (row) => {
        lineNumber++
        try {
          validateRow(row, lineNumber, fileValidData, fileErrors, file.filename,PROVIDER_CODES)
        } catch (error) {
          fileErrors.push({
            line: lineNumber,
            message: error.message,
            rawData: row
          })
        }
      })
      .on('end', () => {
        fs.unlinkSync(file.path)
        if (fileErrors.length > 0) {
          reject(new Error(
            `Archivo ${file.originalname} tiene errores:` +
            fileErrors.map(e => `- Línea ${e.line}: ${e.message}`).join('')
          ))
        } else {
          resolve(fileValidData)
        }
      })
      .on('error', (error) => {
        fs.unlinkSync(file.path)
        // console.log(error.message)
        reject(error.message)
      })
  })
}
