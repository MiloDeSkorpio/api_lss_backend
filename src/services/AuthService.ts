import bcrypt from 'bcryptjs'
import crypto from "node:crypto"
import { UserRepository } from '../repositories/UserRepository'
import { signPayload } from '../utils/jwt'
import { Response } from 'express'
import { sendMail } from '../utils/sendMail'
const repo = new UserRepository()

export class AuthService {
  async register(payload: { name: string, email: string, password: string }) {

    const existingUser = await repo.findByEmail(payload.email.toLocaleLowerCase())

    if (existingUser) {
      throw new Error('El correo electrónico ya está en uso')
    }
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS)
    const hashedPassword = await bcrypt.hash(payload.password, saltRounds)

    const verificationCode = crypto.randomInt(100000, 999999).toString()
    const expires = new Date(Date.now() + 15 * 60 * 1000) // 15 minutos

    await repo.create({
      name: payload.name,
      email: payload.email.toLocaleLowerCase(),
      password: hashedPassword,
      verification_code: verificationCode,
      verification_expires: expires,
      is_verified: false
    })

    await sendMail({
      to: payload.email,
      subject: "Tu código de verificación",
      html: `
        <h1>Confirma tu correo</h1>
        <p>Tu código de verificación es:</p>
        <h2>${verificationCode}</h2>
        <p>Este código expirará en 15 minutos.</p>
      `
    })

    return true
  }
  async login(payload: { email: string, password: string }) {
    const user = await repo.findByEmail(payload.email.toLocaleLowerCase())
    if (!user) {
      throw new Error('Correo o contraseña incorrectos')
    }
    const match = await bcrypt.compare(payload.password, user.password)
    if (!match) {
      throw new Error('Correo o contraseña incorrectos')
    }

    const token = signPayload({
      id: user.id,
      email: user.email,
      is_verified: user.is_verified,
      name: user.name,
      roleId: user.roleId ?? null
    })
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        is_verified: user.is_verified
      }
    }
  }
  async me(userId: number) {
    const user = await repo.findById(userId)
    if (!user) {
      throw new Error('Usuario no encontrado')
    }
    return user
  }
  async logout(res: Response) {
    await repo.clearToken()
    res.clearCookie('token')
    return true
  }
  async verifyEmail(email: string, code: string) {
    const user = await repo.findByEmail(email.toLowerCase())

    if (!user) throw new Error("Usuario no encontrado")

    if (user.is_verified) throw new Error("El usuario ya está verificado")

    if (user.verification_code !== code) {
      throw new Error("El código es incorrecto")
    }

    if (user.verification_expires < new Date()) {
      throw new Error("El código ha expirado")
    }

    await repo.updateUser(
      { email: user.email },
      {
        is_verified: true,
        verification_code: null,
        verification_expires: null
      }
    );

    return true
  }
  async resendVerificationCode(email: string) {
    const user = await repo.findByEmail(email.toLowerCase())
    if (!user) throw new Error("Usuario no encontrado")

    if (user.is_verified) {
      throw new Error("El usuario ya está verificado")
    }

    const now = new Date()

    if (user.verification_last_sent &&
      now.getTime() - new Date(user.verification_last_sent).getTime() < 60000) {
      throw new Error("Debes esperar 60 segundos antes de reenviar otro código.")
    }

    if (user.verification_resend_count >= 5) {
      throw new Error("Has alcanzado el máximo de reenvíos permitidos hoy.")
    }

    const newCode = Math.floor(100000 + Math.random() * 900000).toString()
    const newExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 min

    await repo.updateUser(
      { email: user.email },
      {
        verification_code: newCode,
        verification_expires: newExpires,
        verification_last_sent: now,
        verification_resend_count: (user.verification_resend_count || 0) + 1
      }
    )
    await sendMail({
      to: email,
      subject: "Tu nuevo código de verificación",
      html: `
        <h1>Reenvío de código de verificación</h1>
        <p>Tu nuevo código de verificación es:</p>   
        <h2>${newCode}</h2>
        <p>Este código expirará en 10 minutos.</p>
      `
    })

    return { message: "Código reenviado correctamente" }
  }
  async requestPasswordReset(email: string) {
    const user = await repo.findByEmail(email)
    if (!user) throw new Error("Usuario no encontrado")

    const now = new Date()

    // Anti-spam: 1 por minuto
    if (user.reset_last_sent &&
      now.getTime() - new Date(user.reset_last_sent).getTime() < 60000) {
      throw new Error("Espera 60 segundos para reenviar otro código")
    }

    // Máximo 5 intentos diarios
    if (user.reset_resend_count >= 5) {
      throw new Error("Demasiados intentos hoy")
    }

    const code = crypto.randomInt(100000, 999999).toString()

    await repo.updateUser(
      { email: user.email },
      {
        reset_code: code,
        reset_expires: new Date(Date.now() + 15 * 60 * 1000), // 15 min
        reset_last_sent: now,
        reset_resend_count: (user.reset_resend_count || 0) + 1
      }
    )

    await sendMail({
      to: user.email,
      subject: "Restablecer contraseña",
      html: `
        <h1>Restablecer contraseña</h1>
        <p>Tu código de verificación es:</p>
        <h2>${code}</h2>
        <p>Este código expirará en 15 minutos.</p>
      `
    })

    return { message: "Código enviado al correo" }
  }
  async verifyResetCode(email: string, code: string) {
    const user = await repo.findByEmail(email.toLowerCase())
    if (!user) throw new Error("Usuario no encontrado")

    if (user.reset_code !== code)
      throw new Error("Código incorrecto")

    if (new Date() > new Date(user.reset_expires))
      throw new Error("Código expirado")

    return { message: "Código válido" }
  }
  async resetPassword(email: string, code: string, newPassword: string) {
    await this.verifyResetCode(email, code)

    const user = await repo.findByEmail(email.toLowerCase())
    if (!user) throw new Error("Usuario no encontrado")

    const hashed = await bcrypt.hash(newPassword, 10)

    await repo.updateUser(
      { email: user.email },
      {
        password: hashed,
        reset_code: null,
        reset_expires: null,
        reset_last_sent: null,
        reset_resend_count: 0
      }
    )

    return { message: "Contraseña actualizada correctamente" }
  }
}