import multer, { FileFilterCallback } from 'multer'
import { Request } from 'express'
import { validateFileName } from '../utils/files'
import fs from 'fs'

const getDestination = (filename: string): string => {
  let folder = 'uploads/otros' // Valor por defecto

  // Lógica para determinar la carpeta
  if (filename.startsWith('listanegra')) {
    folder = 'uploads/listanegra'
  } else if (filename.startsWith('listablanca')) {
    folder = filename.includes('_cv_') 
      ? 'uploads/listablanca_cv' 
      : 'uploads/listablanca'
  } else if (filename.startsWith('inventario')) {
    folder = 'uploads/inventario'
  }

  // Crear carpeta si no existe (con recursividad por si hay subdirectorios)
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true })
  }

  return folder
}

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, callback) => {
    const destinationFolder = getDestination(file.originalname)
    callback(null, destinationFolder)
  },
  filename: (req, file, callback) => {
    // Opcional: Personalizar el nombre del archivo si es necesario
    callback(null, file.originalname)
  }
})

const upload = multer({
  storage: storage,
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

export const uploadCSVs = upload.array('csvFiles')
export const uploadCSV = upload.single('csvFile')