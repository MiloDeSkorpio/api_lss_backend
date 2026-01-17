import { DataTypes, Model, Optional } from 'sequelize'
import connexion from '../config/db'
import { ListName, OperationType, VersionHistoryAttributes } from '../types'
import { User } from './User'

interface VersionHistoryCreationAttributes extends Optional<VersionHistoryAttributes, 'id'> {}

export class VersionHistory extends Model<VersionHistoryAttributes, VersionHistoryCreationAttributes> implements VersionHistoryAttributes {
  public id!: number
  public listName!: ListName
  public version!: string
  public operationType!: OperationType
  public userId!: number
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

VersionHistory.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    listName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    version: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    operationType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  },
  {
    tableName: 'version_histories',
    sequelize: connexion,
    timestamps: true,
  }
)


VersionHistory.belongsTo(User, { foreignKey: 'userId', as: 'user' })
User.hasMany(VersionHistory, { foreignKey: 'userId' })


export default VersionHistory
