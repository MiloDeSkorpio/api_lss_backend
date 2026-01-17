import { Request, Response } from 'express'
import { VersionHistoryService } from '../services/VersionHistoryService'
import { LogVersionHistoryDto } from '../dtos/LogVersionHistoryDto' 
import { listNames } from '../types'

export class VersionHistoryController {
  constructor(private readonly service: VersionHistoryService) {}

  createVersionLog = async (req: Request, res: Response) => {
    try {
      const payload: LogVersionHistoryDto = req.body
      const newLog = await this.service.logVersionCreation(payload)
      res.status(201).json({ message: 'Registro de versión creado exitosamente', data: newLog })
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Error al crear el registro de versión' })
    }
  }

  getVersionsByListName = async (req: Request, res: Response) => {
    try {
      const { listName } = req.params
      if (!listNames.includes(listName as any)) {
        return res.status(400).json({ message: 'Tipo de lista no válido' })
      }
      const history = await this.service.getVersionsByListName(listName as any)
      res.status(200).json({ data: history })
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Error al obtener el historial de versiones' })
    }
  }

  getLatestVersionByListName = async (req: Request, res: Response) => {
    try {
      const { listName } = req.params
      if (!listNames.includes(listName as any)) {
        return res.status(400).json({ message: 'Tipo de lista no válido' })
      }
      const latestVersion = await this.service.getLatestVersionByListName(listName as any)
      if (!latestVersion) {
        return res.status(404).json({ message: 'No se encontró historial para la lista especificada' })
      }
      res.status(200).json({ data: latestVersion })
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Error al obtener la última versión' })
    }
  }

  getVersionById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const version = await this.service.getVersionById(id)
      if (!version) {
        return res.status(404).json({ message: 'Versión no encontrada' })
      }
      res.status(200).json({ data: version })
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Error al obtener la versión por ID' })
    }
  }
}
