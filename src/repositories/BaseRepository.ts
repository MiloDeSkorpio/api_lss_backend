import { Model, ModelStatic, Sequelize, WhereOptions } from 'sequelize';

/**
 * A generic repository providing common data access methods.
 * @template T The Sequelize model type.
 */
export class BaseRepository<T extends Model> {
  /**protected model: typeof Model
   * @param model The Sequelize model class.
   */
  constructor(private readonly model: ModelStatic<T>) {}

  /**
   * Finds the highest version number for a given field.
   * @param versionField The name of the version column.
   * @returns The maximum version number, or 0 if none is found.
   */
  async getMaxVersion(versionField: string): Promise<number> {
    try {
      const maxVersion = await this.model.max(versionField);
      // The result can be number, null, or undefined. Default to 0.
      return (maxVersion as number) || 0;
    } catch (error) {
      console.error(`Error getting max version for ${this.model.name}:`, error);
      throw error;
    }
  }

  /**
   * Finds all active records for the highest version.
   * @param versionField The name of the version column.
   * @param statusField The name of the status column.
   * @returns An array of records.
   */
  async getHighestVersionRecords(versionField: string, statusField: string): Promise<any[]> {
    try {
      const tableExists = await this.model.sequelize?.getQueryInterface().tableExists(this.model.tableName);

      if (!tableExists) {
        await this.model.sync();
        return [];
      }

      const maxVersion = await this.getMaxVersion(versionField);

      if (maxVersion === 0) {
        return [];
      }

      const result = await this.model.findAll({
        where: {
          [versionField]: maxVersion,
          [statusField]: 'ACTIVO',
        } as WhereOptions<T>,
        raw: true,
      });

      return result;
    } catch (error) {
      console.error(`Error in getHighestVersionRecords (table: ${this.model.tableName}):`, error);
      throw error;
    }
  }
}
