import fs from 'fs'
import csv from 'csv-parser'
import stripBomStream from 'strip-bom-stream'
import { sonEquivalentesNum } from '../helpers/compareHexToDec'
import { toInt } from 'validator'
import { validateHeaders } from '../helpers/headerVerify'

const REQUIRED_HEADERS = ['SERIAL_DEC', 'SERIAL_HEX', 'CONFIG', 'OPERATOR', 'LOCATION_ID', 'ESTACION']
const PROVIDER_CODES = ['01','02','03','04','05','06','07','15', '32', '3C', '46', '5A', '64']

interface ValidationError {
  line: number
  message: string
  rawData?: any
}

export const processFileGroup = async (files: Express.Multer.File[]) => {
  const validData: any[] = []
  const allErrors: ValidationError[] = []

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
      'Errores encontrados durante la validación:' +
      allErrors.map(e => `- Línea ${e.line}: ${e.message}`).join('')
    )
  }

  return validData
}

async function processSingleFile(file: Express.Multer.File): Promise<any[]> {
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
          validateRow(row, lineNumber, fileValidData, fileErrors, file.filename)
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
        console.log(error.message)
        reject(error.message)
      })
  })
}

const normalizeText = (text: string): string => {
  return text
    .normalize("NFD") // Separa caracteres y acentos (ej: "é" → "e´")
    .replace(/[\u0300-\u036f]/g, "") // Elimina acentos
    .toUpperCase() // Convierte a mayúsculas
}

function validateRow(row: any, lineNumber: number, validData: any[], errors: ValidationError[], fileName: string) {
  // Validar campos vacíos/nulos
  const nullFields = Object.entries(row)
    .filter(([fieldName, value]) => {
      // Ignorar el campo 'ESTACION'
      if (fieldName === 'ESTACION') return false
      // Verificar si el valor es nulo, indefinido o una cadena vacía
      return value === null || value === undefined || value === ''
    })
    .map(([fieldName]) => fieldName)

  if (nullFields.length > 0) {
    throw new Error(
      `Campos vacíos/nulos: en ${nullFields.join(', ')}`
    )
  }
  // Validar la existencia del SAM && Provider Code Dentro del Estimado
  if (row.SERIAL_HEX) {

  }
  // Validar equivalencia HEX/DEC
  const serialDec = toInt(row.SERIAL_DEC)
  if (!sonEquivalentesNum(serialDec, row.SERIAL_HEX)) {
    throw new Error(
      `SERIAL_DEC (${serialDec}) y SERIAL_HEX (${row.SERIAL_HEX}) no coinciden. ` +
      `Hex esperado: ${serialDec.toString(16).toUpperCase()}`
    )
  }

  if (fileName.includes('_cv_')) {
    const typeSAMAvalilable = ['CV','UCV+']
    if (!typeSAMAvalilable.includes(row.CONFIG)) {
      throw new Error(
        `El Tipo de SAM: ${row.CONFIG}, no coincide con el tipo de SAM esperado: ${typeSAMAvalilable} para esta lista.`
      )
    }
  } else {
    const typeSAMAvalilable = ['CP','CL','CPP']
    if (!typeSAMAvalilable.includes(row.CONFIG)) {
      throw new Error(
        `El Tipo de SAM: ${row.CONFIG}, no coincide con el tipo de SAM esperado: ${typeSAMAvalilable} para esta lista.`
      )
    }
  }

  if (!PROVIDER_CODES.includes(row.OPERATOR)) {
    throw new Error(
      `El Provider Code ${row.OPERATOR} no esta en el catalogo de operadores de la red de transporte`
    )
  }

  // Validar longitud maxima de location_id
  const locationID = row.LOCATION_ID
  if (locationID.length > 6) {
    throw new Error(
      `La longitud de LOCATION_ID: ${locationID} excede a 6`
    )
  }
  // normalizar textos
  if (row.ESTACION) {
    row.ESTACION = normalizeText(row.ESTACION)
  }

  // Si pasa todas las validaciones, agregar a datos válidos
  validData.push({
    ...row,
    SERIAL_DEC: serialDec
  })
}