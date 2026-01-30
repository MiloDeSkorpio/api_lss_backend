import LSSTCSMRepository from "../repositories/LSSTCSMRepository"
import { headers_lss_tcsm } from "../types"
import { categorizeAllFiles, processFileGroup, } from "../utils/files"
import { checkDuplicates, eliminarRegistros, validateChangeInRecord } from "../utils/validation"


export class LSSTCSMService {
  private readonly repo: LSSTCSMRepository

  constructor() {
    this.repo = new LSSTCSMRepository()
  }

  async validateFiles(files) {
    if (!files) { throw new Error('No se proporciono ningun archivo para validar') }
    const categorizeFiles = categorizeAllFiles(files)
    let hasAltasErrors = false
    let hasBajasErrors = false
    let hasCambiosErrors = false
    const results = []
    try {
      let [altasData, bajasData, cambiosData] = await Promise.all([
        processFileGroup(categorizeFiles.altasFiles, headers_lss_tcsm),
        processFileGroup(categorizeFiles.bajasFiles, headers_lss_tcsm),
        processFileGroup(categorizeFiles.cambiosFiles, headers_lss_tcsm)
      ])
      hasAltasErrors = altasData.some(result => result.errors && result.errors.length > 0)
      hasBajasErrors = bajasData.some(result => result.errors && result.errors.length > 0)
      hasCambiosErrors = cambiosData.some(result => result.errors && result.errors.length > 0)
      console.log(altasData)
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
        let lastVersion = await this.repo.lastVersion('version')
        if (!lastVersion) { lastVersion = 0 }
        const lastVersionRecords = await this.repo.findAllByVersion(lastVersion)
        const allInvalidRecords = await this.repo.findAllInactiveRecords()
        console.log(allInvalidRecords)
        let newVersion = lastVersion + 1
        const keyField = 'serial_hex'
        const altasFinal = []
        const bajasFinal = []
        const cambiosFinal = []

        altasData.forEach(file => {
          altasFinal.push(...file.validData)
        })
        bajasData.forEach(file => {
          bajasFinal.push(...file.validData)
        })
        cambiosData.forEach(file => {
          cambiosFinal.push(...file.validData)
        })

        const { datosValidos: bajasValidas, datosDuplicados: bajasInactivas } = checkDuplicates(allInvalidRecords, bajasFinal, keyField)

        const { cambiosValidos, sinCambios } = validateChangeInRecord(lastVersionRecords, cambiosFinal, keyField)

        const { datosValidos: altasValidas, datosDuplicados: altasDuplicadas } = checkDuplicates(lastVersionRecords, altasFinal, keyField)

        const finalRecords = eliminarRegistros(lastVersionRecords, altasValidas, cambiosValidos)

        const newRecords = [...finalRecords, ...altasValidas]

        const newRecordsCount = lastVersionRecords.length + altasValidas.length - bajasValidas.length

        results.push({
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
        })
        return results
      }
    } catch (error) {
      console.log('Error al validar archivos:', error)
    }
  }

}
