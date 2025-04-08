import fs from 'fs'
import csv from 'csv-parser'
import stripBomStream from 'strip-bom-stream'
import { sonEquivalentesNum } from '../helpers/compareHexToDec'
import { toInt } from 'validator'
import { Console } from 'console'

const REQUIRED_HEADERS = ['SERIAL_DEC', 'SERIAL_HEX', 'CONFIG', 'OPERATOR', 'LOCATION_ID', 'ESTACION']

interface ValidationError {
  line: number
  message: string
  rawData?: any
}

export const processFileGroup = async (files: Express.Multer.File[]) => {
  const validData: any[] = []
  const allErrors: ValidationError[] = []
  console.log(allErrors)
  for (const file of files) {
    try {
      const fileData = await processSingleFile(file)
      validData.push(...fileData)
    } catch (error) {
      allErrors.push({
        line: 0,
        message: `Error procesando archivo ${file.originalname}: ${error.message}`
      })
    }
  }

  if (allErrors.length > 0) {
    throw new Error(
      'Errores encontrados durante la validación:\n' +
      allErrors.map(e => `- Línea ${e.line}: ${e.message}`).join('\n')
    )
  }

  return validData
}

async function processSingleFile(file: Express.Multer.File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const fileErrors: ValidationError[] = []
    const fileValidData: any[] = []

    fs.createReadStream(file.path)
      .pipe(stripBomStream())
      .pipe(csv())
      .on('headers', (headers: string[]) => {
        validateHeaders(headers)
      })
      .on('data', (row, lineNumber) => {
        try {
          validateRow(row, lineNumber, fileValidData, fileErrors)
        } catch (error) {
          fileErrors.push({
            line: lineNumber + 1,
            message: error.message,
            rawData: row
          })
        }
      })
      .on('end', () => {
        fs.unlinkSync(file.path)
        if (fileErrors.length > 0) {
          reject(new Error(
            `Archivo ${file.originalname} tiene errores:\n` +
            fileErrors.map(e => `- Línea ${e.line}: ${e.message}`).join('\n')
          ))
        } else {
          resolve(fileValidData)
        }
      })
      .on('error', (error) => {
        fs.unlinkSync(file.path)
        console.log(error.message)
        reject(error.message)
      })
  })
}

function validateHeaders(headers: string[]) {
  if (headers.length !== REQUIRED_HEADERS.length) {
    throw new Error(
      `El archivo debe tener ${REQUIRED_HEADERS.length} columnas. Recibidas: ${headers.length}`
    )
  }

  const missingHeaders = REQUIRED_HEADERS.filter(
    reqHeader => !headers.includes(reqHeader)
  )

  if (missingHeaders.length > 0) {
    throw new Error(
      `Headers faltantes o incorrectos: ${missingHeaders.join(', ')}`
    )
  }
}

function validateRow(row: any, lineNumber: number, validData: any[], errors: ValidationError[]) {
  // Validar campos vacíos/nulos
  const nullFields = Object.entries(row)
    .filter(([_, value]) => value === null || value === undefined || value === '')
    .map(([fieldName]) => fieldName)

  if (nullFields.length > 0) {
    throw new Error(
      `Campos vacíos/nulos: ${nullFields.join(', ')}`
    )
  }

  // Validar equivalencia HEX/DEC
  const serialDec = toInt(row.SERIAL_DEC)
  if (!sonEquivalentesNum(serialDec, row.SERIAL_HEX)) {
    throw new Error(
      `SERIAL_DEC (${serialDec}) y SERIAL_HEX (${row.SERIAL_HEX}) no coinciden. ` +
      `Hex esperado: ${serialDec.toString(16).toUpperCase()}`
    )
  }
  
  // Si pasa todas las validaciones, agregar a datos válidos
  validData.push({
    ...row,
    SERIAL_DEC: serialDec
  })
}