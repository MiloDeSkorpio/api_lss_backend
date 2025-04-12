import fs from 'fs'
import csv from 'csv-parser'
import stripBomStream from 'strip-bom-stream'
import { sonEquivalentesNum } from '../helpers/compareHexToDec'
import { toInt } from 'validator'

const REQUIRED_HEADERS = ['SERIAL_DEC', 'SERIAL_HEX', 'CONFIG', 'OPERATOR', 'LOCATION_ID', 'ESTACION']

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
        validateHeaders(headers)
      })
      .on('data', (row) => {
        lineNumber++
        try {
          validateRow(row, lineNumber, fileValidData, fileErrors)
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

const normalizeText = (text: string): string => {
  return text
    .normalize("NFD") // Separa caracteres y acentos (ej: "é" → "e´")
    .replace(/[\u0300-\u036f]/g, "") // Elimina acentos
    .toUpperCase() // Convierte a mayúsculas
}

function validateRow(row: any, lineNumber: number, validData: any[], errors: ValidationError[]) {
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

  // Validar equivalencia HEX/DEC
  const serialDec = toInt(row.SERIAL_DEC)
  if (!sonEquivalentesNum(serialDec, row.SERIAL_HEX)) {
    throw new Error(
      `SERIAL_DEC (${serialDec}) y SERIAL_HEX (${row.SERIAL_HEX}) no coinciden. ` +
      `Hex esperado: ${serialDec.toString(16).toUpperCase()}`
    )
  }
  const typeSAMAvalilable = ['CL']
  let typeSAM = row.CONFIG

  if (!typeSAMAvalilable.includes(typeSAM)) {
    throw new Error(
      `El Tipo de SAM: ${typeSAM}, no coincide con el tipo de SAM esperado: ${typeSAMAvalilable[0]} para esta lista.`
    )
  }
  const providerCodes = ['01', '02', '03', '04', '05', '06', '07', '14', '15', '32', '3C', '46', '5A', '64', '96', 'C8', 'C9', 'C4', 'CB', 'CC']
  // validar tipo de sam disponible
  const providerCode = row.OPERATOR
  if (!providerCodes.includes(providerCode)) {
    throw new Error(
      `El Provider Code ${providerCode} no esta en el catalogo de operadores de la red de transporte`
    )
  }

  // Validar longitud maxima de location_id
  const locationID = row.LOCATION_ID
  if (locationID.length > 6) {
    throw new Error(
      `La longitud de LOCATION_ID: ${locationID} excede a 6`
    )
  }


  // Si pasa todas las validaciones, agregar a datos válidos
  validData.push({
    ...row,
    SERIAL_DEC: serialDec
  })
}