import { VersionHistoryRepository } from '../repositories/VersionHistoryRepository'
import { ListName, VersionHistoryAttributes } from '../types'
import VersionHistory from '../models/VersionHistory'

export class VersionHistoryService {
  private readonly repository: VersionHistoryRepository

  constructor() {
    this.repository = new VersionHistoryRepository()
  }

  async logVersionCreation(data: Omit<VersionHistoryAttributes, 'id' | 'createdAt' | 'updatedAt'>): Promise<VersionHistory> {
    return await this.repository.create(data as VersionHistoryAttributes)
  }

  async getVersionsByListName(listName: ListName): Promise<VersionHistory[]> {
    return await this.repository.findAllByListName(listName)
  }

  async getLatestVersionByListName(listName: ListName): Promise<VersionHistory | null> {
    return await this.repository.findLatestVersionByListName(listName)
  }

  async getVersionById(id: string): Promise<VersionHistory | null> {
    return await this.repository.findById(id)
  }
}
