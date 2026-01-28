import { WhiteListRepository } from "../repositories/WhiteListRepository"
import { categorizeByOperator, categorizeByProvider } from "../utils/validation"

export class WhiteListService {
  private readonly whiteListRepository: WhiteListRepository

  constructor() {
    this.whiteListRepository = new WhiteListRepository()
  }

  public async getSummaryLastVersionCV() {
    const records = await this.whiteListRepository.getLastVersionRecordsCV()
    const totalRecords = records.length
    const categorized = categorizeByProvider(records)
    const recordsByOrg = Object.entries(categorized).map(
      ([label, records]) => ({
        label,
        value: records.length,
      })
    )
    const lastVersion = await this.whiteListRepository.getLastVersionCV()
    return {
      success: true,
      version: lastVersion,
      totalRecords,
      recordsByOrg,
      records
    }
  }

  public async getSummaryLastVersion() {
    const records = await this.whiteListRepository.getLastVersionRecords()
    const totalRecords = records.length
    const categorized = categorizeByProvider(records)
    const recordsByOrg = Object.entries(categorized).map(
      ([label, records]) => ({
        label,
        value: records.length,
      })
    )
    const lastVersion = await this.whiteListRepository.getLastVersion()
    return {
      success: true,
      version: lastVersion,
      totalRecords,
      recordsByOrg,
      records
    }
  }
}