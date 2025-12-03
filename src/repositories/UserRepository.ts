import User from "../models/User"

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return await User.findOne({ where: { email }, raw: true })
  }
  async findById(id: number): Promise<User | null> {
    return await User.findByPk(id, { attributes: ["id", "name", "email", "roleId"] })
  }
  async create(userPayload: { name: string, email: string, password: string, verification_code: string, verification_expires: Date, is_verified: boolean }): Promise<User> {
    return await User.create(userPayload)
  }
  async updateUser(
    identifier: { id?: number; email?: string },
    updates: Partial<{
      name: string
      email: string
      password: string
      verification_code: string
      verification_expires: Date
      is_verified: boolean
      verification_last_sent: Date
      verification_resend_count: number
      reset_code: string
      reset_expires: Date
      reset_last_sent: Date
      reset_resend_count: number
    }>
  ): Promise<number> {
    const [affectedRows] = await User.update(updates, { where: identifier })
    return affectedRows
  }
  async clearToken() {
    return true
  }
}
