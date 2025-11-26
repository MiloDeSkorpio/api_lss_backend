import { IsEmail, IsNotEmpty, Length} from 'class-validator'

export class RegisterUserDto {
  @IsNotEmpty({message: 'El nombre es obligatorio'})
  @Length(2, 128, {message: 'El nombre debe tener entre 2 y 128 caracteres'})
  name: string
  @IsNotEmpty({message: 'El correo electrónico es obligatorio'})
  @IsEmail({}, {message: 'El correo electrónico no es válido'})
  email: string
  @IsNotEmpty({message: 'La contraseña es obligatoria'})
  @Length(6, 128, {message: 'La contraseña debe tener entre 6 y 128 caracteres'})
  password: string 
  
}