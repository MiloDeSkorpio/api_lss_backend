import { Request, Response } from 'express'
import { AuthService } from '../services/AuthService'

const service = new AuthService()

export class AuthController {
  register = async (req: Request, res: Response) => {
    try {
      const payload: {name: string, email: string, password: string} = req.body
      const user = await service.register(payload)
      res.status(201).json({message: 'Usuario Registrado', user })
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Error al registrar el usuario" })
    } 
  }

  login = async (req: Request, res: Response) => {
    try {
      const payload: {email: string, password: string} = req.body
      const data = await service.login(payload)
      res.status(200).json({message: 'Autenticado',data})
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Error al iniciar sesión" })
    } 
  }
  
  me = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id
      if (!userId) {
        return res.status(401).json({ message: "Usuario no autenticado" })
      }
      const data = await service.me(userId)
      res.status(200).json({user: data })
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Error al obtener el usuario" })
    }
  }

  logout = async (req: Request, res: Response) => {
    try {
      await service.logout(res)
      res.status(200).json({ message: "Cierre de sesión exitoso" })
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Error al cerrar sesión" })
    }
  }
}