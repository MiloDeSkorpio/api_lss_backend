import { IsEmail, IsNotEmpty, Length } from "class-validator";

export class VerifyEmailDto {
  @IsEmail({}, { message: "Email inválido" })
  email: string;

  @IsNotEmpty({ message: "El código es obligatorio" })
  @Length(6, 6, { message: "El código debe tener 6 dígitos" })
  code: string;
}
