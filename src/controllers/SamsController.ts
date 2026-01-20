
import type { Request, Response } from 'express'
import SamsSitp from '../models/SamsSitp'

import { MulterRequest } from '../types'
import { SamsService } from '../services/SamsService'
import { AuthRequest } from '../types/AuthRequest'


export class SamsController {
  private static readonly samsService = new SamsService()

  static readonly createSamsRecordController = async (req: AuthRequest, res: Response) => {
      const { altasValidas,newVersion } = req.body
      const { user } = req
      try {
      const result = await SamsController.samsService.createNewVersion(altasValidas, user.id, newVersion)
      return res.status(200).json(result)
    } catch (error: any) {
      if (error.message === 'No se subieron archivos') {
        return res.status(400).json({ error: error.message })
      }
      console.error('Error al crear registro SAMS:', error)
      return res.status(500).json({ error: error.message || 'Error interno del servidor' })
    }
  }

  static readonly validateSamsRecordController = async (req: MulterRequest, res: Response) => {
    try {
      const result = await SamsController.samsService.validateSamsFile(req.file)
      if (result.success) {
        return res.status(200).json(result)
      } else {
        return res.status(400).json(result) 
      }
    } catch (error: any) {
      console.error('Error al validar archivo SAMS:', error)
      return res.status(500).json({ success: false, message: error.message || 'Error interno del servidor' })
    }
  }

  static readonly getSummary = async(req: Request, res: Response) => {
    try {
      const result = await SamsController.samsService.getSummaryLastVersión()
      if(result.success){
        return res.status(200).json(result)
      } else {
        return res.status(400).json(result)
      }
    } catch (error) {
      console.log('Error al obtener resumen:', error)
      return res.status(500).json({success: false, message: error.message})
    }
  }

  static readonly getSamBySerial = async (req: Request, res: Response) => {
    const { hexId } = req.params
    const result =  await SamsController.samsService.getSamBySerial(hexId)
    if (result) {
      return  res.status(200).json(result)
    } else {
      return res.status(404).json({ success: false, message: 'No se encontró el SAM con el número de serie proporcionado.' })
    }
  }

  static readonly getSamsByFile = async (req: MulterRequest, res: Response) => {
    try {
      const result = await SamsController.samsService.getSamsByHex(req.file)
      if(result){
        return res.status(200).json(result)
      } else {
        return res.status(400).json(result)
      }
    } catch (error) {
      console.log('Error al Buscar SAMS',error)
      return res.status(500).json({success: false, message: error.message})
    }
  }
  //before refactor module
  static getAllRecords = async (req: Request, res: Response) => {
    const tableExists = await SamsSitp.sequelize.getQueryInterface().tableExists(SamsSitp.tableName)
  
    if (!tableExists) {
      await SamsSitp.sync()
      return []
    }
    const records = await SamsSitp.findAll({
      raw: true
    })
    return res.status(200).json(records)
  }
}

