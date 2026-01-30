import { LSS_TCSM } from "../models/LSS-TCSM"
import { BaseRepository } from "./BaseRepository"

export class LSSTCSMRepository extends BaseRepository<LSS_TCSM> {
  constructor() {
    super(LSS_TCSM)
  }

  async lastVersion (versionField: string): Promise<number>  {
    return super.max(versionField)
  }
  async findAllByVersion(version: number): Promise<LSS_TCSM[]> {
    return super.findAll({ version })
  }
  async findAllInactiveRecords() {
    return super.findAll({ status: 'INACTIVE'})
  }
}

export default LSSTCSMRepository