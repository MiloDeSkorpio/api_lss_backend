import { IsNotEmpty, IsString, IsIn, IsNumber } from 'class-validator'

export class LogVersionHistoryDto {
  @IsNotEmpty({ message: 'El nombre de la lista es obligatorio' })
  @IsString({ message: 'El nombre de la lista debe ser una cadena de texto' })
  @IsIn(['WHITELIST', 'BLACKLIST', 'WHITELIST_CV'], { message: 'El nombre de la lista no es válido' })
  listName: 'WHITELIST' | 'BLACKLIST' | 'WHITELIST_CV'

  @IsNotEmpty({ message: 'La versión es obligatoria' })
  @IsString({ message: 'La versión debe ser una cadena de texto' })
  version: string

  @IsNotEmpty({ message: 'El tipo de operación es obligatorio' })
  @IsString({ message: 'El tipo de operación debe ser una cadena de texto' })
  @IsIn(['CREATION', 'ROLLBACK'], { message: 'El tipo de operación no es válido' })
  operationType: 'CREATION' | 'ROLLBACK'

  @IsNotEmpty({ message: 'El ID de usuario es obligatorio' })
  @IsNumber({}, { message: 'El ID de usuario debe ser un número' })
  userId: number
}
