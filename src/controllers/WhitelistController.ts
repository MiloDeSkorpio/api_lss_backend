import type { Request, Response } from 'express'
import { categorizeFilesWL } from '../helpers/orderFilesByEvent'
import { processFileGroup } from '../middleware/validationWL'
import { getHighestVersion } from '../helpers/getHighestVersion'
import WhiteListCV from '../models/WhiteListCV'
import { processVersionUpdate } from '../helpers/manageVersionRecords'

// Interfaces
interface MulterRequest extends Request {
  files: Express.Multer.File[]
}

export class WhitelistController {

  static newVersionCV = async (req: MulterRequest, res: Response) => {

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No se subieron archivos' })
    }

    const files = req.files
    const categorizeFiles = categorizeFilesWL(files)
    
    try {
      const currentVersionRecords = await getHighestVersion(WhiteListCV)
    
      let [altasData, bajasData, cambiosData] = await Promise.all([
        processFileGroup(categorizeFiles.altasFiles),
        processFileGroup(categorizeFiles.bajasFiles),
        processFileGroup(categorizeFiles.cambiosFiles)
      ])

      if (currentVersionRecords.length < 0) {
        if (bajasData.length > 0 || cambiosData.length > 0) {
          console.warn('Primera versión - Ignorando datos de bajas y cambios')
          bajasData = []    
          cambiosData = []  
        }
        const newVersion = currentVersionRecords[0].VERSION
        ? currentVersionRecords[0].VERSION
        : 0

        res.status(202).json({ message: "Archivos recibidos. Procesando en segundo plano..." })

        // 2. Ejecutar el bulkCreate después de enviar la respuesta
        process.nextTick(async () => {
          try {
            const result = await WhiteListCV.bulkCreate(
              altasData.map(item => ({
                ...item,
                VERSION: <number>newVersion + 1
              }))
            )
            console.log(` Inserción exitosa: ${result.length} registros añadidos.`)
          } catch (error) {
            console.error(" Error en inserción en segundo plano:", error.message)
          }
        })
      }  else {
        res.status(202).json({ message: "Procesando en segundo plano..." })
        
        process.nextTick(async () => {
            try {
                const result = await processVersionUpdate(
                    currentVersionRecords,
                    WhiteListCV,
                    altasData,
                    bajasData,
                    cambiosData
                )
                
                console.log(`
                    Versión ${result.newVersion} creada:
                    - Nuevos: ${result.stats.altas}
                    - Bajas: ${result.stats.bajas}
                    - Cambios: ${result.stats.cambios}
                    - Duplicados en altas detectados: ${result.stats.duplicados}

                `)
                
            } catch (error) {
                console.error("Error en procesamiento en segundo plano:", error.message)
            }
        })
      }

    } catch (error) {

      res.status(500).json({ error: `${error.message}` })
    }
  }
}
