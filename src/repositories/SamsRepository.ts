import SamsSitp from '../models/SamsSitp'
import { SamsSitpAttributes } from '../types'
import { Op } from 'sequelize'
import { BaseRepository } from './BaseRepository'




export class SamsRepository extends BaseRepository<SamsSitp> {

  constructor() {
    super(SamsSitp)
  }

  public async tableExists(): Promise<boolean> {
    const queryInterface = SamsSitp.sequelize?.getQueryInterface()
    if (!queryInterface) {
        throw new Error("Sequelize query interface not available.")
    }
    return await queryInterface.tableExists(SamsSitp.tableName)
  }

  public async sync(): Promise<void> {
    await SamsSitp.sync()
  }

  public async bulkCreate(records: SamsSitpAttributes[]): Promise<any> {
    return await SamsSitp.bulkCreate(records)
  }

  public async findExistingSerialsByHex(hexSerials: string[]): Promise<SamsSitp[]> {
    const existingSams = await SamsSitp.findAll({
      where: {
        serial_number_hexadecimal: {
          [Op.in]: hexSerials,
        },
      },
      raw: true,
      attributes: ['serial_number_hexadecimal'],
    })
    return existingSams
  }

  public async getLastVersión(): Promise<any> {
    const latestVersion = await SamsSitp.max('version')
    return latestVersion
  }

  public async getLastVersionRecords(): Promise<SamsSitp[]> {
    const maxVersion = await this.getLastVersión()
    return  await SamsSitp.findAll({
      where: {
        version: maxVersion,
      },
      raw: true
    })
  }
  public async getBySerialHex(hexId: string): Promise<SamsSitp | null> {
    return await SamsSitp.findOne({
      where: {
        serial_number_hexadecimal: `$${hexId}`
      },
      raw: true
    })  
  }
  public async getSamsBySerialHex(serials) {
    return await  SamsSitp.findAll({
          where: { serial_number_hexadecimal: { [Op.in]: serials } },
          raw: true
        })
  }
   public async existsBySerialHex(serialHex: string) {
    return  !!(await this.findOne({ serial_number_hexadecimal: `$${serialHex}` }, true))
  }
}
