import { priorityValues, PROVIDER_CODES, ValidationErrorItem } from "../types";
import { assertSamExistsInInventory } from "../utils/buscador";
import { validateFileName } from "../utils/files";
import { genSemoviId, isCardInStolenPack, isCardTypeValid, isSamInInventory, isSamValid, locationZoneValidation, normalizeText, validarHexCard, validarSerialHex, validateBlacklistingDate, validateHexValuesToDec, validateLocationId, validatePriority, validateProviderCode, validateRequiredFields, validateTypeSam } from "../utils/validation";

let ignoreWl = ['ESTACION']
let ignoreIn = ['version_parametros', 'lock_index', 'fecha_produccion', 'hora_produccion', 'atr', 'samsp_id_hex', 'samsp_version_parametros', 'recibido_por', 'documento_soporte1', 'documento_soporte2', 'observaciones']

export async function validateRow(row: any, lineNumber: number, validData: any[], errors: ValidationErrorItem[], fileName: string) {

  if (fileName.includes('listablanca')) {
    return validateListaBlanca(row, errors, fileName, PROVIDER_CODES, validData, lineNumber)
  }
  else if (fileName.includes('listanegra')) {
    return validateListaNegra(row, errors, fileName, validData, lineNumber,)
  }
  else if (fileName.includes('inventario')) {
    return validateInventorySams(row, errors, fileName, PROVIDER_CODES, validData)
  }
  else if (fileName.includes('buscar')) {
    return validateSearch(row, errors, fileName, validData,lineNumber)
  }
  else if (fileName.includes('listaseguridadchalco')) {
    return await validateLssTCSM(row, errors, validData,lineNumber)
  }
  return false

}


async function validateListaBlanca(
  row: any,
  errors: ValidationErrorItem[],
  fileName: string,
  PROVIDER_CODES: string[],
  validData: any[],
  line: number
) {
  try {
    validateRequiredFields(row, ignoreWl)
    // !isSamInInventory(samsValid, PROVIDER_CODES, row.SERIAL_HEX, row.OPERATOR)
    validateHexValuesToDec(row.SERIAL_DEC, row.SERIAL_HEX)
    validateTypeSam(row.CONFIG, fileName)
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
async function validateListaNegra(
  row: any,
  errors: ValidationErrorItem[],
  fileName: string,
  validData: any[],
  line: number,
) {
  try {
    if (fileName.includes('bajas')) {
      validateFileName(fileName)
      validateRequiredFields(row)
      isCardTypeValid(row.card_type)
      validarHexCard(row.card_serial_number)
    } else {
      validateFileName(fileName)
      validateRequiredFields(row)
      isCardTypeValid(row.card_type)
      validarHexCard(row.card_serial_number)
      validatePriority(priorityValues, row.priority)
      validateBlacklistingDate(row.blacklisting_date)
    }
  } catch (error) {
    errors.push({
      message: `Linea: ${line} - ${error.message}`
    })
  }
  if (errors.length === 0) {
    validData.push({
      ...row,
      card_serial_number: row.card_serial_number
    })
  }
}
async function validateSearch(
  row: any,
  errors: ValidationErrorItem[],
  fileName: string,
  validData: any[],
  line: number,
) {
  try {
    validateRequiredFields(row)
    validarSerialHex(row.serial_hex)
  } catch (error) {
    errors.push({
      message: `Linea: ${line} - ${error.message}`
    })
  }
  if (errors.length === 0) {
    validData.push({
      ...row,
      serial_hex: row.serial_hex
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
async function validateLssTCSM(
  row: any,
  errors: ValidationErrorItem[],
  validData: any[],
  lineNumber: number
) {
  try {
    validarSerialHex(row.serial_hex)
    await assertSamExistsInInventory(row.serial_hex)
    locationZoneValidation(row.location_zone)
  } catch (error) {
    errors.push({
      message: `Linea: ${lineNumber} - ${error.message}`
    })
  }
   if (errors.length === 0) {
    validData.push({
      ...row,
      serial_hex: row.serial_hex
    })
  }
}