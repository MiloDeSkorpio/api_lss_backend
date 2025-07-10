import { Request, Response, NextFunction } from "express"
import { validationResult } from "express-validator"
import multer from 'multer'

export const handleInputErrors = (req: Request, res: Response, next: NextFunction) => {
    let errors = validationResult(req)
    if(!errors.isEmpty()){
      return res.status(400).json({errors: errors.array()})
    }
  next()
}

export function multerErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message })
  } else if (err) {
    return res.status(400).json({ error: err.message })
  }
  next();
}
