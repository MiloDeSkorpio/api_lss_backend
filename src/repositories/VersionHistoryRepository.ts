import VersionHistory from '../models/VersionHistory'
import { ListName, VersionHistoryAttributes } from '../types'

export class VersionHistoryRepository {
  async create(data: Omit<VersionHistoryAttributes, 'id' | 'createdAt' | 'updatedAt'>, options?: any): Promise<VersionHistory> {
    return await VersionHistory.create(data, options) as VersionHistory
  }
  async findAllByListName(listName: ListName): Promise<VersionHistory[]> {
    return await VersionHistory.findAll({ where: { listName } })
  }
  
  async findById(id: string): Promise<VersionHistory | null> {
    return await VersionHistory.findByPk(id)
  }
  
  async findLatestVersionByListName(listName: ListName): Promise<VersionHistory | null> {
    return await VersionHistory.findOne({
      where: { listName },
      order: [['createdAt', 'DESC']],
    })
  }
}
export const versionHistoryRepository = new VersionHistoryRepository()
