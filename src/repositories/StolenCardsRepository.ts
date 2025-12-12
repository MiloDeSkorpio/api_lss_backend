import StolenCards from '../models/StolenCards';
import { BaseRepository } from './BaseRepository';

export class StolenCardsRepository extends BaseRepository<StolenCards> {
  constructor() {
    super(StolenCards);
  }

  /**
   * Finds all active stolen cards.
   * @returns An array of active stolen card records.
   */
  async findActiveStolenCards() {
    try {
      const model = (this as any).model as typeof StolenCards;
      const tableExists = await model.sequelize?.getQueryInterface().tableExists(model.tableName);
      if (!tableExists) {
        await model.sync();
        return [];
      }
      
      const records = await model.findAll({
        where: { estado: 'ACTIVO' },
        raw: true,
      });
      return records;
    } catch (error) {
      console.error(`Error finding active stolen cards:`, error);
      throw error;
    }
  }
}
