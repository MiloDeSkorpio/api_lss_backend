import {
  IsString,
  IsNotEmpty,
  Matches,
  Validate,
  } from 'class-validator'
import { Transform } from 'class-transformer'
import { AreSerialsEquivalentConstraint } from '../validators/are-serials-equivalent.validator'


export class CustomSamValidationDto {

  @IsString()
  @IsNotEmpty({ message: 'production_log_file no debe estar vacío.' })
  @Matches(/MexCity/, {
    message: 'production_log_file debe contener "MexCity".',
  })
  @Matches(/^[A-Za-z0-9-]+$/, {
    message:
      'production_log_file solo puede contener letras, números y guiones.',
  })
  production_log_file: string


  @IsString({ message: 'serial_number_hexadecimal debe ser un texto.' })
  @IsNotEmpty({ message: 'serial_number_hexadecimal no debe estar vacío.' })
  serial_number_hexadecimal: string


  @IsNotEmpty({ message: 'serial_number_decimal no debe estar vacío.' })
  @Transform(({ value }) => {
    try {
      return BigInt(value)
    } catch {
      return value
    }
  })
  @Validate(AreSerialsEquivalentConstraint)
  serial_number_decimal: bigint


  @IsString({ message: 'reference debe ser un texto.' })
  @IsNotEmpty({ message: 'reference no debe estar vacío.' })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value
    return value
      .replaceAll('\uFEFF', '')
      .replaceAll('\u00A0', ' ')
      .replaceAll(/[\x00-\x1F\x7F]/g, 'v00.00.00')
      .trim()
  })
  @Matches(/^v\d{2}\.\d{2}\.\d{2}$/, {
    message: 'El formato de reference debe ser "vXX.XX.XX", donde X es un número.',
  })
  reference: string

  @IsNotEmpty({ message: 'production_date no debe estar vacío.' })
  @IsString()
  @Matches(/^\d{2}\/\d{2}\/\d{4}$/, {
    message: 'production_date debe tener formato DD/MM/YYYY.',
  })
  production_date: string

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
