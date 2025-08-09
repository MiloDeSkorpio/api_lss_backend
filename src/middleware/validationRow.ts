import { ValidationError, ValidationErrorItem } from "../utils/files";
import { genSemoviId, isSamInInventory, isSamValid, normalizeText, validateHexValuesToDec, validateLocationId, validateProviderCode, validateRequiredFields, validateTypeSam } from "../utils/validation";

let ignoreWl = ['ESTACION']
let ignoreIn = ['version_parametros', 'lock_index', 'fecha_produccion', 'hora_produccion', 'atr', 'samsp_id_hex', 'samsp_version_parametros', 'recibido_por', 'documento_soporte1', 'documento_soporte2', 'observaciones']

export function validateRow(row: any, lineNumber: number, validData: any[], errors: ValidationErrorItem[], fileName: string, PROVIDER_CODES: string[], samsValid: any[]) {

  if (fileName.includes('listablanca')) {
    return validateListaBlanca(row, errors, fileName,PROVIDER_CODES, validData, samsValid, lineNumber)
  }
  else if (fileName.includes('listanegra')) {

  }
  else if (fileName.includes('inventario')) {
    return validateInventorySams(row, errors, fileName, PROVIDER_CODES, validData)
  }
  return false

}


async function validateListaBlanca(
  row: any,
  errors: ValidationErrorItem[],
  fileName: string,
  PROVIDER_CODES: string[],
  validData: any[],
  samsValid: any[],
  line: number
) {
  try {
    validateRequiredFields(row, ignoreWl)
    !isSamInInventory(samsValid, PROVIDER_CODES, row.SERIAL_HEX, row.OPERATOR)
    validateHexValuesToDec(row.SERIAL_DEC, row.SERIAL_HEX)
    validateTypeSam(row.CONFIG,fileName)
    if (row.ESTACION) {
      row.ESTACION = normalizeText(row.ESTACION)
    }
    validateProviderCode(PROVIDER_CODES, row.OPERATOR)
    validateLocationId(row.LOCATION_ID)
  } catch (error) {
    errors.push({
      message: `Linea: ${line} - ${error.message}`
    })
  }
  if (errors.length === 0) {
    validData.push({
      ...row,
      SERIAL_DEC: row.SERIAL_DEC
    })
  }
}

function validateInventorySams(
  row: any,
  errors: ValidationErrorItem[],
  fileName: string,
  PROVIDER_CODES: string[],
  validData: any[]
) {
  validateRequiredFields(row, ignoreIn)
  const serialDec = validateHexValuesToDec(row.sam_id_dec, row.sam_id_hex)
  validateProviderCode(PROVIDER_CODES, row.provider_code)
  isSamValid(row.samsp_id_hex)
  const semoviId = genSemoviId(row.sam_id_hex, row.sam_id_dec, row.provider_code)
  return validData.push({
    ...row,
    id_semovi: semoviId,
    sam_id_dec: serialDec
  })
}