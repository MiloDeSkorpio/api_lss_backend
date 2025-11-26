
import jwt, { SignOptions } from 'jsonwebtoken'

const JWT_SECRET: string = process.env.JWT_SECRET!  
const JWT_EXPIRES_IN: string  = process.env.JWT_EXPIRES_IN!

export function signPayload(payload: object){
  return jwt.sign(payload, JWT_SECRET, {expiresIn: JWT_EXPIRES_IN} as SignOptions)
}

export function verifyToken(token: string){
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}