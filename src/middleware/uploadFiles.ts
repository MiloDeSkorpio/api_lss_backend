import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';

// Función de validación del nombre del archivo
const validateFileName = (filename: string): boolean => {
  const pattern = /^listablanca_sams_(altas|bajas|cambios)_[0-9A-Fa-f]{2}_\d{12}\.csv$/
  return pattern.test(filename);
};

// Configuración de Multer con validación
const upload = multer({
  dest: 'uploads/whitelist',
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    callback: FileFilterCallback,
  ) => {
    if (!validateFileName(file.originalname)) {
      return callback(new Error(`Formato de nombre inválido: ${file.originalname}`));
    }
    callback(null, true); // Aceptar el archivo
  },
})

export const uploadCSV = upload.array('csvFiles')