import BlackList from "../models/BlackList";
import { MulterRequest, } from "../types";
import { Response, Request } from 'express'
import { validateInfoBLFiles } from '../utils/files';
import { getHighestVersionRecords, getMaxVersion, resumeBlackList } from "../utils/versions";


const validateFiles = (model) => async (req: MulterRequest, res: Response) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No se subieron archivos' })
  }
  const validationResult = await validateInfoBLFiles(req.files, model)
  const data = await Promise.all(validationResult)
  const results = []
  const hasErrors = data.some(result => result.fileErrors && result.fileErrors.length > 0)
  if (hasErrors) {
    data.forEach(result => {
      if (result.fileErrors.length > 0) {
        results.push({
          fileName: result.fileName,
          fileErrors: result.fileErrors
        })
      }
    })
    const response = {
      success: !hasErrors,
      errorsFiles: results,
    }
    return res.status(400).json(response)
  } else {
    return res.status(200).json(data)
  }
}
const getLastVersionRecords = (model) => async (req: Request, res: Response) => {
  const result = await getHighestVersionRecords(model,'version_ln','estado')
  const transformedResult = result.map(record => {
    return Object.fromEntries(
      Object.entries(record).map(([key, value]) => [key.toLowerCase(), value])
    )
  })
  res.status(200).json(transformedResult)
}
const getResumeLastVersion = (model) => async (req: Request, res: Response) => {
  const result = await resumeBlackList(model)
  res.status(200).json(result)
}
export class BlacklistController {
  static validateBLFiles = validateFiles(BlackList)
  static getLastVersionRecords = getLastVersionRecords(BlackList)
  static getResumeLastVersion = getResumeLastVersion(BlackList)
}