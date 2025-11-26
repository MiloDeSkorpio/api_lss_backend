import bcrypt from 'bcryptjs'
import { UserRepository } from '../repositories/UserRepository'
import  { signPayload } from '../utils/jwt'
import { Response } from 'express'
const repo = new UserRepository()

export class AuthService {
  async register(payload: {name: string, email: string, password: string}) {
    const existingUser =  await repo.findByEmail(payload.email.toLocaleLowerCase())
    if(existingUser){
      throw new Error('El correo electrónico ya está en uso')
    }
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS)
    const hashedPassword = await bcrypt.hash(payload.password, saltRounds)

    const user = await repo.create({
      name: payload.name,
      email: payload.email.toLocaleLowerCase(),
      password: hashedPassword
    })
    const { password, ...rest } = user.get({plain: true}) as any
    return rest
  }
  async login(payload: {email: string, password: string}) {
    const user = await repo.findByEmail(payload.email.toLocaleLowerCase())
    if(!user){
      throw new Error('Credenciales inválidas')
    }
    const match = await bcrypt.compare(payload.password, user.password)
    if(!match){
      throw new Error('Credenciales inválidas')
    }
    const token = signPayload({id: user.id, email: user.email})
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    }
  }
  async me(userId: number) {
    const user = await repo.findById(userId)  
    if(!user){
      throw new Error('Usuario no encontrado')
    }
    return user
  }
  async logout(res: Response) {
    await repo.clearToken()
    res.clearCookie('token')
    return true
  }

}