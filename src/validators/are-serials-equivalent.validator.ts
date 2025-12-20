import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator'

@ValidatorConstraint({ name: 'areSerialsEquivalent', async: false })
export class AreSerialsEquivalentConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const dto = args.object as any
    const hexWithPrefix = dto.serial_number_hexadecimal as string
    const decimal = dto.serial_number_decimal as bigint | number

    // Si alguno de los dos campos no está presente, la validación no se aplica aquí
    // Otros decoradores (@IsNotEmpty) deben encargarse de eso si son obligatorios.
    if (!hexWithPrefix || decimal === undefined || decimal === null) {
      return true
    }

    // 1. Validar formato y extraer el hexadecimal
    if (typeof hexWithPrefix !== 'string' || !hexWithPrefix.includes('$')) {
      return false // El formato debe contener '$'
    }
    const parts = hexWithPrefix.split('$')
    if (parts.length !== 2 || parts[1].length !== 8) {
      return false // Debe haber una parte después del '$' y debe tener 8 caracteres
    }
    const hexValue = parts[1]

    if (!/^[0-9A-Fa-f]{8}$/i.test(hexValue)) {
        return false // No es un hexadecimal válido de 8 caracteres
    }

    // 2. Realizar la conversión y comparación
    try {
      const decimalFromHex = BigInt('0x' + hexValue)
      const decimalValue = BigInt(decimal)
      
      return decimalFromHex === decimalValue
    } catch (error) {
      return false // Error en la conversión
    }
  }

  defaultMessage(args: ValidationArguments) {
    const dto = args.object as any
    const hexWithPrefix = dto.serial_number_hexadecimal as string
    
    if (typeof hexWithPrefix !== 'string' || !hexWithPrefix.includes('$')) {
        return 'El formato de serial_number_hexadecimal debe ser "prefijo$valor"'
    }
    const parts = hexWithPrefix.split('$')
    if (parts.length !== 2 || parts[1].length !== 8) {
        return 'El valor hexadecimal después del "$" debe tener exactamente 8 caracteres.'
    }
    if (!/^[0-9A-Fa-f]{8}$/i.test(parts[1])) {
        return 'El valor hexadecimal contiene caracteres inválidos.'
    }

    return 'El serial hexadecimal y el decimal no son equivalentes.'
  }
}

// Función decoradora para usar en el DTO
export function AreSerialsEquivalent(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: AreSerialsEquivalentConstraint,
    })
  }
}
