import fs from 'fs'
import csv from 'csv-parser'
import stripBomStream from 'strip-bom-stream'

const REQUIRED_HEADERS = ['SERIAL_DEC', 'SERIAL_HEX', 'CONFIG', 'OPERATOR', 'LOCATION_ID', 'ESTACION']
  
export const processFileGroup = async (files: Express.Multer.File[]) => {

  let concatenatedData: any[] = []

  for (const file of files) {
    const fileData = await new Promise<any[]>((resolve, reject) => {
      const data: any[] = []
      fs.createReadStream(file.path)
        .pipe(stripBomStream())
        .pipe(csv())
        .on('headers', (headers: string[]) => {
          if (headers.length !== REQUIRED_HEADERS.length) {
            reject(new Error(
              `Número de columnas incorrecto en el archivo ${file.originalname} \nEsperado: ${REQUIRED_HEADERS.length}, Recibido: ${headers.length}`
            ))
          }            
          const missingHeaders = REQUIRED_HEADERS.filter(
            req => !headers.includes(req)
          )
          if (missingHeaders.length > 0) {
            reject(new Error(
              `Headers incorrectos. Faltan o no están en mayúsculas: ${missingHeaders.join(', ')} en el archivo ${file.originalname}`
            ))
          }
        })

        .on('data', (row) => data.push(row))
        .on('end', () => {
          fs.unlinkSync(file.path) // Eliminar archivo temporal
          resolve(data)
        })
    })
    concatenatedData = concatenatedData.concat(fileData)
  }
  return concatenatedData
}