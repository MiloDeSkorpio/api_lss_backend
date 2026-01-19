import { LSS_TIMT } from '../models/LSS-TIMT'
import { BaseRepository } from './BaseRepository'


export class LSSTIMTRepository extends BaseRepository<LSS_TIMT> {
  constructor() {
    super(LSS_TIMT)
  }
  async lastVersion(versionField: string): Promise<number> {
    return super.max(versionField)
  } 
  async findAllByVersion(version: number): Promise<LSS_TIMT[]> {
    return super.findAll({ version })
  }
  async findAllInactiveRecords() {
    return super.findAll({ status: 'INACTIVE' })
  }
}

export default LSSTIMTRepository