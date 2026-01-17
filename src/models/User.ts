import { DataTypes, Model, Optional } from 'sequelize'
import connexion from "../config/db"
import { UserAttributes } from '../types'
import { Role } from './Role'

interface UserCreationAttributes extends Optional<UserAttributes, 'id'> { }

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: string
  declare name: string
  declare email: string
  declare password: string
  declare roleId: string
  declare verification_code: string
  declare verification_expires: Date
  declare verification_last_sent: Date
  declare verification_resend_count: number
  declare reset_code: string
  declare reset_expires: Date
  declare reset_last_sent: Date
  declare reset_resend_count: number
  declare is_verified: boolean
  declare readonly createdAt: Date
  declare readonly updatedAt: Date
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    roleId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: Role,
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      defaultValue: 3,
    },
    verification_code: {
      type: DataTypes.STRING,
      allowNull: true
    },
    verification_expires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    verification_last_sent: { type: DataTypes.DATE, allowNull: true },
    verification_resend_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    reset_code: { type: DataTypes.STRING, allowNull: true },
    reset_expires: { type: DataTypes.DATE, allowNull: true },
    reset_last_sent: { type: DataTypes.DATE, allowNull: true },
    reset_resend_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }

  },
  {
    tableName: 'users',
    sequelize: connexion,
    timestamps: true,
  }
)
User.belongsTo(Role, { foreignKey: "roleId", as: "role" });
Role.hasMany(User, { foreignKey: "roleId" });

export default User