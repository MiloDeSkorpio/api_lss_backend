import {
  IsString,
  IsNotEmpty,
  Matches,
  Validate,
  IsDate,
} from 'class-validator'
import { Transform } from 'class-transformer'
import { AreSerialsEquivalentConstraint } from '../validators/are-serials-equivalent.validator'
import { parseDDMMYYYY } from '../utils/date'

export class CustomSamValidationDto {

  @IsString({ message: 'production_log_file debe ser un texto.' })
  @IsNotEmpty({ message: 'production_log_file no debe estar vacío.' })
  @Matches(/^\d{6}-MexCity-LogSam\d{2}$/, {
    message: 'El formato de production_log_file debe ser "XXXXXX-MexCity-LogSamXX", donde X es un número.',
  })
  production_log_file: string

  
  @IsString({ message: 'serial_number_hexadecimal debe ser un texto.' })
  @IsNotEmpty({ message: 'serial_number_hexadecimal no debe estar vacío.' })
  // La validación principal se delega al validador de clase de abajo.
  serial_number_hexadecimal: string


  @IsNotEmpty({ message: 'serial_number_decimal no debe estar vacío.' })
  @Transform(({ value }) => {
    try {
      return BigInt(value)
    } catch {
      return value
    }
  })
  // Aquí aplicamos nuestro validador personalizado. Se ancla a este campo
  // pero tiene acceso a todo el objeto DTO para la validación cruzada.
  @Validate(AreSerialsEquivalentConstraint)
  serial_number_decimal: bigint


  @IsString({ message: 'reference debe ser un texto.' })
  @IsNotEmpty({ message: 'reference no debe estar vacío.' })
  @Matches(/^v\d{2}\.\d{2}\.\d{2}$/, {
    message: 'El formato de reference debe ser "vXX.XX.XX", donde X es un número.',
  })
  reference: string


  @IsNotEmpty({ message: 'production_date no debe estar vacío.' })
  @Transform(({ value }) => {
    try {
        return parseDDMMYYYY(value)
    } catch (e: any) {
        // Si la utilidad lanza un error (formato inválido), devolvemos el valor original.
        // El decorador @IsDate se encargará de marcar el error de tipo.
        return value
    }
  })
  @IsDate({ message: 'production_date debe ser una fecha válida con formato DD/MM/YYYY.' })
  production_date: Date
  

  // Se incluyen otros campos para que el DTO sea completo
  @IsString()
  @IsNotEmpty()
  configuration: string

  @IsString()
  @IsNotEmpty()
  line_operator_or_recipient: string

  @IsString()
  @IsNotEmpty()
  lock_index: string
}
