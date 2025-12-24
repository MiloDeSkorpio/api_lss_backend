import SamsSitp from '../models/SamsSitp'
import { SamsSitpAttributes } from '../types'
import { Op } from 'sequelize'


export class SamsRepository {

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
      attributes: ['serial_number_hexadecimal'], // Solo necesitamos este campo para verificar existencia
    });
    return existingSams;
  }
}
