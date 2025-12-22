import { processSingleFile } from '../utils/files'
import { headers_sams } from '../types'
import { SamsRepository } from '../repositories/SamsRepository'
import { CustomSamValidationDto } from '../dtos/CustomSamValidationDto'

export class SamsService {
  private readonly samsRepository: SamsRepository

  constructor() {
    this.samsRepository = new SamsRepository()
  }

  public async validateSamsFile(file: Express.Multer.File) {
    if (!file) {
      throw new Error('No se proporcionó ningún archivo para validar.')
    }

    const { errors: formatErrors, validData } = await processSingleFile(file, headers_sams, CustomSamValidationDto)

    if (formatErrors.length > 0) {
      return {
        success: false,
        errorsFiles: [{
          fileName: file.originalname,
          fileErrors: formatErrors
        }]
      }
    }

    if (validData.length === 0) {
      return {
        success: true,
        data: [{
          message: 'El archivo está vacío o no contiene filas válidas.',
          fileName: file.originalname,
          summary: {}
        }]
      }
    }

    const hexSerialsToCheck = validData.map(dto => dto.serial_number_hexadecimal)
    const existingSams = await this.samsRepository.findExistingSerialsByHex(hexSerialsToCheck)
    const existingSerialsSet = new Set(existingSams.map(sam => sam.serial_number_hexadecimal))
    console.log(existingSams)
    console.log(existingSerialsSet)
    const allErrors = [...formatErrors]

    if (allErrors.length > 0) {
      return {
        success: false,
        errorsFiles: [{
          fileName: file.originalname,
          fileErrors: allErrors
        }]
      }
    }
    return {
      success: true,
      data: [{
        message: 'El archivo ha sido validado exitosamente y está listo para ser procesado.',
        fileName: file.originalname,
        totalRows: validData.length,
        validRowsCount: validData.length,
        // altasValidas: validData
      }]
    }
  }
}
