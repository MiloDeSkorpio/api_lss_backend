
import WhiteList from "../models/WhiteList"
import WhiteListCV from "../models/WhiteListCV"
export class WhiteListRepository {
  public async getLastVersionCV(): Promise<any> {
    const latestVersion = await WhiteListCV.max('VERSION')
    return latestVersion
  }
  public async getLastVersion(): Promise<any> {
    const latestVersion = await WhiteList.max('VERSION')
    return latestVersion
  }
  public async getLastVersionRecordsCV(): Promise<WhiteListCV[]> {
    const maxVersion = await this.getLastVersionCV()
    return  await WhiteListCV.findAll({
      where: {
        VERSION: maxVersion,
      },
      raw: true
    })
  }
  public async getLastVersionRecords(): Promise<WhiteList[]> {
    const maxVersion = await this.getLastVersion()
    return  await WhiteList.findAll({
      where: {
        VERSION: maxVersion,
      },
      raw: true
    })
  }
}