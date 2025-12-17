import VersionHistory from '../models/VersionHistory'
import { VersionHistoryAttributes } from '../types'

export class VersionHistoryRepository {
  async create(data: VersionHistoryAttributes): Promise<VersionHistory> {
    return await VersionHistory.create(data)
  }

  async findAllByListName(listName: 'WHITELIST' | 'BLACKLIST' | 'WHITELIST_CV' | 'LSS-TCSM'): Promise<VersionHistory[]> {
    return await VersionHistory.findAll({ where: { listName } })
  }

  async findById(id: string): Promise<VersionHistory | null> {
    return await VersionHistory.findByPk(id)
  }

  async findLatestVersionByListName(listName: 'WHITELIST' | 'BLACKLIST' | 'WHITELIST_CV' | 'LSS-TCSM'): Promise<VersionHistory | null> {
    return await VersionHistory.findOne({
      where: { listName },
      order: [['createdAt', 'DESC']],
    })
  }
}
