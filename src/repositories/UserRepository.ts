import User from "../models/User"

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return await User.findOne({ where: { email },raw: true })
  }
  async findById(id: number): Promise<User | null> {
    return await User.findByPk(id, { attributes: ["id", "name", "email", "roleId"] })
  }
  async create(userPayload: {name: string, email: string, password: string}): Promise<User> {
    return await User.create(userPayload)
  }
  async clearToken() {
    return true
  }
}
