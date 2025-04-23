import multer, { FileFilterCallback } from 'multer'
import { Request } from 'express'

// Función de validación del nombre del archivo
const validateFileName = (filename: string): boolean => {
  const patterns = {
    listanegra: /^listanegra_tarjetas_(altas|bajas|cambios)_[0-9A-Fa-f]{2}_\d{14}\.csv$/,
    listablanca: /^listablanca_sams_(altas|bajas|cambios)_[0-9A-Fa-f]{2}_\d{12}\.csv$/,
    listablanca_cv: /^listablanca_sams_cv_(altas|bajas|cambios)_[0-9A-Fa-f]{2}_\d{12}\.csv$/,
    inventario: /^inventario_sams_(altas|bajas|cambios)_[0-9A-Fa-f]{2}_\d{12}\.csv$/
  }

  const hasCV = filename.includes('_cv_')
  const fileType = Object.keys(patterns).find(key => {
    const isCVType = key.includes('_cv')
    return (hasCV && isCVType && filename.includes(key.replace('_cv', ''))) || 
           (!hasCV && !isCVType && filename.includes(key))
  })
  
  if (!fileType) return false
  
  return patterns[fileType as keyof typeof patterns].test(filename)
}
// Configuración de Multer con validación
const upload = multer({
  dest: 'uploads',
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    callback: FileFilterCallback,
  ) => {
    if (!validateFileName(file.originalname)) {
      return callback(new Error(`Formato de nombre inválido: ${file.originalname}`))
    }
    callback(null, true) // Aceptar el archivo
  },
})

export const uploadCSV = upload.array('csvFiles')