import { createHash } from "crypto"
import { toInt } from "validator"

export function sonEquivalentesNum(dec: number, hex: string): boolean {
  const hexAsDec = parseInt(hex, 16)
  if (isNaN(hexAsDec)) throw new Error(`Hex inválido: ${hex}`)
  return hexAsDec === dec
}
export function eliminarRegistros<T extends { SERIAL_DEC: string }>(
  original: T[],
  ...arraysAEliminar: T[][]
): T[] {
  return original.filter(row =>
    !arraysAEliminar.some(array =>
      array.some(rowAEliminar => row.SERIAL_DEC === rowAEliminar.SERIAL_DEC)
    )
  )
}
export function validateChangeInRecord(currentRecords: any[], cambiosData: any[]) {
  const sinCambios = []
  const cambiosValidos = []
  const camposExcluidos = ['ESTADO', 'VERSION']

  const normalizeVal = (v: any) =>
    v === null || v === undefined ? '' : String(v).trim()

  cambiosData.forEach(registroCambio => {
    const registroExistente = currentRecords.find(
      r => normalizeVal(r.SERIAL_DEC) === normalizeVal(registroCambio.SERIAL_DEC)
    )

    if (!registroExistente) {
      sinCambios.push(registroCambio)
      return
    }

    const tieneCambios = Object.keys(registroCambio).some(key => {
      if (camposExcluidos.includes(key)) return false
      return normalizeVal(registroCambio[key]) !== normalizeVal(registroExistente[key])
    })

    if (tieneCambios) {
      cambiosValidos.push(registroCambio)
    } else {
      sinCambios.push(registroCambio)
    }
  })

  return { sinCambios, cambiosValidos }
}
export function checkDuplicates(arrayCompare: any[], arrayData: any[], keyField: string) {
  
  const datosDuplicados = []
  // Filtrar las bajas que están en arrayInvalidData
  const datosValidos = arrayData.filter(row => {
    const esDuplicado = arrayCompare.some(invalidRow =>
      invalidRow[keyField] === row[keyField] // Comparación por ID (ajusta según tu necesidad)
    )

    if (esDuplicado) {
      datosDuplicados.push(row)
      return false
    }
    return true
  })

  return { datosValidos, datosDuplicados }
}
export function validateHeaders(headers: string[], required: string[]): string[] {
  return required.filter(h => !headers.includes(h))
}
export const normalizeText = (text: string): string => {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
}
export function validateRequiredFields(
  row: Record<string, any>,
  fieldsToIgnore: string[] = []
): string[] {
  const nullFields = Object.entries(row)
    .filter(([fieldName, value]) => {
      // Ignorar campos especificados
      if (fieldsToIgnore.includes(fieldName)) return false

      // Verificar si el valor es nulo, indefinido o cadena vacía
      return value === null || value === undefined || value === ''
    })
    .map(([fieldName]) => fieldName)

  if (nullFields.length > 0) {
    throw new Error(`Campos vacíos/nulos en : ${nullFields.join(', ')}`)
  }

  return nullFields
}
export function validateHexValuesToDec(
  SERIAL_DEC: string,
  SERIAL_HEX: string
) {
  const serialDec = toInt(SERIAL_DEC)
  if (!sonEquivalentesNum(serialDec, SERIAL_HEX)) {
    throw new Error(
      `SERIAL_DEC (${SERIAL_DEC}) y SERIAL_HEX (${SERIAL_HEX}) no coinciden. ` +
      `DEC esperado: ${serialDec.toString(16).toUpperCase()}`
    )
  }
  return serialDec
}
export function validateTypeSam(CONFIG: string, fileName: string) {

  if (fileName.includes('_cv_')) {
    const typeSAMAvalilable = ['CV', 'UCV+']
    if (!typeSAMAvalilable.includes(CONFIG)) {
      throw new Error(
        `El Tipo de SAM: ${CONFIG}, no coincide con el tipo de SAM esperado: ${typeSAMAvalilable} para esta lista.`
      )
    }
  } else {
    const typeSAMAvalilable = ['CP', 'CL', 'CPP']
    if (!typeSAMAvalilable.includes(CONFIG)) {
      throw new Error(
        `El Tipo de SAM: ${CONFIG}, no coincide con el tipo de SAM esperado: ${typeSAMAvalilable} para esta lista.`
      )
    }
  }
  return true
}
export function validateProviderCode(PROVIDER_CODES: string[], OPERATOR: string) {
  if (!PROVIDER_CODES.includes(OPERATOR)) {
    throw new Error(
      `El Provider Code ${OPERATOR} no esta en el catalogo de operadores de la red de transporte`
    )
  }
  return true
}
export function validateLocationId(LOCATION_ID: string) {
  if (LOCATION_ID.length > 6) {
    throw new Error(
      `La longitud de LOCATION_ID: ${LOCATION_ID} excede a 6`
    )
  }
  return true
}
export function genSemoviId(sam_id_hex, sam_id_dec, provider_code) {
  const inputString = `${sam_id_hex}-${sam_id_dec}-${provider_code}`
  const hash = createHash('sha256').update(inputString).digest('base64url')

  // Tomamos los primeros 10 caracteres (sin símbolos raros)
  return `${hash.substring(0, 10)}`
}
export function isSamValid(samsp_id_hex) {
  if (samsp_id_hex) {

    const cleanHex = samsp_id_hex.includes('$')
      ? samsp_id_hex.replace(/\$/g, '')
      : samsp_id_hex

    if (cleanHex.length !== 8) {
      console.error(`El SAM no cumple con la longitud requerida (8 caracteres). Longitud actual: ${cleanHex.length}`)
      return false
    }

    if (!/^[0-9A-Fa-f]+$/.test(cleanHex)) {
      console.error('El SAM contiene caracteres no válidos (solo se permiten hexadecimales)')
      return false
    }

    return true
  }
}
export async function getAllValidSams(model) {
  const result = await model.findAll({
    attributes: ['provider_code', 'sam_id_hex'],
    raw: true
  })
  return result
}
export function isSamInInventory(samsValid: any[], PROVIDER_CODES: any[], SERIAL_HEX: string, OPERATOR: string) {
  return samsValid.some(sam =>
    sam.sam_id_hex === SERIAL_HEX && PROVIDER_CODES.includes(OPERATOR)
  )
}