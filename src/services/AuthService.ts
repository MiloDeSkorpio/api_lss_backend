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
      throw new Error('Credenciales inválidas')
    }
    const match = await bcrypt.compare(payload.password, user.password)
    if (!match) {
      throw new Error('Credenciales inválidas')
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

    if (!user) {
      throw new Error("Usuario no encontrado")
    }

    if (user.is_verified) {
      throw new Error("El usuario ya está verificado")
    }

    const newCode = Math.floor(100000 + Math.random() * 900000).toString()
    const newExpires = new Date(Date.now() + 10 * 60 * 1000) // expira en 10 min

    await repo.updateUser({ email: user.email }, {
      verification_code: newCode,
      verification_expires: newExpires
    })

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

    return true
  }

}