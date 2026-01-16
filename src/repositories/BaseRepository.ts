// src/database/repositories/base.repository.ts
import { Model, ModelStatic, Transaction } from 'sequelize'

export class BaseRepository<T extends Model> {
  constructor(protected readonly model: ModelStatic<T>) {}

  max(column: keyof T['_attributes']):Promise<number> {
    return this.model.max(column as string)
  }
  
  async findAll(where?: any): Promise<T[]> {
    return this.model.findAll({ where })
  }

  async findOne(where: any, raw: any): Promise<T | null> {
    return this.model.findOne({ where, raw })
  }

  async bulkCreate(
    data: Partial<T>[],
    transaction?: Transaction
  ): Promise<T[]> {
    return this.model.bulkCreate(data as any, { transaction })
  }

  async create(
    data: Partial<T>,
    transaction?: Transaction
  ): Promise<T> {
    return this.model.create(data as any, { transaction })
  }

  async destroy(where: any, transaction?: Transaction): Promise<number> {
    return this.model.destroy({ where, transaction })
  }

  async exists(where: any): Promise<boolean> {
    const count = await this.model.count({ where })
    return count > 0
  }
}
