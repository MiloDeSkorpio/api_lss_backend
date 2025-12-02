import { DataTypes, Model, Optional } from 'sequelize'
import connexion from "../config/db"
import { UserAttributes } from '../types'
import { Role } from './Role'

interface UserCreationAttributes extends Optional<UserAttributes, 'id'> { }

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: number
  declare name: string
  declare email: string
  declare password: string
  declare roleId?: number
  declare verification_code: string
  declare verification_expires: Date
  declare is_verified: boolean
  declare readonly createdAt: Date
  declare readonly updatedAt: Date
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
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
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: Role,
        key: 'id',
      },
      defaultValue: 3,
    },
    verification_code: {
      type: DataTypes.STRING,
      allowNull: false
    },
    verification_expires: {
      type: DataTypes.DATE,
      allowNull: false
    },
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