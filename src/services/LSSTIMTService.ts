import LSSTIMTRepository from "../repositories/LSSTIMTRepository"
import { headers_lss_timt, LssTIMTProps } from "../types"
import { categorizeAllFiles, processFileGroup } from "../utils/files"
import { checkDuplicates, eliminarRegistros, validateChangeInRecord } from "../utils/validation"


export class LSSTIMTService {
  private readonly repo: LSSTIMTRepository

  constructor() {
    this.repo = new LSSTIMTRepository()
  }

  public async validateFiles(files) {
    if (!files) { throw new Error('No se proporciono ningun archivo para validar') }
    const categorizeFiles = categorizeAllFiles(files)
    let hasAltasErrors = false
    let hasBajasErrors = false
    let hasCambiosErrors = false
    const results = []
    try {
      let [altasData, bajasData, cambiosData] = await Promise.all([
        processFileGroup(categorizeFiles.altasFiles, headers_lss_timt),
        processFileGroup(categorizeFiles.bajasFiles, headers_lss_timt),
        processFileGroup(categorizeFiles.cambiosFiles, headers_lss_timt)
      ])
      hasAltasErrors = altasData.some(result => result.errors && result.errors.length > 0)
      hasBajasErrors = bajasData.some(result => result.errors && result.errors.length > 0)
      hasCambiosErrors = cambiosData.some(result => result.errors && result.errors.length > 0)

      if (hasAltasErrors || hasBajasErrors || hasCambiosErrors) {
        altasData.forEach(result => {
          results.push({
            fileName: result.fileName,
            fileErrors: result.errors
          })
        })
        bajasData.forEach(result => {
          results.push({
            fileName: result.fileName,
            fileErrors: result.errors
          })
        })
        cambiosData.forEach(result => {
          results.push({
            fileName: result.fileName,
            fileErrors: result.errors
          })
        })
        return results
      } else {
        let lastVersion = await this.repo.lastVersion()
        if (!lastVersion) { lastVersion = 0 }
        const lastVersionRecords = await this.repo.findAllByVersion(lastVersion)
        const allInvalidRecords = await this.repo.findAllInactiveRecords()
        let newVersion = lastVersion + 1
        const keyField = 'serial_hex'
        const altasFinal = []
        const bajasFinal = []
        const cambiosFinal = []
        altasData.forEach(file => {
          if (Array.isArray(file.validData)) {
            altasFinal.push(...file.validData)
          }
        })

        bajasData.forEach(file => {
          if (Array.isArray(file.validData)) {
            bajasFinal.push(...file.validData)
          }
        })

        cambiosData.forEach(file => {
          if (Array.isArray(file.validData)) {
            cambiosFinal.push(...file.validData)
          }
        })

        const { datosValidos: bajasValidas, datosDuplicados: bajasInactivas } = checkDuplicates(allInvalidRecords, bajasFinal, keyField)

        const { cambiosValidos, sinCambios } = validateChangeInRecord(lastVersionRecords, cambiosFinal)

        const { datosValidos: altasValidas, datosDuplicados: altasDuplicadas } = checkDuplicates(lastVersionRecords, altasFinal, keyField)

        const finalRecords = eliminarRegistros(lastVersionRecords, altasValidas, cambiosValidos)

        const newRecords = [...finalRecords, ...altasValidas]

        const newRecordsCount = lastVersionRecords.length + altasValidas.length - bajasValidas.length

        return {
          lastVersion,
          lastVersionRecords,
          newVersion,
          newRecords,
          newRecordsCount,
          altasValidas,
          altasDuplicadas,
          bajasValidas,
          bajasInactivas,
          cambiosValidos,
          sinCambios
        }
        
      }
    } catch (error) {
      console.log('Error al validar archivos:', error)
    }

  }

  public async getSummaryLastVersión() {
    const records = await this.repo.getLastVersionRecords()
    const totalRecords = records.length
    const version = await this.repo.lastVersion()

    return {
      success: true,
      version,
      totalRecords,
      records
    }
  }

  public async createNewVersionRecords(altas, bajas, cambios,userId,version): Promise<any> {
    if(!altas && !bajas && !cambios){
      throw new Error('No hay información para una nueva versión.')
    }
    
    console.log(userId,version)
    // return await this.repo.bulkCreate(records)
  }
}