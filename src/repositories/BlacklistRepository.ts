import { Op } from 'sequelize';
import BlackList from '../models/BlackList';
import { BaseRepository } from './BaseRepository';

/**
 * Repository for handling BlackList-specific data access.
 * Inherits common methods from BaseRepository.
 */
export class BlacklistRepository extends BaseRepository<BlackList> {
  constructor() {
    // Pass the BlackList model to the parent constructor
    super(BlackList);
  }

  /**
   * Finds a single record by its card_serial_number.
   * @param hexId The hex representation of the card serial number.
   * @returns The found record, or null if not found.
   */
  async findByHexId(hexId: string) {
    const keyField = 'card_serial_number';
    const model: any = (this as any).model;
    const result = await model.findOne({
      where: {
        [keyField]: {
          [Op.eq]: hexId,
        },
      },
      raw: true,
    });
    return result;
  }

  /**
   * Finds all records with an 'INACTIVO' status.
   * @returns An array of inactive records.
   */
  async findInactiveRecords() {
    try {
      const model: any = (this as any).model;
      const records = await model.findAll({
        where: { estado: 'INACTIVO' },
        raw: true,
      });
      return records;
    } catch (error) {
      const modelName = ((this as any).model && (this as any).model.name) || 'UnknownModel';
      console.error(`Error finding inactive records for ${modelName}:`, error);
      throw error;
    }
  }

  // Puedes agregar aquí métodos que sean EXCLUSIVOS para BlackList en el futuro.
  // Por ejemplo: findByCardSerialNumber(serial: string) { ... }
}