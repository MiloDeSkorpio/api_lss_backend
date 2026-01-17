import { Request } from 'express'

export interface AuthUser {
  id: number
  email: string
  name: string
  roleId: number
  is_verified: number
  iat: number
  exp: number
}

export interface AuthRequest extends Request {
  user: AuthUser
}
