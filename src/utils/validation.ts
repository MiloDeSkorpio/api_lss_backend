import { createHash } from "crypto"
import { toInt } from "validator"
import { CATEGORIES, HeaderValidationResult, ProviderCodes, SamsSitpAttributes, WhiteListAttributes } from "../types"
import SamsSitp from "../models/SamsSitp"

import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator'
import lsstimtRepository from "../repositories/LSSTIMTRepository"
export function sonEquivalentesNum(dec: number, hex: string): boolean {
  const hexAsDec = parseInt(hex, 16)
  if (isNaN(hexAsDec)) throw new Error(`Hex inválido: ${hex}`)
  return hexAsDec === dec
}
export function eliminarRegistros<T extends { SERIAL_HEX: string }>(
  original: T[],
  ...arraysAEliminar: T[][]
): T[] {
  return original.filter(row =>
    !arraysAEliminar.some(array =>
      array.some(rowAEliminar => row.SERIAL_HEX === rowAEliminar.SERIAL_HEX)
    )
  )
}
export function eliminarRegistrosLN<T extends { card_serial_number: string }>(
  original: T[],
  ...arraysAEliminar: T[][]
): T[] {
  return original.filter(row =>
    !arraysAEliminar.some(array =>
      array.some(rowAEliminar => row.card_serial_number === rowAEliminar.card_serial_number)
    )
  )
}
export function validateChangeInRecord(currentRecords: any[], cambiosData: any[],keyField: string) {
  const sinCambios: any[] = []
  const cambiosValidos: any[] = []
  const camposExcluidos = ['ESTADO', 'VERSION']

  const normalizeVal = (v: any) =>
    v === null || v === undefined ? '' : String(v).trim()

  if (!Array.isArray(cambiosData) || cambiosData.length === 0) {
    return { sinCambios: [], cambiosValidos: [] }
  }

  cambiosData.forEach(registroCambio => {
    const registroExistente = currentRecords.find(
      r => normalizeVal(r[keyField]) === normalizeVal(registroCambio[keyField])
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

export function verifyIfExistRecord(arrayCompare: any[], arrayData: any[], keyField: string) {
  const notFoundRecords = []
  const datosExistentes = arrayData.filter(row => {
    const esExistente = arrayCompare.some(invalidRow =>
      invalidRow[keyField] === row[keyField]
    )
    if (!esExistente) {
      notFoundRecords.push(row)
      return false
    }
    return true
  })
  return { datosExistentes, notFoundRecords }
}
export function checkDuplicates(
  arrayCompare: any[],
  arrayData: any[],
  keyField: string
) {
  const datosDuplicados: any[] = []

  if (!Array.isArray(arrayData) || arrayData.length === 0) {
    return { datosValidos: [], datosDuplicados: [] }
  }

  const datosValidos = arrayData.filter(row => {
    const esDuplicado = arrayCompare.some(compareRow =>
      compareRow[keyField] === row[keyField]
    )

    if (esDuplicado) {
      datosDuplicados.push(row)
      return false
    }

    return true
  })

  return { datosValidos, datosDuplicados }
}

export function validateHeaders(headers: string[], required: string[]): HeaderValidationResult {
  const missing = required.filter(h => !headers.includes(h));
  const extra = headers.filter(h => !required.includes(h));

  return {
    missing,
    extra,
    valid: missing.length === 0
  }
}
export function validarHexCard(serial_card: string) {
  const patron = /^0{8}[0-9A-Fa-f]{8}$/
  if (!patron.test(serial_card)) {
    throw new Error(`El Número de Serie: ${serial_card}, es invalido`)
  }
  return patron.test(serial_card)
}
export function validarSerialHex(serial_hex: string) {
  const patron = /^[0-9A-Fa-f]{8}$/
  if (!patron.test(serial_hex)) {
    throw new Error(`El Número de Serie: ${serial_hex}, es invalido`)
  }
  return patron.test(serial_hex)
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
export function isSamInInventory( serial_hex: string) {
  return SamsSitp.findOne({where: {serial_number_hexadecimal : `$${serial_hex}` }})
}
export function isCardInStolenPack(stolenCards: any[], card_serial_number: string, estado: string) {
  return stolenCards.some(card =>
    card.card_serial_number === card_serial_number && estado === 'ACTIVO'
  )
}
export function isCardTypeValid(cardType: string) {
  if (cardType !== 'Calypso') {
    throw new Error(
      `El tipo de tarjeta: ${cardType} no es valido, se espera: Calypso`
    )
  }
  return true
}
export function validatePriority(priorityValues: string[], priority: string) {
  if (!priorityValues.includes(priority)) {
    throw new Error(
      `El Priority ${priority} no esta en el catalogo de valores de la red de transporte`
    )
  }
  return true
}
export function validateBlacklistingDate(date: string): boolean {
  const patron = /^\d{4}-\d{2}-\d{2}$/;

  if (!patron.test(date)) {
    throw new Error(`La fecha ${date} no es una fecha valida`)
  }

  // Extraer componentes de la date
  const [ano, mes, dia] = date.split('-').map(Number);

  // Validar rangos básicos
  if (mes < 1 || mes > 12) throw new Error(`El Mes en ${date} no es un mes valido`)
  if (dia < 1 || dia > 31) throw new Error(`El Día en ${date} no es un día validos`)

  // Validar meses con 30 días
  if ([4, 6, 9, 11].includes(mes) && dia > 30) throw new Error(`El ${mes}° mes en ${date} no tiene más de 30 días`)

  // Validar febrero y años bisiestos
  if (mes === 2) {
    const esBisiesto = (ano % 4 === 0 && ano % 100 !== 0) || (ano % 400 === 0)
    if (esBisiesto && dia > 29) throw new Error(`El mes en febrero no tiene más de 29 días`)
    if (!esBisiesto && dia > 28) throw new Error(`El mes en febrero no tiene más de 28 días`)
  }

  return true
}

export function categorizeByOperator<T extends SamsSitpAttributes>(
  data: T[]
) {
  const result: Record<string, T[]> = {}

  CATEGORIES.forEach(cat => {
    result[cat.key] = []
  })

  result['Otros'] = []

  for (const item of data) {
    const value = item.line_operator_or_recipient ?? ''
    let matched = false

    for (const category of CATEGORIES) {
      if (category.regex.test(value)) {
        result[category.key].push(item)
        matched = true
        break
      }
    }

    if (!matched) {
      result['Otros'].push(item)
    }
  }

  return result
}


export function categorizeByProvider<T extends WhiteListAttributes>(
  data: T[]
) {
  const result: Record<string, T[]> = {}

  ProviderCodes.forEach(cat => {
    result[cat.key] = []
  })

  result['Otros'] = []

  for (const item of data) {
    const value = item.OPERATOR ?? ''
    let matched = false

    for (const category of ProviderCodes) {
      if (category.regex.test(value)) {
        result[category.key].push(item)
        matched = true
        break
      }
    }

    if (!matched) {
      result['Otros'].push(item)
    }
  }

  return result
}

export function locationZoneValidation(locationZone: unknown) {
  if (locationZone === null || locationZone === undefined) {
    throw new Error('locationZone es requerido')
  }

  const value = String(locationZone).trim()

  if (!/^[01]$/.test(value)) {
    throw new Error(
      `locationZone inválido (${locationZone}). Solo se permite 0 o 1`
    )
  }
}

export function IsWeekBitmap(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isWeekBitmap',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return (
            Number.isInteger(value) &&
            value >= 0 &&
            value <= 127
          )
        },
        defaultMessage(args: ValidationArguments) {
          return `Bitmap inválido (${args.value}). Debe estar entre 0 y 127`
        }
      }
    })
  }
}


