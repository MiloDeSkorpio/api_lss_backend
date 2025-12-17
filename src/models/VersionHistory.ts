import { DataTypes, Model, Optional } from 'sequelize'
import connexion from '../config/db'
import { VersionHistoryAttributes } from '../types'
import { User } from './User'

interface VersionHistoryCreationAttributes extends Optional<VersionHistoryAttributes, 'id'> {}

export class VersionHistory extends Model<VersionHistoryAttributes, VersionHistoryCreationAttributes> implements VersionHistoryAttributes {
  public id!: string
  public listName!: 'WHITELIST' | 'BLACKLIST' | 'WHITELIST_CV' | 'LSS-TCSM'
  public version!: string
  public operationType!: 'CREATION' | 'ROLLBACK'
  public userId!: number
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

VersionHistory.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    listName: {
      type: DataTypes.ENUM('WHITELIST', 'BLACKLIST', 'WHITELIST_CV','LSS-TCSM'),
      allowNull: false,
    },
    version: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    operationType: {
      type: DataTypes.ENUM('CREATION', 'ROLLBACK'),
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
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
