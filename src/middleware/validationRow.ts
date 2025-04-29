import { error } from "console";
import { ValidationError } from "../utils/files";
import { genSemoviId, isSamInInventory, isSamValid, normalizeText, validateHexValuesToDec, validateLocationId, validateProviderCode, validateRequiredFields, validateTypeSam } from "../utils/validation";

let ignoreWl = ['ESTACION']
let ignoreBl = []
let ignoreIn = ['version_parametros', 'lock_index', 'fecha_produccion', 'hora_produccion', 'atr', 'samsp_id_hex', 'samsp_version_parametros', 'recibido_por', 'documento_soporte1', 'documento_soporte2', 'observaciones']

export function validateRow(row: any, lineNumber: number, validData: any[], errors: ValidationError[], fileName: string, PROVIDER_CODES: string[],samsValid: any[]) {
  try {
    if (fileName.includes('listablanca')) {
      return validateListaBlanca(row, errors, fileName, PROVIDER_CODES, validData,samsValid)
    }
    else if (fileName.includes('listanegra')) {

    }
    else if (fileName.includes('inventario')) {
      return validateInventorySams(row, errors, fileName, PROVIDER_CODES, validData)
    }
    return false
  } catch (error) {
    errors.push({
      line: lineNumber,
      message: `Error inesperado en la línea ${lineNumber}: ${error instanceof Error ? error.message : String(error)}`,
    });
    return false;
  }

}


async function validateListaBlanca(
  row: any,
  errors: ValidationError[],
  fileName: string,
  PROVIDER_CODES: string[],
  validData: any[],
  samsValid: any[]
) {
  validateRequiredFields(row, ignoreWl)
  if (!isSamInInventory(samsValid,row.SERIAL_HEX, row.OPERATOR)) {
    throw new Error(`El SAM: ${row.SERIAL_HEX} no se encuentra en la DB`)
  }
  const serialDec = validateHexValuesToDec(row.SERIAL_DEC, row.SERIAL_HEX)
  validateTypeSam(row.CONFIG, fileName)
  validateProviderCode(PROVIDER_CODES, row.OPERATOR)
  if (row.ESTACION) {
    row.ESTACION = normalizeText(row.ESTACION)
  }
  validateLocationId(row.LOCATION_ID)
  return validData.push({
    ...row,
    SERIAL_DEC: serialDec
  })
}

function validateInventorySams(
  row: any,
  errors: ValidationError[],
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