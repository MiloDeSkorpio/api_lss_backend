
import { toInt } from "validator";
import { ValidationError } from "./files";

export function sonEquivalentesNum(dec: number, hex: string): boolean {
  const hexAsDec = parseInt(hex, 16);
  if (isNaN(hexAsDec)) throw new Error(`Hex inválido: ${hex}`);
  return hexAsDec === dec;
}

export function eliminarRegistros<T extends { SERIAL_DEC: string }>(
  original: T[],
  ...arraysAEliminar: T[][]
): T[] {
  // console.log(itemAEliminar)
  return original.filter(item =>
    !arraysAEliminar.some(array =>
      array.some(itemAEliminar => item.SERIAL_DEC === itemAEliminar.SERIAL_DEC)
    )
  )
}

export function checkDuplicates(currentRecords: any[], altasData: any[], keyField = 'SERIAL_DEC') {
  // Paso 1: Identificar duplicados
  const existingKeys = new Set(currentRecords.map(record => record[keyField]))
  const duplicates: any[] = []

  // Paso 2: Filtrar duplicados
  const uniqueNewRecords = altasData.filter(record => {
    const isDuplicate = existingKeys.has(record[keyField])
    if (isDuplicate) duplicates.push(record)
    return !isDuplicate
  })

  // Paso 3: Combinar registros únicos con los existentes
  const combinedRecords = [...currentRecords, ...uniqueNewRecords]

  // Paso 4: Eliminar duplicados en la combinación (si es necesario)
  const finalRecords = Array.from(new Set(combinedRecords.map(record => record[keyField])))
    .map(key => combinedRecords.find(record => record[keyField] === key))

  return { finalRecords, duplicates }
}

export function validateHeaders(headers: string[], reqHeaders: string[]) {
  if (headers.length !== reqHeaders.length) {
    throw new Error(
      `El archivo debe tener ${reqHeaders.length} columnas. Recibidas: ${headers.length}`
    )
  }

  const missingHeaders = reqHeaders.filter(
    reqHeader => !headers.includes(reqHeader)
  )

  if (missingHeaders.length > 0) {
    throw new Error(
      `Headers faltantes o incorrectos: ${missingHeaders.join(', ')}`
    )
  }
}

export async function getMaxVersion(model) {
  try {
    const maxVersion = await model.max('VERSION' as string)
    return maxVersion || 0
  } catch (error) {
    throw new Error(`Error al consultar la version maxima en ${model.name}: `, error)
  }
}

export const normalizeText = (text: string): string => {
  return text
    .normalize("NFD") 
    .replace(/[\u0300-\u036f]/g, "") 
    .toUpperCase() 
}

export function validateRow(row: any, lineNumber: number, validData: any[], errors: ValidationError[], fileName: string,PROVIDER_CODES: string[]) {

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
  if (row.LOCATION_ID.length > 6) {
    throw new Error(
      `La longitud de LOCATION_ID: ${row.LOCATION_ID} excede a 6`
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