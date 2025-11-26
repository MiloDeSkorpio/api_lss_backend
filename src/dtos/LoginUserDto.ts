import { IsEmail, IsNotEmpty } from 'class-validator'

export class LoginUserDto {
  @IsNotEmpty({message: 'El correo electrónico es obligatorio'})
  @IsEmail({}, {message: 'El correo electrónico no es válido'})
  email: string
  @IsNotEmpty({message: 'La contraseña es obligatoria'})
  password: string
}