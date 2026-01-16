import { processSingleFile } from '../utils/files'
import { headers_sams } from '../types'
import { SamsRepository } from '../repositories/SamsRepository'
import { CustomSamValidationDto } from '../dtos/CustomSamValidationDto'
import { sanitizeBigInt } from '../utils/sanitizeBigInt'
import { categorizeByOperator } from '../utils/validation'

export class SamsService {
  private readonly samsRepository: SamsRepository

  constructor() {
    this.samsRepository = new SamsRepository()
  }

  public async validateSamsFile(file: Express.Multer.File) {
    if (!file) {
      throw new Error('No se proporcionó ningún archivo para validar.')
    }
    const { errors: formatErrors, validData } = await processSingleFile(file, headers_sams)
    const currentVersion = await this.samsRepository.getLastVersión()
    const currentVersionRecords = await this.samsRepository.getLastVersionRecords()
    const newVersion = currentVersion + 1
    const altasValidas = sanitizeBigInt(validData)
    const hexSerialsToCheck = validData.map(dto => dto.serial_number_hexadecimal)
    const existingSams = await this.samsRepository.findExistingSerialsByHex(hexSerialsToCheck)
    const validByOp = categorizeByOperator(altasValidas)
    const oldByOp = categorizeByOperator(currentVersionRecords)
    const dupByOp = categorizeByOperator(existingSams)

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
        success: false,
        message: 'El archivo está vacío o no contiene filas válidas.',
      }
    }

    return {
      success: true,
      currentVersion,
      newVersion,
      currentVersionCount: currentVersionRecords.length,
      newVersionRecordsCount: validData.length,
      ignoredRows: existingSams.length,
      altasValidas,
      validByOp,
      oldByOp,
      dupByOp
    }
  }
}
