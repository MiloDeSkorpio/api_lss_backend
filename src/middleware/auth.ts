import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authMiddleware = (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  const token = req.cookies?.token
  if (!token) return res.status(401).json({ message: "No autorizado — token faltante" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as any
    if (!decoded.is_verified) {
      return res.status(401).json({ message: "Debes verificar tu correo antes de continuar" });
    }
    req.user = decoded
    next();
  } catch (err) {
    console.error(err)
    return res.status(401).json({ message: "Token inválido" })
  }
}