// validators/is-time-range.validator.ts

export function IsTimeRange(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isTimeRange',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: string) {
          if (typeof value !== 'string') return false

          const regex =
            /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/
          const match = value.match(regex)
          if (!match) return false

          const [, sh, sm, eh, em] = match.map(Number)
          return sh * 60 + sm < eh * 60 + em
        },
        defaultMessage(args: ValidationArguments) {
          return `Rango horario inválido (${args.value}). Use hh:mm-hh:mm`
        }
      }
    })
  }
}

export function SerialNotInLastVersion(
  validationOptions?: ValidationOptions
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'serialNotInLastVersion',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        async validate(serialHex: string) {
          if (!serialHex) return false

          const lastVersion =
            await lsstimtRepository.lastVersion()

          if (!lastVersion) return true

          const exists =
            await lsstimtRepository.existsInVersion(
              serialHex,
              lastVersion
            )

          return !exists
        },
        defaultMessage(args: ValidationArguments) {
          return `serial_hex ${args.value} ya existe en la última versión`
        }
      }
    })
  }
}

export function SerialMustBeActive(validationOptions?: ValidationOptions) {
  return function(object: Object, propertyName: string) {
    registerDecorator({
      name: 'serialMustBeActive',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        async validate(serialHex: string) {
          if (!serialHex) return false

          const lastVersion = await lsstimtRepository.lastVersion()
          if (!lastVersion) return false // No hay versión → no se puede dar de baja

          const exists = await lsstimtRepository.existsInVersion(serialHex, lastVersion)
          return exists // True si existe activo
        },
        defaultMessage(args: ValidationArguments) {
          return `El serial_hex ${args.value} no está activo en la última versión`
        }
      }
    })
  }
}
export function HasAtLeastOne(properties: string[], validationOptions?: ValidationOptions) {
  return function(object: Object, propertyName: string) {
    registerDecorator({
      name: 'hasAtLeastOne',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(_: any, args: ValidationArguments) {
          const obj = args.object as Record<string, any>
          return properties.some(p => obj[p] !== undefined)
        },
        defaultMessage(args: ValidationArguments) {
          return `Debe cambiar al menos uno de los campos: ${properties.join(', ')}`
        }
      }
    })
  }
}
export function HasChangesForLocationDiasHorario(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'hasChangesForLocationDiasHorario',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        async validate(_: any, args: ValidationArguments): Promise<boolean> {
          const obj = args.object as Record<string, any>;

          // Obtener última versión
          const lastVersion = await lsstimtRepository.lastVersion();
          if (!lastVersion) return true; // no hay versión previa → válido

          // Buscar registro actual
          const records = await lsstimtRepository.findAllByVersion(lastVersion);
          const current = records.find(r => r.serial_hex === obj.serial_hex);
          if (!current) return false; // no existe → inválido

          // Normalizar y comparar campos
          const locationNew = String(obj.location_id ?? '').trim();
          const locationCurrent = String(current.location_id ?? '').trim();

          const diasNew = Number(obj.dias ?? 0);
          const diasCurrent = Number(current.dias ?? 0);

          const horarioNew = String(obj.horario ?? '').replace(/\s/g, '').toLowerCase();
          const horarioCurrent = String(current.horario ?? '').replace(/\s/g, '').toLowerCase();

          // Validar si hay al menos un cambio
          return locationNew !== locationCurrent || diasNew !== diasCurrent || horarioNew !== horarioCurrent;
        },
        defaultMessage(args: ValidationArguments) {
          return 'Debe modificar al menos location_id, dias o horario respecto a la versión actual';
        }
      }
    });
  };
}

export function validateHex6(value: string) {
  if (typeof value !== 'string') {
    throw new Error('El valor hexadecimal debe ser una cadena de texto')
  }

  const hexRegex = /^[0-9A-Fa-f]{6}$/

  if (!hexRegex.test(value)) {
    throw new Error(
      `Valor hexadecimal inválido (${value}). Debe ser base 16 y tener exactamente 6 caracteres`
    )
  }

}
