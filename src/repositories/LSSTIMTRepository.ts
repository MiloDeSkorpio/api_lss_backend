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
    return super.findAll({ status: false })
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
  public async bulkCreate(records: any[]): Promise<any> {
    return await LSS_TIMT.bulkCreate(records)
  }
  public async existsInVersion(
  serialHex: string,
  version: number
): Promise<boolean> {
  const count = await LSS_TIMT.count({
    where: {
      serial_hex: serialHex,
      version,
      status: true
    }
  })

  return count > 0
}

public async getBySerialHex(hexId: string): Promise<LSS_TIMT | null> {
  return await LSS_TIMT.findOne({
    where: {
      serial_hex: hexId
    },
    raw: true
  })   
}

}

export const lsstimtRepository = new LSSTIMTRepository()

export default lsstimtRepository
