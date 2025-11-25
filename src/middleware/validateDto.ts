import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { Request, Response, NextFunction } from 'express'

export const validateDto = (DtoClass: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const instance = plainToInstance(DtoClass, req.body)
    const errors = await validate(instance)

    if (errors.length > 0) {
      const formattedErrors = errors.map(e => ({
        property: e.property,
        constraints: e.constraints
      }))
      return res.status(400).json({ errors: formattedErrors })
    }
    req.body = instance
    next()
  }
}