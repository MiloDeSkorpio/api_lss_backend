import { LSS_TIMT } from '../models/LSS-TIMT'
import { BaseRepository } from './BaseRepository'


export class LSSTIMTRepository extends BaseRepository<LSS_TIMT> {
  constructor() {
    super(LSS_TIMT)
  }
  public async lastVersion(): Promise<number> {
  return (await super.max('version')) || 0
  } 
  public async findAllByVersion(version: number): Promise<LSS_TIMT[]> {
    return super.findAll({ version })
  }
  public async findAllInactiveRecords() {
    return super.findAll({ status: 'INACTIVE' })
  }
  public async getLastVersionRecords(): Promise<LSS_TIMT[]> {
    const maxVersion = await this.lastVersion()
    return await LSS_TIMT.findAll({
      where: {
        version: maxVersion
      },
      raw: true
    })
  }
}

export default LSSTIMTRepository