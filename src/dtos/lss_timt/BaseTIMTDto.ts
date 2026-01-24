import { IsNotEmpty, IsNumber, IsString, Matches } from "class-validator";
import { IsTimeRange, IsWeekBitmap } from "../../utils/validation";

export class BaseValidationDto {
@IsString()
@IsNotEmpty({ message: 'serial_hex no debe estar vacío.' })
@Matches(/^[0-9A-F]{8}$/, {
  message: 'serial_hex debe ser un hexadecimal válido de 8 dígitos'
})
serial_hex: string

@IsString()
@IsNotEmpty({ message: 'location_id no debe estar vacío.' })
@Matches(/^[0-9A-F]{6}$/, {
  message: 'location_id debe ser un hexadecimal válido de 6 dígitos'
})
location_id: string

@IsNumber()
@IsNotEmpty({ message: 'dias no debe estar vacío.' })
@IsWeekBitmap()
dias: number

@IsString()
@IsNotEmpty({ message: 'horario no debe estar vacío.' })
@IsTimeRange()
horario: string
}